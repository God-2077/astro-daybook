/**
 * MDX 浏览器客户端入口（`@mdx/client`）。
 *
 * 只在浏览器运行，用于自定义脚本或客户端组件：
 *
 * ```ts
 * import { meting } from '@mdx/client';
 *
 * const song = await meting.fetchMusic({ server: 'netease', type: 'song', id: '1969519579' });
 * ```
 *
 * 默认 API 地址与超时来自 `<html data-meting-api data-meting-timeout>`，
 * 由 `BaseLayout.astro` 根据站点配置输出。构建期取数请继续使用 `@mdx`。
 */

export type {
  MetingBr,
  MetingBrowserClient,
  MetingClientSource,
  MetingFormat,
  MetingListType,
  MetingParamValue,
  MetingPlayerType,
  MetingQuery,
  MetingRedirectType,
  MetingRequestOptions,
  MetingResult,
  MetingServer,
  MetingTextType,
  MetingTrack,
  MetingType,
} from '../meting-browser';
export { createMetingClient, fetchMusic, meting, request } from '../meting-browser';
