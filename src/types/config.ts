import type { SiteLang } from '../i18n/languages';

export type RssScope = 'all' | 'diary' | 'post';

/** 主题偏好：强制浅色 / 强制深色 / 跟随系统。 */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface NavLinkItem {
  title: string;
  link: string;
}

export interface NavGroupItem {
  title: string;
  items: NavLinkItem[];
}

export type NavItem = NavLinkItem | NavGroupItem;

/** 移动端底部导航项；标题与图标省略时按链接推导。 */
export interface BottomNavItem {
  title?: string;
  link: string;
  icon?: string;
}

/** 解析后的移动端底部导航配置。 */
export interface BottomNavConfig {
  enabled: boolean;
  items: BottomNavItem[];
}

/** 用户可写的移动端底部导航配置。 */
export interface BottomNavConfigInput {
  enabled?: boolean;
  items?: BottomNavItem[];
}

/** 归档页默认展示的内容类型。 */
export type ArchiveType = 'articles' | 'diary';

/** 解析后的归档页配置。 */
export interface ArchiveConfig {
  defaultType: ArchiveType;
}

/** 用户可写的归档页配置。 */
export interface ArchiveConfigInput {
  defaultType?: ArchiveType;
}

export interface IcpItem {
  text: string;
  link?: string;
}

export interface CopyrightConfig {
  enabled: boolean;
  yearFrom: number;
  author: string;
}

export interface PaginationConfig {
  daily: number;
  post: number;
}

export interface RssToggleConfig {
  enabled: boolean;
}

export interface RssDefaultConfig {
  enabled: boolean;
  scope: RssScope;
}

export interface RssConfig {
  enabled: boolean;
  default: RssDefaultConfig;
  diary: RssToggleConfig;
  posts: RssToggleConfig;
  fullText: boolean;
  limit: number;
}

export interface RssConfigInput {
  enabled?: boolean;
  default?: Partial<RssDefaultConfig>;
  diary?: Partial<RssToggleConfig>;
  posts?: Partial<RssToggleConfig>;
  fullText?: boolean;
  limit?: number;
}

export interface TwikooConfig {
  envId: string;
  region: string;
  /** Twikoo 界面语言；缺省时由站点 `lang` 推导。 */
  lang: string;
}

/** Waline 的登录策略，对应 `@waline/client` 的 `login` 选项。 */
export type WalineLogin = 'enable' | 'disable' | 'force';

export interface WalineConfig {
  /** Waline 服务端地址，例如 `https://waline.example.com`；为空时客户端静默失败。 */
  serverURL: string;
  /** Waline 界面语言；缺省时由站点 `lang` 推导（ja 会映射为 `jp`）。 */
  lang: string;
  /** 登录策略：`enable` 允许匿名与登录、`disable` 仅匿名、`force` 强制登录。 */
  login: WalineLogin;
  /** 每页评论数。 */
  pageSize: number;
}

export interface ArtalkConfig {
  /** Artalk 服务端地址，例如 `https://artalk.example.com`；为空时客户端静默失败。 */
  server: string;
  /** Artalk 站点名，必须与服务端 `site_name` 一致；为空时回退站点标题。 */
  site: string;
  /** Artalk 界面语言；缺省时由站点 `lang` 推导。 */
  locale: string;
  /** 每页评论数。 */
  pageSize: number;
}

export interface CommentsConfig {
  enabled: boolean;
  provider: string;
  twikoo: TwikooConfig;
  waline: WalineConfig;
  artalk: ArtalkConfig;
}

export interface CommentsConfigInput {
  enabled?: boolean;
  provider?: string;
  twikoo?: Partial<TwikooConfig>;
  waline?: Partial<WalineConfig>;
  artalk?: Partial<ArtalkConfig>;
}

export interface RobotsConfig {
  enabled: boolean;
  disallow: string[];
}

export interface SeoConfig {
  ogImage: string;
  twitterCard: string;
  /** OG `og:locale`；缺省时由站点 `lang` 推导。 */
  locale: string;
}

export interface SitemapConfig {
  enabled: boolean;
  includeProtected: boolean;
}

export interface TaxonomyConfig {
  categories?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface HomeConfig {
  title: string;
  subtitle: string;
  /** 是否在首页日记流显示标题；默认 true。 */
  showTitles: boolean;
}

export interface LabelsConfig {
  /** 「日记」类内容在站内的称呼；不影响导航文案。 */
  diary: string;
}

/** 全站自定义 HTML 注入；内容按原样输出，不做转义。 */
export interface InjectConfig {
  /** 输出到所有页面 `</head>` 之前；默认 `''`。 */
  headEnd: string;
  /** 输出到所有页面 `</body>` 之前；默认 `''`。 */
  bodyEnd: string;
}

export interface InjectConfigInput {
  headEnd?: string;
  bodyEnd?: string;
}

export interface SiteConfig {
  /** 构建语言；决定主题 UI、日期与站点默认文案。 */
  lang: SiteLang;
  title: string;
  subtitle: string;
  footerBrand: string;
  description: string;
  url: string;
  author: string;
  /** 作者头像；`''` 表示使用关于页的手绘印章。 */
  avatar: string;
  keywords: string[];
  timezone: string;
  since: number;
  theme: ThemeMode;
  nav: NavItem[];
  footerNav: NavLinkItem[];
  bottomNav: BottomNavConfig;
  copyright: CopyrightConfig;
  icp: IcpItem[];
  pagination: PaginationConfig;
  archive: ArchiveConfig;
  rss: RssConfig;
  comments: CommentsConfig;
  robots: RobotsConfig;
  seo: SeoConfig;
  sitemap: SitemapConfig;
  taxonomy: TaxonomyConfig;
  home: HomeConfig;
  labels: LabelsConfig;
  inject: InjectConfig;
}

export interface SiteConfigInput {
  /** 构建语言；默认 `zh_CN`。 */
  lang?: SiteLang;
  title: string;
  url: string;
  author: string;
  /** 作者头像；允许 `http(s)://` URL 或 `/` 开头的 public 路径（如 `/avatar.svg`）。 */
  avatar?: string;
  subtitle?: string;
  footerBrand?: string;
  description?: string;
  keywords?: string[];
  timezone?: string;
  since?: number;
  theme?: ThemeMode;
  nav?: NavItem[];
  footerNav?: NavLinkItem[];
  bottomNav?: BottomNavConfigInput;
  copyright?: Partial<CopyrightConfig>;
  icp?: IcpItem[];
  pagination?: Partial<PaginationConfig>;
  archive?: ArchiveConfigInput;
  rss?: RssConfigInput;
  comments?: CommentsConfigInput;
  robots?: Partial<RobotsConfig>;
  seo?: Partial<SeoConfig>;
  sitemap?: Partial<SitemapConfig>;
  taxonomy?: TaxonomyConfig;
  home?: Partial<HomeConfig>;
  labels?: Partial<LabelsConfig>;
  inject?: InjectConfigInput;
}

export interface FriendLink {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
}

export interface LinkGroup {
  name: string;
  description?: string;
  links: FriendLink[];
}

export interface LinksConfig {
  groups: LinkGroup[];
}

export interface LinksConfigInput {
  groups: LinkGroup[];
}
