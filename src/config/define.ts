/**
 * 配置解析与校验。
 *
 * 每个配置文件（`site.ts` / `links.ts`）都通过 `defineXxx()` 进入同一条链路：
 *
 * 1. **parse**：用 `schema.ts` 中的 Zod schema 做结构校验（未知字段会被拒绝，类型错误会报字段路径）。
 * 2. **resolve**：与 `defaults.ts` 中的默认值合并，补齐所有可选字段。
 * 3. **validate**：做 Zod 无法表达的语义校验（时区、URL 协议、导航链接、正整数、slug 等）。
 * 4. **return**：返回补全后的只读配置对象，供页面与运行时使用。
 *
 * 任何一步失败都会抛出 `ConfigError`，格式为：
 *
 * ```text
 * [daybook:config] src/config/site.ts > nav[1].link
 *   nope 不是合法内部链接（必须以 / 开头）
 * ```
 *
 * 该错误在模块加载阶段抛出，因此 `astro dev` / `astro build` 会直接失败并指出字段路径。
 * 唯一例外是「不受支持的评论 provider」：只输出 `console.warn` 并隐藏评论区，不阻断构建。
 */

import { DEFAULT_SITE_LANG } from '../i18n/languages';
import { localePackages } from '../i18n/locales';
import { ConfigError } from '../lib/errors';
import { currentYearInTimeZone, isValidTimeZone } from '../lib/time';
import type {
  CommentsConfig,
  LinkGroup,
  LinksConfig,
  LinksConfigInput,
  NavItem,
  NavLinkItem,
  SiteConfig,
  SiteConfigInput,
} from '../types/config';
import {
  DEFAULT_COMMENTS,
  DEFAULT_INJECT,
  DEFAULT_ROBOTS,
  DEFAULT_RSS,
  DEFAULT_SEO,
  DEFAULT_SITEMAP,
  DEFAULT_THEME,
  DEFAULT_TIMEZONE,
  defaultFooterNav,
  defaultHome,
  defaultLabels,
  defaultNav,
  SUPPORTED_COMMENT_PROVIDERS,
} from './defaults';
import { linksConfigSchema, siteConfigSchema } from './schema';

/** `site.ts` 的默认文件路径，仅用于错误信息中展示字段来源。 */
const SITE_FILE = 'src/config/site.ts';

/** 抛出带文件与字段路径的配置错误。 */
function fail(file: string, path: string, message: string): never {
  throw new ConfigError(file, path, message);
}

/** 取出 Zod 错误中的第一个 issue，转换为 `{ path, message }` 便于拼接错误信息。 */
function firstIssue(error: { issues: { path: PropertyKey[]; message: string }[] }): {
  path: string;
  message: string;
} {
  const issue = error.issues[0];
  if (!issue) return { path: '(root)', message: '配置校验失败' };
  return {
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
    message: issue.message,
  };
}

/** 用 `siteConfigSchema` 校验 `site.ts` 的结构，失败时抛出第一个字段错误。 */
function parseSite(input: SiteConfigInput, file: string): SiteConfigInput {
  const result = siteConfigSchema.safeParse(input);
  if (!result.success) {
    const issue = firstIssue(result.error);
    fail(file, issue.path, issue.message);
  }
  return result.data as SiteConfigInput;
}

/** 用 `linksConfigSchema` 校验 `links.ts` 的结构，失败时抛出第一个字段错误。 */
function parseLinks(input: LinksConfigInput, file: string): LinksConfigInput {
  const result = linksConfigSchema.safeParse(input);
  if (!result.success) {
    const issue = firstIssue(result.error);
    fail(file, issue.path, issue.message);
  }
  return result.data as LinksConfigInput;
}

