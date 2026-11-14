import { z } from 'zod';

import { SITE_LANGS } from '../i18n/languages';
import { DAILY_TITLE_FALLBACK_STRATEGIES } from './defaults';

/**
 * 配置层的 Zod schema（只做「结构与类型」校验）。
 *
 * 这些 schema 描述 `src/config/*.ts` 中 `defineXxxConfig()` 入参的合法形状：
 * - 这里的字段几乎都是 `.optional()` 的，因为默认值由 `defaults.ts` 合并（见 `define.ts` 的 resolve 阶段），
 *   必填项（如站点 `title`、`url`、`author`）才用 `nonEmpty` 约束。
 * - `z.strictObject()` 表示**不允许未知字段**：拼错的键会直接报错，避免配置静默失效。
 * - 跨字段语义校验（时区合法性、URL、年份范围、导航链接等）不在这里做，统一在 `define.ts` 的 validate 阶段完成。
 * - 新增字段时需同步修改 `src/types/config.ts` 与 `defaults.ts`。
 */

/** 非空字符串：用于必填文本字段（`min(1)` 不允许空串）。 */
const nonEmpty = z.string().min(1);

/** 导航一级链接：`{ title, link }`。 */
const navLinkSchema = z.strictObject({
  /** 链接文字，必填。 */
  title: nonEmpty,
  /** 链接地址，必填；`/` 开头为站内路径，`http(s)://` 开头为外链（由 validate 阶段二次校验）。 */
  link: nonEmpty,
});

/** 导航二级分组：`{ title, items }`，只能嵌套一层，`items` 至少一项。 */
const navGroupSchema = z.strictObject({
  /** 分组标题，必填。 */
  title: nonEmpty,
  /** 子链接列表，至少一项。 */
  items: z.array(navLinkSchema).min(1),
});

/** 导航项：一级链接或二级分组（联合类型，按形状自动区分）。 */
const navItemSchema = z.union([navLinkSchema, navGroupSchema]);

/** 移动端底部导航项：链接必填，标题与图标可选。 */
const bottomNavItemSchema = z.strictObject({
  /** 链接文字；省略时按 nav 配置或内置文案推导。 */
  title: nonEmpty.optional(),
  /** 链接地址；规则与顶部导航相同。 */
  link: nonEmpty,
  /** sprite 图标 id，如 i-book；省略时按链接推导。 */
  icon: z
    .string()
    .regex(/^i-[a-z0-9-]+$/)
    .optional(),
});

/** 移动端底部导航：enabled / items 均可选。 */
const bottomNavSchema = z.strictObject({
  /** 是否显示移动端底部导航；默认 true。 */
  enabled: z.boolean().optional(),
  /** 底部入口列表；省略时使用内置四项，至少一项。 */
  items: z.array(bottomNavItemSchema).min(1).optional(),
});

/** 归档页配置：defaultType 可选。 */
const archiveSchema = z.strictObject({
  /** 默认展示内容类型：articles 或 diary；默认 articles。 */
  defaultType: z.enum(['articles', 'diary']).optional(),
});

/** 单个位置的无标题日记回退：内置策略或自定义模板。 */
const dailyTitleFallbackValueSchema = z.union([
  z.enum(DAILY_TITLE_FALLBACK_STRATEGIES),
  z.strictObject({
    /** 模板不能为空；可用占位符由 validate 阶段检查。 */
    template: z.string().trim().min(1),
  }),
]);

/** 无标题日记在详情页、归档与 RSS 中的回退配置。 */
const dailyTitleFallbackSchema = z.strictObject({
  /** 详情页回退；默认 date。 */
  detail: dailyTitleFallbackValueSchema.optional(),
  /** 归档列表回退；默认 slug。 */
  archive: dailyTitleFallbackValueSchema.optional(),
  /** RSS 回退；默认 date。 */
  feed: dailyTitleFallbackValueSchema.optional(),
});

/** 备案信息项：`{ text, link? }`。 */
const icpSchema = z.strictObject({
  /** 备案号文字，必填。 */
  text: nonEmpty,
  /** 备案查询地址，可选；出现时由 validate 阶段校验为 http(s) 外链或 `/` 开头的内部路径。 */
  link: z.string().min(1).optional(),
});

