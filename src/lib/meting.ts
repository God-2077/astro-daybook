/**
 * Meting-API 服务端客户端（构建期）。
 *
 * 在 `meting-core` 的纯请求逻辑之上读取 `siteConfig.mdx.meting`，并加入
 * 持久化缓存。浏览器端请使用 `@mdx/client` / `src/lib/meting-browser.ts`，
 * 那边不会 import 这个文件，也不会读写缓存。
 */

import { siteConfig } from '../config/site';
import { resolveMetingCacheFile } from './content/paths';
import { createMetingCache, type MetingCache } from './meting-cache';
import {
  buildMetingUrl as buildCoreMetingUrl,
  createMetingRequest,
  DEFAULT_METING_TIMEOUT,
  executeMetingRequest,
  isMetingJsonType,
  isMetingRedirectType,
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
export { isMetingJsonType, isMetingRedirectType };

/** 服务端请求选项；缓存字段只在构建期生效。 */
export interface MetingOptions extends MetingRequestOptions {
  /** 是否启用服务端缓存；默认读 `siteConfig.mdx.meting.cache.enabled`。 */
  cache?: boolean;
  /** 覆盖缓存文件路径，主要用于测试或特殊部署。 */
  cacheFile?: string;
}

const caches = new Map<string, MetingCache>();
const inflight = new Map<string, Promise<ResolvedRawResponse>>();

interface ResolvedRawResponse {
  data: unknown;
  url: URL;
}

function ttlFor(type: MetingType): number {
  const { ttl } = siteConfig.mdx.meting.cache;
  if (type === 'playlist') return ttl.playlist;
  if (type === 'search') return ttl.search;
  return ttl.default;
}

function cacheFor(file: string): MetingCache {
  let cache = caches.get(file);
  if (!cache) {
    cache = createMetingCache(file, ttlFor);
    caches.set(file, cache);
  }
  return cache;
}

function cacheKeyFor(url: URL): string {
  const key = new URL(url);
  key.searchParams.delete('refresh');
  return key.toString();
}

/**
 * 把查询参数拼成 Meting-API 地址；未指定 api 时使用站点配置。
 */
export function buildMetingUrl(query: MetingQuery, api = siteConfig.mdx.meting.api): URL {
  return buildCoreMetingUrl(query, api);
}

async function fetchRaw(query: MetingQuery, options: MetingOptions): Promise<ResolvedRawResponse> {
  const config = siteConfig.mdx.meting;
  const api = options.api ?? config.api;
  const url = buildCoreMetingUrl(query, api);
  const cacheEnabled = options.cache ?? config.cache.enabled;
  const cacheFile = options.cacheFile ?? resolveMetingCacheFile();
  const refresh = query.refresh === true;
  const cacheKey = cacheKeyFor(url);
  const cache = cacheFor(cacheFile);

  if (cacheEnabled && !refresh) {
    const hit = await cache.get(cacheKey, query.type);
    if (hit.hit) return { data: hit.data, url };
  }

  const inflightKey = `${cacheFile}\0${cacheKey}`;
  const existing = inflight.get(inflightKey);
  if (existing) return existing;

  const promise = (async (): Promise<ResolvedRawResponse> => {
    const request = createMetingRequest(query, {
      api,
      timeout: options.timeout ?? config.timeout ?? DEFAULT_METING_TIMEOUT,
      signal: options.signal,
      headers: options.headers,
    });
    const data = await executeMetingRequest(request, query.type);
    if (cacheEnabled) await cache.set(cacheKey, query.type, data);
    return { data, url: request.url };
  })().finally(() => {
    inflight.delete(inflightKey);
  });

  inflight.set(inflightKey, promise);
  return promise;
}

/**
 * 发送一次 Meting-API 请求并返回原始结果（不归一化）。
 */
export async function request(query: MetingQuery, options: MetingOptions = {}): Promise<unknown> {
  const { data } = await fetchRaw(query, options);
  return data;
}

/**
 * 获取音乐信息。
 *
 * - `song` 返回单个 `MetingTrack`
 * - `playlist` / `albumlist` / `search` 返回 `MetingTrack[]`
 * - `name` / `artist` / `album` / `lrc` 返回文本
 * - `url` / `pic` 返回重定向目标
 * - `debug` 返回原始对象
 */
export async function fetchMusic<T extends MetingType>(
  query: MetingQuery & { type: T },
  options: MetingOptions = {},
): Promise<MetingResult<T>> {
  const { data, url } = await fetchRaw(query, options);
  return normalizeMusicResult<T>(query, data, url);
}
