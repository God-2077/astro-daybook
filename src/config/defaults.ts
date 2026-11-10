/**
 * 配置默认值。
 *
 * 这里集中存放配置解析链路中的兜底值：`define.ts` 的 `resolveSite()` 与
 * `defineLinksConfig()` 在用户配置缺省字段时会合并这些常量，
 * 因此 `site.ts`、`links.ts` 只写需要覆盖默认值的字段即可。
 *
 * 约定：
 * - 本文件是配置层的叶子模块，不依赖组件与运行时工具，可被 `define.ts`、
 *   `src/lib/comments.ts` 等安全引用，不会造成循环依赖。
 * - 修改默认值会影响所有未显式配置该字段的站点；改动后需同步
 *   `docs/configuration.md` 与 `src/config/README.md`。
 * - 导航、首页标题、内容称呼与页脚导航的默认值随 `site.ts` 的 `lang` 切换；
 *   中文默认值与旧版逐字一致。
 */

import type { SiteLang } from '../i18n/languages';
import type {
  ArchiveConfig,
  BottomNavItem,
  DailyTitleFallbackConfig,
  DailyTitleFallbackPosition,
  DailyTitleFallbackStrategy,
  HomeConfig,
  LabelsConfig,
  NavItem,
  NavLinkItem,
  ThemeMode,
} from '../types/config';

/**
 * 受支持的评论系统 provider 白名单。
 *
 * - 用途：判断评论区是否渲染的核心条件之一（另一个是 `comments.enabled`）。
 *   `site.ts` 中的 `comments.provider` 必须命中此列表才会渲染评论区。
 * - 可选值：`'twikoo'`、`'waline'`、`'artalk'`。新增评论系统时，把 provider 名称加入数组，
 *   并在 `src/components/comments/providers/` 下实现对应组件。
 * - 默认：`'twikoo'`（见 `DEFAULT_COMMENTS.provider`）。
 * - 注意：provider 不在白名单时不会让构建失败，只由 `validateSite()` 输出
 *   `console.warn` 并隐藏评论区，便于未来平滑扩展。
 */
export const SUPPORTED_COMMENT_PROVIDERS = ['twikoo', 'waline', 'artalk'] as const;

/**
 * 默认 IANA 时区。
 *
 * - 用途：日期展示、RSS 时间、sitemap `lastmod`、`since` 的默认年份都按此时区计算。
 * - 可选值：任何合法的 IANA 时区名，例如 `'UTC'`、`'Asia/Tokyo'`、`'Europe/London'`。
 * - 默认：`'Asia/Shanghai'`。
 * - 注意：构建期时区与运行环境无关；非法值会在 `validateSite()` 中抛 `ConfigError`。
 */
export const DEFAULT_TIMEZONE = 'Asia/Shanghai';

type HomeDefaults = Omit<HomeConfig, 'showTitles'>;

interface LocaleDefaults {
  home: HomeDefaults;
  labels: LabelsConfig;
  nav: NavItem[];
  footerNav: NavLinkItem[];
}