/** 页脚版权配置：`{ enabled?, yearFrom?, author? }`。 */
const copyrightSchema = z.strictObject({
  /** 是否显示版权信息；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 版权起始年份；默认取站点的 `since`。 */
  yearFrom: z.number().int().optional(),
  /** 版权署名；默认取站点的 `author`。 */
  author: z.string().optional(),
});

/** 分页配置：`{ daily?, post? }`，两项都是正整数（由 validate 阶段校验）。 */
const paginationSchema = z.strictObject({
  /** 首页日记流每页条数；默认 `20`。 */
  daily: z.number().int().positive().optional(),
  /** 文章列表每页条数；默认 `20`。 */
  post: z.number().int().positive().optional(),
});

/** RSS 配置：总开关、默认 feed 范围与各子 feed 开关。 */
const rssSchema = z.strictObject({
  /** RSS 总开关；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 默认 feed（`/feed.xml`）的开关与收录范围。 */
  default: z
    .strictObject({
      /** 是否生成默认 feed；默认 `true`。 */
      enabled: z.boolean().optional(),
      /** 收录范围：`all`（全部）/ `diary`（仅日记）/ `post`（仅文章）；默认 `all`。 */
      scope: z.enum(['all', 'diary', 'post']).optional(),
    })
    .optional(),
  /** 日记 feed（`/feed-diary.xml`）开关；默认开启。 */
  diary: z.strictObject({ enabled: z.boolean().optional() }).optional(),
  /** 文章 feed（`/feed-posts.xml`）开关；默认开启。 */
  posts: z.strictObject({ enabled: z.boolean().optional() }).optional(),
  /** 是否输出渲染后的正文 HTML；`false`（默认）只输出摘要。 */
  fullText: z.boolean().optional(),
  /** 单份 feed 最大条目数；默认 `20`，必须为正整数且 ≤ 200。 */
  limit: z.number().int().positive().max(200).optional(),
});

/**
 * 评论配置：`{ enabled?, provider?, twikoo?, waline?, artalk? }`。
 *
 * `provider` 故意只约束为字符串：不支持的 provider 属于「可运行但隐藏评论区」的场景，
 * 由 `define.ts` 的 validate 阶段 `console.warn` 提示，而不是让构建失败。
 */
const commentsSchema = z.strictObject({
  /** 评论总开关；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 评论系统名称；默认 `'twikoo'`，白名单见 `defaults.ts` 的 `SUPPORTED_COMMENT_PROVIDERS`。 */
  provider: z.string().optional(),
  /** Twikoo 专属配置。 */
  twikoo: z
    .strictObject({
      /** Twikoo 环境 ID（或自建部署地址）；默认 `''`，为空也照常初始化，由 Twikoo 自行提示配置问题。 */
      envId: z.string().optional(),
      /** Twikoo 云开发地域；默认 `''`，留空使用 Twikoo 默认值。 */
      region: z.string().optional(),
      /** Twikoo 界面语言；省略时由站点 `lang` 推导。 */
      lang: z.string().optional(),
    })
    .optional(),
  /** Waline 专属配置。 */
  waline: z
    .strictObject({
      /** Waline 服务端地址；默认 `''`，为空时客户端静默失败。 */
      serverURL: z.string().optional(),
      /** Waline 界面语言；省略时由站点 `lang` 推导（ja 映射为 `jp`）。 */
      lang: z.string().optional(),
      /** 登录策略；默认 `'enable'`。 */
      login: z.enum(['enable', 'disable', 'force']).optional(),
      /** 每页评论数；默认 `10`，必须为正整数。 */
      pageSize: z.number().int().positive().optional(),
    })
    .optional(),
  /** Artalk 专属配置。 */
  artalk: z
    .strictObject({
      /** Artalk 服务端地址；默认 `''`，为空时客户端静默失败。 */
      server: z.string().optional(),
      /** Artalk 站点名，需与服务端 `site_name` 一致；省略时回退站点标题。 */
      site: z.string().optional(),
      /** Artalk 界面语言；省略时由站点 `lang` 推导。 */
      locale: z.string().optional(),
      /** 每页评论数；默认 `20`，必须为正整数。 */
      pageSize: z.number().int().positive().optional(),
    })
    .optional(),
});

/** robots.txt 配置：`{ enabled?, disallow? }`。 */
const robotsSchema = z.strictObject({
  /** 是否生成 `robots.txt`；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 额外禁止抓取的路径；默认 `[]`，每项须以 `/` 开头（由 validate 阶段校验）。 */
  disallow: z.array(z.string()).optional(),
});

