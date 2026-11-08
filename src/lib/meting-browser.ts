/**
 * Meting-API 浏览器客户端。
 *
 * 与服务端共用 `meting-core` 的 URL 构造与归一化，但不读写服务端缓存。
 * 默认 API 地址与超时来自 `BaseLayout` 写在 `<html>` 上的 data 属性：
 *
 * - `data-meting-api`
 * - `data-meting-timeout`
 *
 * 浏览器的 `url` / `pic` 请求直接返回接口地址，不解析 302（跨域 `redirect:
 * 'manual'` 无法读取 Location），音频/图片标签会自行跟随重定向。
 */

import {
  createMetingRequest,
  DEFAULT_METING_API,
  DEFAULT_METING_TIMEOUT,
  executeMetingRequest,
  type MetingQuery,
  type MetingRequestOptions,
  type MetingResult,
  type MetingType,
  normalizeMusicResult,
} from './meting-core';

export type {
  MetingBr,
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
} from './meting-core';
export { isMetingJsonType, isMetingRedirectType } from './meting-core';

interface PageMetingConfig {
  api: string;
  timeout: number;
}

function readPageConfig(): PageMetingConfig {
  if (typeof document === 'undefined') {
    return { api: DEFAULT_METING_API, timeout: DEFAULT_METING_TIMEOUT };
  }
  const data = document.documentElement.dataset;
  const timeout = Number(data.metingTimeout);
  return {
    api: data.metingApi?.trim() || DEFAULT_METING_API,
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_METING_TIMEOUT,
  };
}

export interface MetingBrowserClient {
  request(query: MetingQuery, options?: MetingRequestOptions): Promise<unknown>;
  fetchMusic<T extends MetingType>(query: MetingQuery & { type: T }, options?: MetingRequestOptions): Promise<MetingResult<T>>;
}

/**
 * 创建绑定默认配置的浏览器客户端。
 *
 * 不传参数时使用页面上的 `data-meting-*` 配置；测试或特殊场景可以显式传入。
 */
export function createMetingClient(defaults: MetingRequestOptions = {}): MetingBrowserClient {
  const page = readPageConfig();
  const base = {
    ...defaults,
    api: defaults.api ?? page.api,
    timeout: defaults.timeout ?? page.timeout,
  };

  const merge = (options: MetingRequestOptions): MetingRequestOptions => ({
    ...base,
    ...options,
    api: options.api ?? base.api,
    timeout: options.timeout ?? base.timeout,
  });

  return {
    async request(query, options = {}) {
      const request = createMetingRequest(query, {
        ...merge(options),
        browserRedirect: true,
      });
      return executeMetingRequest(request, query.type);
    },

    async fetchMusic<T extends MetingType>(
      query: MetingQuery & { type: T },
      options: MetingRequestOptions = {},
    ): Promise<MetingResult<T>> {
      const request = createMetingRequest(query, {
        ...merge(options),
        browserRedirect: true,
      });
      const data = await executeMetingRequest(request, query.type);
      return normalizeMusicResult<T>(query, data, request.url);
    },
  };
}

export function request(query: MetingQuery, options: MetingRequestOptions = {}): Promise<unknown> {
  return createMetingClient().request(query, options);
}

export function fetchMusic<T extends MetingType>(
  query: MetingQuery & { type: T },
  options: MetingRequestOptions = {},
): Promise<MetingResult<T>> {
  return createMetingClient().fetchMusic(query, options);
}

/** 浏览器端命名空间入口。 */
export const meting = {
  createMetingClient,
  fetchMusic,
  request,
};