/** 判断链接是否为 http(s) 外链（大小写不敏感）。 */
function isExternal(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

/**
 * 判断字符串是否合法 http(s) URL。
 *
 * 除协议外还要求不能带查询参数或 hash，避免生成 canonical / RSS 时出现重复地址。
 */
function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/**
 * 校验一个导航项（一级链接或带二级 `items` 的分组）。
 *
 * - 分组必须至少包含一个子链接。
 * - 子链接的规则与一级链接相同，见 `validateNavLink()`。
 */
function validateNavItem(item: NavItem, file: string, base: string): void {
  if ('items' in item) {
    if (item.items.length === 0) fail(file, `${base}.items`, 'items 至少需要一个链接');
    item.items.forEach((link, index) => {
      validateNavLink(link, file, `${base}.items[${index}]`);
    });
    return;
  }
  validateNavLink(item, file, base);
}

/**
 * 校验单个导航链接。
 *
 * - 外链：必须以 `http://` / `https://` 开头，且是合法 URL（不能带 query / hash）。
 * - 内链：必须以 `/` 开头；是否命中真实路由不在配置层校验，需要自行保证。
 */
function validateNavLink(link: NavLinkItem, file: string, base: string): void {
  if (isExternal(link.link)) {
    if (!validHttpUrl(link.link)) fail(file, `${base}.link`, `${link.link} 不是合法的 http(s) 外链`);
    return;
  }
  if (!link.link.startsWith('/')) {
    fail(file, `${base}.link`, `${link.link} 不是合法内部链接（必须以 / 开头）`);
  }
}

/**
 * 对补全默认值后的站点配置做语义校验。
 *
 * 校验项包括：IANA 时区、站点 URL 协议与 query/hash、`since` 年份范围、
 * 导航与页脚链接、备案链接、分页与 RSS 数量、评论 provider、OG 图、robots 路径、
 * 分类/标签 slug；最后去掉 `url` 末尾的 `/`。
 *
 * 注意：评论 provider 不受支持时只 `console.warn`，不抛错；页面会隐藏评论区。
 */
function validateSite(input: SiteConfig, file: string): void {
  if (!isValidTimeZone(input.timezone)) {
    fail(file, 'timezone', `${input.timezone} 不是有效的 IANA 时区`);
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    fail(file, 'url', `${input.url} 不是合法 URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail(file, 'url', 'url 只支持 http:// 或 https://');
  }
  if (url.search || url.hash) fail(file, 'url', 'url 不能包含查询参数或 hash');

  const currentYear = currentYearInTimeZone(input.timezone);
  if (input.since > currentYear + 1 || input.since < 1900) {
    fail(file, 'since', `since 必须在 1900..${currentYear + 1} 之间`);
  }

  input.nav.forEach((item, index) => {
    validateNavItem(item, file, `nav[${index}]`);
  });
  input.footerNav.forEach((item, index) => {
    validateNavLink(item, file, `footerNav[${index}]`);
  });

  input.icp.forEach((item, index) => {
    if (item.link && !isExternal(item.link) && !item.link.startsWith('/')) {
      fail(file, `icp[${index}].link`, '备案链接必须是 http(s) 外链或以 / 开头的内部链接');
    }
  });

  if (!Number.isInteger(input.pagination.daily) || input.pagination.daily < 1) {
    fail(file, 'pagination.daily', 'pagination.daily 必须是正整数');
  }
  if (!Number.isInteger(input.pagination.post) || input.pagination.post < 1) {
    fail(file, 'pagination.post', 'pagination.post 必须是正整数');
  }
  if (!Number.isInteger(input.rss.limit) || input.rss.limit < 1) {
    fail(file, 'rss.limit', 'rss.limit 必须是正整数');
  }
  if (input.comments.enabled && !isSupportedCommentProvider(input.comments.provider)) {
    console.warn(
      `[daybook:config] ${file} > comments.provider\n  provider "${input.comments.provider}" 不受支持（当前支持：${SUPPORTED_COMMENT_PROVIDERS.join('、')}），评论区不会渲染。`,
    );
  }
  if (!input.seo.ogImage.startsWith('/') && !validHttpUrl(input.seo.ogImage)) {
    fail(file, 'seo.ogImage', 'seo.ogImage 必须是 public 路径或 http(s) URL');
  }
  if (input.avatar && !isExternal(input.avatar) && !input.avatar.startsWith('/')) {
    fail(file, 'avatar', 'avatar 必须是 http(s) URL 或 / 开头的 public 路径');
  }
  input.robots.disallow.forEach((path, index) => {
    if (!path.startsWith('/')) fail(file, `robots.disallow[${index}]`, 'robots.disallow 必须以 / 开头');
  });

  for (const source of ['categories', 'tags'] as const) {
    const mapping = input.taxonomy[source] ?? {};
    for (const [name, slug] of Object.entries(mapping)) {
      if (!name.trim()) fail(file, `taxonomy.${source}`, '分类/标签名称不能为空');
      if (!slug.trim() || slug.includes('/') || slug.includes('?') || slug.includes('#')) {
        fail(file, `taxonomy.${source}.${name}`, `slug "${slug}" 不能为空或包含 / ? #`);
      }
    }
  }

  // 统一去掉末尾斜杠，避免 downstream 拼出 `https://example.com//...` 之类的地址。
  if (input.url.endsWith('/')) input.url = input.url.replace(/\/+$/, '');
}