/** SEO / Open Graph 配置：默认 OG 图、Twitter Card 与 locale。 */
const seoSchema = z.strictObject({
  /** 默认 OG 图，默认 `'/og-default.png'`；须为 `/` 开头的 public 路径或 http(s) URL。 */
  ogImage: z.string().min(1).optional(),
  /** Twitter Card 类型；默认 `'summary_large_image'`。 */
  twitterCard: z.string().min(1).optional(),
  /** `og:locale`；省略时由站点 `lang` 推导。 */
  locale: z.string().min(1).optional(),
});

/** sitemap 配置：`{ enabled?, includeProtected? }`。 */
const sitemapSchema = z.strictObject({
  /** 是否生成 `sitemap.xml`；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 是否把密码保护页面纳入 sitemap；默认 `false`。 */
  includeProtected: z.boolean().optional(),
});

/** 分类/标签别名映射：`{ categories?, tags? }`，键为原始值、值为展示名。 */
const taxonomySchema = z.strictObject({
  /** 分类展示名映射；默认 `{}`。 */
  categories: z.record(z.string(), z.string()).optional(),
  /** 标签展示名映射；默认 `{}`。 */
  tags: z.record(z.string(), z.string()).optional(),
});

/** 站内内容称呼：`{ diary? }`。 */
const labelsSchema = z.strictObject({
  /** 「日记」类内容的称呼；默认 `'日记'`。 */
  diary: nonEmpty.optional(),
});

/** 自定义 HTML 注入：`{ headEnd?, bodyEnd? }`，内容按原样输出到 `</head>` / `</body>` 之前。 */
const injectSchema = z.strictObject({
  /** 输出到所有页面 `</head>` 之前；默认 `''`。 */
  headEnd: z.string().optional(),
  /** 输出到所有页面 `</body>` 之前；默认 `''`。 */
  bodyEnd: z.string().optional(),
});

/** 首页大标题、副标题与标题显示开关：`{ title?, subtitle?, showTitles? }`。 */
const homeSchema = z.strictObject({
  /** 首页主标题；默认 `'日记'`。只影响首页标题，不影响站内称呼。 */
  title: nonEmpty.optional(),
  /** 首页副标题；默认 `'一篇一篇，日子就有了形状。'`；可为空串。 */
  subtitle: z.string().optional(),
  /** 是否在首页日记流显示标题；默认 true。 */
  showTitles: z.boolean().optional(),
});

/** Meting 缓存分类 TTL：单位毫秒，必须是非负整数。 */
const metingCacheTtlSchema = z.strictObject({
  /** `playlist` 缓存时间；默认 `86400000`（1 天）。 */
  playlist: z.number().int().nonnegative().optional(),
  /** `search` 缓存时间；默认 `86400000`（1 天）。 */
  search: z.number().int().nonnegative().optional(),
  /** 其它类型缓存时间；默认 `2592000000`（30 天）。 */
  default: z.number().int().nonnegative().optional(),
});

/** Meting 服务端缓存开关与分类 TTL。 */
const metingCacheSchema = z.strictObject({
  /** 是否启用服务端缓存；默认 `true`。 */
  enabled: z.boolean().optional(),
  /** 分类缓存时间，单位毫秒。 */
  ttl: metingCacheTtlSchema.optional(),
});

/** MDX 增强里的 Meting-API 客户端配置：`{ api?, timeout?, cache? }`。 */
const metingSchema = z.strictObject({
  /** Meting-API 基础地址；默认 `'https://163.hyc.moe/'`。 */
  api: nonEmpty.optional(),
  /** 单次请求超时时间（毫秒）；默认 `5000`，必须为正整数。 */
  timeout: z.number().int().positive().optional(),
  /** 服务端构建缓存；默认开启。 */
  cache: metingCacheSchema.optional(),
});

/** MDX 增强配置：`{ meting? }`。 */
const mdxSchema = z.strictObject({
  /** Meting-API 客户端配置。 */
  meting: metingSchema.optional(),
});

/**
 * 站点主配置 schema（对应 `src/config/site.ts`）。
 *
 * 只列「允许出现」的键；`title` / `url` / `author` 必填，其余均可省略并由默认值补齐。
 */