const LOCALE_DEFAULTS: Record<SiteLang, LocaleDefaults> = {
  zh_CN: {
    home: { title: '日记', subtitle: '一篇一篇，日子就有了形状。' },
    labels: { diary: '日记' },
    nav: [
      { title: '日记', link: '/' },
      {
        title: '文章',
        items: [
          { title: '全部文章', link: '/posts' },
          { title: '分类', link: '/categories' },
          { title: '标签', link: '/tags' },
          { title: '归档', link: '/archives' },
        ],
      },
      { title: '友链', link: '/friends' },
      { title: '关于', link: '/about' },
    ],
    footerNav: [
      { title: '归档', link: '/archives' },
      { title: '友链', link: '/friends' },
      { title: 'RSS', link: '/feed.xml' },
    ],
  },
  zh_TW: {
    home: { title: '日記', subtitle: '一篇一篇，日子就有了形狀。' },
    labels: { diary: '日記' },
    nav: [
      { title: '日記', link: '/' },
      {
        title: '文章',
        items: [
          { title: '全部文章', link: '/posts' },
          { title: '分類', link: '/categories' },
          { title: '標籤', link: '/tags' },
          { title: '歸檔', link: '/archives' },
        ],
      },
      { title: '友鏈', link: '/friends' },
      { title: '關於', link: '/about' },
    ],
    footerNav: [
      { title: '歸檔', link: '/archives' },
      { title: '友鏈', link: '/friends' },
      { title: 'RSS', link: '/feed.xml' },
    ],
  },
  ja: {
    home: { title: '日記', subtitle: '一篇ずつ、日々がかたちになる。' },
    labels: { diary: '日記' },
    nav: [
      { title: '日記', link: '/' },
      {
        title: '記事',
        items: [
          { title: 'すべての記事', link: '/posts' },
          { title: 'カテゴリー', link: '/categories' },
          { title: 'タグ', link: '/tags' },
          { title: 'アーカイブ', link: '/archives' },
        ],
      },
      { title: '友だち', link: '/friends' },
      { title: '情報', link: '/about' },
    ],
    footerNav: [
      { title: 'アーカイブ', link: '/archives' },
      { title: '友だち', link: '/friends' },
      { title: 'RSS', link: '/feed.xml' },
    ],
  },
  en: {
    home: { title: 'Diary', subtitle: 'One entry at a time, the days take shape.' },
    labels: { diary: 'Diary' },
    nav: [
      { title: 'Diary', link: '/' },
      {
        title: 'Articles',
        items: [
          { title: 'All articles', link: '/posts' },
          { title: 'Categories', link: '/categories' },
          { title: 'Tags', link: '/tags' },
          { title: 'Archives', link: '/archives' },
        ],
      },
      { title: 'Friends', link: '/friends' },
      { title: 'About', link: '/about' },
    ],
    footerNav: [
      { title: 'Archives', link: '/archives' },
      { title: 'Friends', link: '/friends' },
      { title: 'RSS', link: '/feed.xml' },
    ],
  },
};

/** 当前语言的首页标题与副标题默认值。 */
export function defaultHome(lang: SiteLang): HomeConfig {
  return { ...LOCALE_DEFAULTS[lang].home, showTitles: true };
}

/** 当前语言的「日记」类内容称呼默认值。 */
export function defaultLabels(lang: SiteLang): LabelsConfig {
  return { ...LOCALE_DEFAULTS[lang].labels };
}

/** 当前语言的顶部导航默认值；返回新数组，避免调用方修改共享对象。 */
export function defaultNav(lang: SiteLang): NavItem[] {
  return LOCALE_DEFAULTS[lang].nav.map((item) =>
    'items' in item ? { ...item, items: item.items.map((link) => ({ ...link })) } : { ...item },
  );
}

/** 当前语言的页脚导航默认值。 */
export function defaultFooterNav(lang: SiteLang): NavLinkItem[] {
  return LOCALE_DEFAULTS[lang].footerNav.map((item) => ({ ...item }));
}

/** 移动端底部导航默认值：四项只写链接，标题与图标由组件按导航配置推导。 */
export function defaultBottomNav(): BottomNavItem[] {
  return [{ link: '/' }, { link: '/posts' }, { link: '/friends' }, { link: '/about' }];
}

/** 归档页默认展示内容类型。 */
export const DEFAULT_ARCHIVE: ArchiveConfig = { defaultType: 'articles' };

/** 无标题日记允许的内置回退策略。 */
export const DAILY_TITLE_FALLBACK_STRATEGIES = [
  'date',
  'slug',
  'untitled',
] as const satisfies readonly DailyTitleFallbackStrategy[];

/** 自定义回退模板支持的占位符。 */
export const DAILY_TITLE_FALLBACK_PLACEHOLDERS = ['date', 'slug', 'diary', 'untitled'] as const;

/** 无标题日记出现的位置。 */
export const DAILY_TITLE_FALLBACK_POSITIONS = [
  'detail',
  'archive',
  'feed',
] as const satisfies readonly DailyTitleFallbackPosition[];

