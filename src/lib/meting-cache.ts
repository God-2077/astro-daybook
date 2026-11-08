/**
 * Meting 服务端缓存。
 *
 * 只由构建/开发服务器使用：把 Meting-API 的原始响应按请求 URL 存到一个 JSON
 * 文件里，按类型使用不同 TTL。浏览器端播放器不读这个缓存。
 *
 * 缓存文件路径由 `src/lib/content/paths.ts` 的 `resolveMetingCacheFile()` 决定。
 * 读取失败、文件损坏或写入失败都只警告一次，不阻断构建。
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { MetingType } from './meting-core';

interface CacheEntry {
  type: MetingType;
  timestamp: number;
  data: unknown;
}

interface CacheFile {
  version: 1;
  entries: Record<string, CacheEntry>;
}

export interface MetingCacheHit {
  hit: boolean;
  data?: unknown;
}

export interface MetingCache {
  get(key: string, type: MetingType): Promise<MetingCacheHit>;
  set(key: string, type: MetingType, data: unknown): Promise<void>;
}

const CACHE_VERSION = 1;

function isCacheFile(value: unknown): value is CacheFile {
  if (value === null || typeof value !== 'object') return false;
  const file = value as { version?: unknown; entries?: unknown };
  return (
    file.version === CACHE_VERSION && file.entries !== null && typeof file.entries === 'object' && !Array.isArray(file.entries)
  );
}

function warnOnce(file: string, message: string, error?: unknown): void {
  const detail = error instanceof Error ? error.message : error === undefined ? '' : String(error);
  console.warn(`[daybook:meting] ${message}：${file}${detail ? `\n  ${detail}` : ''}`);
}

/**
 * 创建一个缓存实例。
 *
 * `ttlFor(type)` 返回该类型的缓存时间（毫秒）；返回 `0` 表示不缓存。
 */
export function createMetingCache(file: string, ttlFor: (type: MetingType) => number): MetingCache {
  let data: CacheFile | null = null;
  let loadPromise: Promise<CacheFile> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();
  let warned = false;

  const warn = (message: string, error?: unknown): void => {
    if (warned) return;
    warned = true;
    warnOnce(file, message, error);
  };

  const empty = (): CacheFile => ({ version: CACHE_VERSION, entries: {} });

  const expire = (entries: Record<string, CacheEntry>): void => {
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      const ttl = ttlFor(entry.type);
      if (ttl <= 0 || !Number.isFinite(entry.timestamp) || now - entry.timestamp >= ttl) {
        delete entries[key];
      }
    }
  };

  const read = async (): Promise<CacheFile> => {
    try {
      const raw = await readFile(file, 'utf8');
      if (!raw.trim()) return empty();
      const parsed: unknown = JSON.parse(raw);
      if (!isCacheFile(parsed)) {
        warn('缓存文件格式不可识别，将重新生成');
        return empty();
      }
      return parsed;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== 'ENOENT') warn('读取缓存失败，将忽略缓存', error);
      return empty();
    }
  };

  const load = (): Promise<CacheFile> => {
    if (data) return Promise.resolve(data);
    loadPromise ??= read().then((value) => {
      data = value;
      return value;
    });
    return loadPromise;
  };

  const flush = (): Promise<void> => {
    writeQueue = writeQueue.then(async () => {
      const payload = JSON.stringify(data ?? empty());
      const directory = path.dirname(file);
      const temporary = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
      try {
        await mkdir(directory, { recursive: true });
        await writeFile(temporary, payload, 'utf8');
        await rename(temporary, file);
      } catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined);
        warn('写入缓存失败，本次构建继续', error);
      }
    });
    return writeQueue;
  };

  return {
    async get(key, type) {
      const cache = await load();
      const entry = cache.entries[key];
      if (!entry || entry.type !== type) return { hit: false };
      const ttl = ttlFor(type);
      if (ttl <= 0) return { hit: false };
      if (!Number.isFinite(entry.timestamp) || Date.now() - entry.timestamp >= ttl) {
        return { hit: false };
      }
      return { hit: true, data: entry.data };
    },

    async set(key, type, value) {
      const cache = await load();
      cache.entries[key] = { type, timestamp: Date.now(), data: value };
      expire(cache.entries);
      await flush();
    },
  };
}