export const siteConfigSchema = z.strictObject({
  /** 构建语言：`en` / `ja` / `zh_CN` / `zh_TW`；默认 `zh_CN`。 */
  lang: z.enum(SITE_LANGS).optional(),
  /** 站点标题，必填。 */
  title: nonEmpty,
  /** 站点公开 URL，必填；协议、query/hash 由 validate 阶段校验。 */
  url: nonEmpty,
  /** 作者名，必填。 */
  author: nonEmpty,
  /** 作者头像；可选，允许 http(s) URL 或 `/` 开头的 public 路径（由 validate 阶段校验）。 */
  avatar: z.string().optional(),
  /** 站点副标题；默认 `''`。 */
  subtitle: z.string().optional(),
  /** 页脚品牌名（覆盖站点标题）；可选。 */
  footerBrand: z.string().optional(),
  /** 站点描述；默认 `''`。 */
  description: z.string().optional(),
  /** SEO 关键词；默认 `[]`。 */
  keywords: z.array(z.string()).optional(),
  /** IANA 时区；默认 `'Asia/Shanghai'`，非法值由 validate 阶段报错。 */
  timezone: z.string().min(1).optional(),
  /** 建站年份；默认当前年份，validate 阶段限制为 1900 起。 */
  since: z.number().int().min(1900).optional(),
  /** 默认主题偏好：`light` / `dark` / `system`；默认 `system`。 */
  theme: z.enum(['light', 'dark', 'system']).optional(),
  /** 顶部导航；省略时使用当前语言的默认导航。 */
  nav: z.array(navItemSchema).optional(),
  /** 页脚导航；省略时使用当前语言的默认页脚导航。 */
  footerNav: z.array(navLinkSchema).optional(),
  /** 移动端底部导航。 */
  bottomNav: bottomNavSchema.optional(),
  /** 版权配置。 */
  copyright: copyrightSchema.optional(),
  /** 备案信息列表；默认 `[]`。 */
  icp: z.array(icpSchema).optional(),
  /** 分页配置。 */
  pagination: paginationSchema.optional(),
  /** 归档页默认展示类型。 */
  archive: archiveSchema.optional(),
  /** 无标题日记的回退标题。 */
  dailyTitleFallback: dailyTitleFallbackSchema.optional(),
  /** RSS 配置。 */
  rss: rssSchema.optional(),
  /** 评论配置。 */
  comments: commentsSchema.optional(),
  /** 自定义 HTML 注入。 */
  inject: injectSchema.optional(),
  /** robots.txt 配置。 */
  robots: robotsSchema.optional(),
  /** SEO / OG 配置。 */
  seo: seoSchema.optional(),
  /** sitemap 配置。 */
  sitemap: sitemapSchema.optional(),
  /** 分类/标签别名映射。 */
  taxonomy: taxonomySchema.optional(),
  /** 首页标题/副标题。 */
  home: homeSchema.optional(),
  /** 站内「日记」类内容称呼。 */
  labels: labelsSchema.optional(),
  /** MDX 增强配置。 */
  mdx: mdxSchema.optional(),
});

/** 友链项：`{ name, url, avatar?, description? }`。 */
export const friendLinkSchema = z.strictObject({
  /** 站点名，必填。 */
  name: nonEmpty,
  /** 站点地址，必填；必须是合法的 http(s) 外链（由 validate 阶段校验）。 */
  url: nonEmpty,
  /** 头像；可选，允许 http(s) URL 或 `/` 开头的站内路径（由 validate 阶段校验）。 */
  avatar: z.string().optional(),
  /** 一句话简介；可选，默认 `''`。 */
  description: z.string().optional(),
});

/** 友链分组：`{ name, description?, links }`。 */
export const linkGroupSchema = z.strictObject({
  /** 分组名，必填。 */
  name: nonEmpty,
  /** 分组说明；可选，默认 `''`。 */
  description: z.string().optional(),
  /** 组内友链列表；允许为空数组（空分组不渲染）。 */
  links: z.array(friendLinkSchema),
});

/** 友链页配置 schema（对应 `src/config/links.ts`）。 */
export const linksConfigSchema = z.strictObject({
  /** 友链分组列表，必填；允许为空数组。 */
  groups: z.array(linkGroupSchema),
});

/** 站点配置 parse 之后的类型（默认值尚未合并）。 */
export type ParsedSiteConfig = z.infer<typeof siteConfigSchema>;
/** 友链页配置 parse 之后的类型。 */
export type ParsedLinksConfig = z.infer<typeof linksConfigSchema>;