/**
 * 合并 `site.ts` 与默认值，返回补全后的 `SiteConfig`。
 *
 * 合并顺序：用户显式值 > `defaults.ts` 默认值 > 由其他字段推导的值
 *（例如 `copyright.yearFrom` 缺省时取 `since`，`copyright.author` 缺省时取站点 `author`）。
 * 合并完成后立即执行 `validateSite()`。
 */
function resolveSite(parsed: SiteConfigInput, file: string): SiteConfig {
  const timezone = parsed.timezone ?? DEFAULT_TIMEZONE;
  if (!isValidTimeZone(timezone)) {
    fail(file, 'timezone', `非法 IANA 时区：${timezone}`);
  }
  const since = parsed.since ?? currentYearInTimeZone(timezone);
  const lang = parsed.lang ?? DEFAULT_SITE_LANG;
  const locale = localePackages[lang].meta;
  const homeDefaults = defaultHome(lang);
  const labelDefaults = defaultLabels(lang);
  const copyright = {
    enabled: parsed.copyright?.enabled ?? true,
    yearFrom: parsed.copyright?.yearFrom ?? since,
    author: parsed.copyright?.author ?? parsed.author,
  };

  const resolved: SiteConfig = {
    lang,
    title: parsed.title,
    subtitle: parsed.subtitle ?? '',
    footerBrand: parsed.footerBrand && parsed.footerBrand.length > 0 ? parsed.footerBrand : parsed.title,
    description: parsed.description ?? '',
    url: parsed.url.replace(/\/+$/, ''),
    author: parsed.author,
    avatar: parsed.avatar ?? '',
    keywords: parsed.keywords ?? [],
    timezone,
    since,
    theme: parsed.theme ?? DEFAULT_THEME,
    nav: (parsed.nav ?? defaultNav(lang)).map((item) =>
      'items' in item ? { ...item, items: item.items.map((link) => ({ ...link })) } : { ...item },
    ),
    footerNav: (parsed.footerNav ?? defaultFooterNav(lang)).map((item) => ({ ...item })),
    copyright,
    icp: (parsed.icp ?? []).map((item) => ({ ...item })),
    pagination: {
      daily: parsed.pagination?.daily ?? 20,
      post: parsed.pagination?.post ?? 20,
    },
    rss: {
      enabled: parsed.rss?.enabled ?? DEFAULT_RSS.enabled,
      default: {
        enabled: parsed.rss?.default?.enabled ?? DEFAULT_RSS.default.enabled,
        scope: parsed.rss?.default?.scope ?? DEFAULT_RSS.default.scope,
      },
      diary: { enabled: parsed.rss?.diary?.enabled ?? DEFAULT_RSS.diary.enabled },
      posts: { enabled: parsed.rss?.posts?.enabled ?? DEFAULT_RSS.posts.enabled },
      fullText: parsed.rss?.fullText ?? DEFAULT_RSS.fullText,
      limit: parsed.rss?.limit ?? DEFAULT_RSS.limit,
    },
    comments: {
      enabled: parsed.comments?.enabled ?? DEFAULT_COMMENTS.enabled,
      provider: parsed.comments?.provider ?? DEFAULT_COMMENTS.provider,
      twikoo: {
        envId: parsed.comments?.twikoo?.envId ?? DEFAULT_COMMENTS.twikoo.envId,
        region: parsed.comments?.twikoo?.region ?? DEFAULT_COMMENTS.twikoo.region,
        lang: parsed.comments?.twikoo?.lang ?? locale.twikooLang,
      },
      waline: {
        serverURL: parsed.comments?.waline?.serverURL ?? DEFAULT_COMMENTS.waline.serverURL,
        lang: parsed.comments?.waline?.lang ?? locale.walineLang,
        login: parsed.comments?.waline?.login ?? DEFAULT_COMMENTS.waline.login,
        pageSize: parsed.comments?.waline?.pageSize ?? DEFAULT_COMMENTS.waline.pageSize,
      },
      artalk: {
        server: parsed.comments?.artalk?.server ?? DEFAULT_COMMENTS.artalk.server,
        site: parsed.comments?.artalk?.site ?? parsed.title,
        locale: parsed.comments?.artalk?.locale ?? locale.artalkLang,
        pageSize: parsed.comments?.artalk?.pageSize ?? DEFAULT_COMMENTS.artalk.pageSize,
      },
    },
    inject: {
      headEnd: parsed.inject?.headEnd ?? DEFAULT_INJECT.headEnd,
      bodyEnd: parsed.inject?.bodyEnd ?? DEFAULT_INJECT.bodyEnd,
    },
    robots: {
      enabled: parsed.robots?.enabled ?? DEFAULT_ROBOTS.enabled,
      disallow: [...(parsed.robots?.disallow ?? DEFAULT_ROBOTS.disallow)],
    },
    seo: {
      ogImage: parsed.seo?.ogImage ?? DEFAULT_SEO.ogImage,
      twitterCard: parsed.seo?.twitterCard ?? DEFAULT_SEO.twitterCard,
      locale: parsed.seo?.locale ?? locale.ogLocale,
    },
    sitemap: {
      enabled: parsed.sitemap?.enabled ?? DEFAULT_SITEMAP.enabled,
      includeProtected: parsed.sitemap?.includeProtected ?? DEFAULT_SITEMAP.includeProtected,
    },
    taxonomy: {
      categories: { ...(parsed.taxonomy?.categories ?? {}) },
      tags: { ...(parsed.taxonomy?.tags ?? {}) },
    },
    home: {
      title: parsed.home?.title ?? homeDefaults.title,
      subtitle: parsed.home?.subtitle ?? homeDefaults.subtitle,
      showTitles: parsed.home?.showTitles ?? homeDefaults.showTitles,
    },
    labels: {
      diary: parsed.labels?.diary ?? labelDefaults.diary,
    },
  };

  validateSite(resolved, file);
  return resolved;
}