/** 无标题日记的默认回退：详情与 RSS 用日期，归档用 slug。 */
export const DEFAULT_DAILY_TITLE_FALLBACK: DailyTitleFallbackConfig = {
  detail: 'date',
  archive: 'slug',
  feed: 'date',
};

/**
 * 默认主题偏好。
 *
 * - 用途：`site.ts` 未配置 `theme` 时决定首屏明暗；用户手动选择会覆盖此值。
 * - 可选值：`'light'`、`'dark'`、`'system'`。
 * - 默认：`'system'`，跟随 `prefers-color-scheme`。
 * - 注意：配置只作为默认值；抽屉里的手动选择会写入 localStorage 并优先。
 */
export const DEFAULT_THEME: ThemeMode = 'system';

/**
 * MDX 增强的默认值。
 *
 * - 用途：`site.ts` 未配置 `mdx.meting` 时，MDX 里的 `meting.fetchMusic()` /
 *   `meting.player()` 使用这里的 Meting-API 地址与请求超时。
 * - 字段：
 *   - `api`：Meting-API 基础地址，默认 `'https://163.hyc.moe/'`；自部署时替换成自己的地址。
 *   - `timeout`：单次请求超时时间（毫秒），默认 `5000`。
 *   - `cache.enabled`：服务端缓存开关，默认 `true`。
 *   - `cache.ttl.playlist` / `search`：短缓存，默认 1 天（`86400000`）。
 *   - `cache.ttl.default`：其它类型的长缓存，默认 30 天（`2592000000`）。
 * - 注意：服务端缓存只影响构建/开发时请求；浏览器端 `client: true` 不读该缓存。
 */
export const DEFAULT_MDX = {
  meting: {
    api: 'https://163.hyc.moe/',
    timeout: 5000,
    cache: {
      enabled: true,
      ttl: {
        playlist: 86_400_000,
        search: 86_400_000,
        default: 2_592_000_000,
      },
    },
  },
} as const;

/**
 * RSS 的默认值。
 *
 * - 用途：`site.ts` 未配置 `rss` 时决定 RSS 总开关、三个 endpoint 的子开关、
 *   是否输出全文与每份 feed 的条目上限。
 * - 字段：
 *   - `enabled`：RSS 总开关，默认 `true`；关闭后所有 feed endpoint 不生成。
 *   - `default.scope`：默认 feed 的内容范围，可选 `'all' | 'diary' | 'post'`，默认 `'all'`。
 *   - `diary` / `posts`：日记 / 文章 feed 的子开关，默认均开启。
 *   - `fullText`：`false` 输出摘要（默认），`true` 输出渲染后的正文 HTML。
 *   - `limit`：单份 feed 的最大条目数，默认 `20`，必须为正整数且不超过 200。
 * - 注意：草稿与 `hideFrom: [rss]` 的内容始终排除；密码内容只输出标题与 `description`。
 */
export const DEFAULT_RSS = {
  enabled: true,
  default: { enabled: true, scope: 'all' as const },
  diary: { enabled: true },
  posts: { enabled: true },
  fullText: false,
  limit: 20,
};

