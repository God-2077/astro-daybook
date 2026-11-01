/**
 * 配置层的统一出口。
 *
 * 页面与组件应从 `src/config` 导入配置，而不是直接引用 `site.ts` /
 * `links.ts`，这样以后调整文件结构时无需改动调用方。
 *
 * 这里导出三类内容：
 * - 公开类型（来自 `src/types/config.ts`）
 * - 两份解析后的配置对象：`siteConfig` / `linksConfig`
 * - 评论能力的判断函数与 provider 白名单，便于页面按需判断是否渲染评论区
 */

export type {
  ArtalkConfig,
  CommentsConfig,
  CopyrightConfig,
  FriendLink,
  HomeConfig,
  IcpItem,
  InjectConfig,
  InjectConfigInput,
  LabelsConfig,
  LinkGroup,
  LinksConfig,
  NavGroupItem,
  NavItem,
  NavLinkItem,
  PaginationConfig,
  RobotsConfig,
  RssConfig,
  RssScope,
  SeoConfig,
  SiteConfig,
  SiteConfigInput,
  SitemapConfig,
  TaxonomyConfig,
  ThemeMode,
  TwikooConfig,
  WalineConfig,
  WalineLogin,
} from '../types/config';
export { SUPPORTED_COMMENT_PROVIDERS } from './defaults';
export { isCommentsRendered, isSupportedCommentProvider } from './define';
export { linksConfig } from './links';
export { siteConfig } from './site';