/**
 * 定义并校验站点配置（`src/config/site.ts` 的入口）。
 *
 * @param input 站点配置；只需写需要覆盖默认值的字段。
 * @param file 出错时展示的文件名，默认 `src/config/site.ts`。
 * @returns 补全默认值并通过语义校验的 `SiteConfig`。
 */
export function defineSiteConfig(input: SiteConfigInput, file = SITE_FILE): SiteConfig {
  return resolveSite(parseSite(input, file), file);
}

/**
 * 对补全后的友链配置做语义校验。
 *
 * - `links[].url`：必须是合法 http(s) URL。
 * - `links[].avatar`：可省略；出现时必须是 http(s) URL 或以 `/` 开头的 public 路径。
 */
function validateLinks(input: LinksConfig, file: string): void {
  input.groups.forEach((group, groupIndex) => {
    group.links.forEach((link, linkIndex) => {
      if (!validHttpUrl(link.url)) {
        fail(file, `groups[${groupIndex}].links[${linkIndex}].url`, `${link.url} 不是合法 http(s) URL`);
      }
      if (link.avatar && !isExternal(link.avatar) && !link.avatar.startsWith('/')) {
        fail(file, `groups[${groupIndex}].links[${linkIndex}].avatar`, 'avatar 必须是 http(s) URL 或 / 开头的 public 路径');
      }
    });
  });
}

/**
 * 定义并校验友链配置（`src/config/links.ts` 的入口）。
 *
 * `groups` 可省略，默认空数组；分组与组内链接都允许为空数组（空分组在页面上会被过滤）。
 */
export function defineLinksConfig(input: LinksConfigInput, file = 'src/config/links.ts'): LinksConfig {
  const parsed = parseLinks(input, file);
  const resolved: LinksConfig = {
    groups: (parsed.groups ?? []).map((group: LinkGroup) => ({
      ...group,
      links: group.links.map((link) => ({ ...link })),
    })),
  };
  validateLinks(resolved, file);
  return resolved;
}

/**
 * 判断 provider 是否为受支持的评论系统。
 *
 * 受支持列表由 `defaults.ts` 中的 `SUPPORTED_COMMENT_PROVIDERS` 维护，
 * 目前为 `'twikoo'` / `'waline'` / `'artalk'`。`validateSite()`、`isCommentsRendered()` 与
 * `src/lib/comments.ts` 共用此函数，避免三处重复判断。
 */
export function isSupportedCommentProvider(provider: string): boolean {
  return (SUPPORTED_COMMENT_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * 判断指定评论配置是否应渲染评论区。
 *
 * 条件只有两个：`comments.enabled` 为 `true`，且 `provider` 受支持。
 *
 * 注意：各后端的服务端地址不再是门槛——地址为空时仍会渲染评论区骨架，
 * 对应 provider 会静默失败，不显示任何错误文案。
 */
export function isCommentsRendered(comments: CommentsConfig): boolean {
  return comments.enabled && isSupportedCommentProvider(comments.provider);
}
