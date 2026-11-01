import { isSupportedCommentProvider } from '../config/define';
import { siteConfig } from '../config/site';
import type { CommentsConfig } from '../types/config';

/**
 * 生成评论组件的运行期选项。
 *
 * 是否启用评论区只看三点：当前页面允许评论（frontmatter `comments`）、
 * 站点 `comments.enabled` 为 `true`、且 provider 受支持
 * （`twikoo` / `waline` / `artalk`）。
 *
 * 注意：各后端的服务端地址不是启用条件，`Comments` 与各 provider 也不会
 * 检查它们是否为空。只要评论区启用，就把完整配置原样交给对应 provider；
 * 缺少配置时由评论系统自己提示，评论组件不额外拦截。
 *
 * @param pageComments 当前内容 frontmatter 的 `comments` 值，默认 `true`。
 */
export function commentOptions(pageComments = true): CommentsConfig {
  const { comments } = siteConfig;
  return {
    ...comments,
    enabled: pageComments && comments.enabled && isSupportedCommentProvider(comments.provider),
  };
}