/**
 * 评论的默认值。
 *
 * - 用途：`site.ts` 未配置 `comments` 时决定评论开关、评论系统 provider 与各后端参数。
 * - 字段：
 *   - `enabled`：评论总开关，默认 `true`；单篇内容仍可用 frontmatter `comments: false` 关闭。
 *   - `provider`：评论系统名称，默认 `'twikoo'`；必须命中 `SUPPORTED_COMMENT_PROVIDERS`。
 *   - `twikoo.envId`：Twikoo 环境 ID 或部署地址，默认 `''`（空字符串表示尚未配置）。
 *   - `twikoo.region`：Twikoo 云开发地域，默认 `''`（留空则用 Twikoo 默认值）。
 *   - `twikoo.lang`：Twikoo 界面语言，缺省时由站点 `lang` 推导。
 *   - `waline.serverURL`：Waline 服务端地址，默认 `''`（空字符串表示尚未配置）。
 *   - `waline.login`：Waline 登录策略，默认 `'enable'`。
 *   - `waline.pageSize`：Waline 每页评论数，默认 `10`。
 *   - `waline.lang`：Waline 界面语言，缺省时由站点 `lang` 推导（ja 映射为 `jp`）。
 *   - `artalk.server`：Artalk 服务端地址，默认 `''`。
 *   - `artalk.site`：Artalk 站点名，缺省时回退站点标题。
 *   - `artalk.locale`：Artalk 界面语言，缺省时由站点 `lang` 推导。
 *   - `artalk.pageSize`：Artalk 每页评论数，默认 `20`。
 * - 注意：各后端地址为空时评论区仍会渲染骨架并尝试初始化，组件不拦截空值；
 *   缺少服务端配置的提示由各评论系统自己给出。
 */
export const DEFAULT_COMMENTS = {
  enabled: true,
  provider: 'twikoo',
  twikoo: { envId: '', region: '' },
  waline: { serverURL: '', login: 'enable', pageSize: 10 },
  artalk: { server: '', pageSize: 20 },
} as const;

/**
 * 自定义 HTML 注入的默认值。
 *
 * - 用途：`site.ts` 未配置 `inject` 时，`BaseLayout.astro` 不在页面末尾输出任何内容。
 * - 字段：
 *   - `headEnd`：输出到所有页面 `</head>` 之前，默认 `''`（不注入）。
 *   - `bodyEnd`：输出到所有页面 `</body>` 之前，默认 `''`（不注入）。
 * - 注意：内容按原样输出（Astro `set:html`），不做转义或清洗；只放站点自己写的可信 HTML。
 *   站内跳转（View Transitions）不会重新执行注入的 `<script>`，需要每次导航运行请监听 `astro:page-load`。
 */
export const DEFAULT_INJECT = {
  headEnd: '',
  bodyEnd: '',
};

/**
 * robots.txt 的默认值。
 *
 * - 用途：`site.ts` 未配置 `robots` 时生成 `robots.txt` 的总开关与额外 `Disallow` 规则。
 * - 字段：
 *   - `enabled`：是否生成 `robots.txt`，默认 `true`。
 *   - `disallow`：额外禁止抓取的路径数组，默认 `[]`；每项必须以 `/` 开头。
 * - 注意：密码保护页的 URL 会自动追加到 `Disallow`，`Allow: /` 始终输出。
 */
export const DEFAULT_ROBOTS = {
  enabled: true,
  disallow: [] as string[],
};

/**
 * SEO / Open Graph 的默认值。
 *
 * - 用途：页面没有独立 OG 图或自定义 `twitterCard` 时使用。
 * - 字段：
 *   - `ogImage`：默认 OG 图，默认 `'/og-default.png'`；必须是 `/` 开头的 public 路径或 http(s) URL。
 *   - `twitterCard`：Twitter Card 类型，默认 `'summary_large_image'`。
 *   - `locale`：OG `og:locale`，缺省时由站点 `lang` 推导。
 * - 注意：`ogImage` 的具体文件由 `pnpm og` 生成，修改路径后需同步替换 `public/` 下的图片。
 */
export const DEFAULT_SEO = {
  ogImage: '/og-default.png',
  twitterCard: 'summary_large_image',
};

/**
 * sitemap 的默认值。
 *
 * - 用途：`site.ts` 未配置 `sitemap` 时决定是否生成 `sitemap.xml` 以及是否包含密码页。
 * - 字段：
 *   - `enabled`：是否生成 sitemap，默认 `true`。
 *   - `includeProtected`：是否把密码保护页面纳入 sitemap，默认 `false`。
 * - 注意：密码页默认只索引标题与 `description`，且输出 `noindex`。
 */
export const DEFAULT_SITEMAP = {
  enabled: true,
  includeProtected: false,
};
