/**
 * Meting-API 的纯请求与归一化逻辑。
 *
 * 这个模块同时被服务端（构建期，带缓存）和浏览器端客户端使用，因此不能
 * import `siteConfig`、`node:*` 或任何只在 Node 可用的 API。
 */

export const DEFAULT_METING_API = 'https://163.hyc.moe/';
export const DEFAULT_METING_TIMEOUT = 5000;

export type MetingServer = string;

export type MetingType =
  | 'song'
  | 'playlist'
  | 'albumlist'
  | 'search'
  | 'name'
  | 'artist'
  | 'album'
  | 'url'
  | 'pic'
  | 'lrc'
  | 'debug';

export type MetingListType = 'playlist' | 'albumlist' | 'search';
export type MetingTextType = 'name' | 'artist' | 'album' | 'lrc';
export type MetingRedirectType = 'url' | 'pic';
export type MetingPlayerType = 'song' | MetingListType;

export type MetingFormat =
  | 'lrc'
  | 'trans'
  | 'roma'
  | 'elrc'
  | 'yrc'
  | 'qrc'
  | 'lys'
  | 'spl'
  | 'ttml'
  | 'amjson'
  | 'ass'
  | 'lqe'
  | 'srt'
  | 'txt';

export type MetingBr = 128 | 320 | 380 | 400;

export type MetingParamValue = string | number | boolean | undefined;

/** Meting-API 的查询参数；`type` 必填，其余按接口需要选择。 */
export interface MetingQuery {
  /** 数据源；默认 `netease`，也支持 `tencent` / `kugou`。 */
  server?: MetingServer;
  /** 接口类型。 */
  type: MetingType;
  /** 资源 ID；`search` 省略时自动填 `0`，`debug` 不需要。 */
  id?: string | number;
  /** 搜索关键词；仅 `type=search` 需要。 */
  keyword?: string;
  /** 封面尺寸；仅 `type=pic` 可选。 */
  picsize?: string | number;
  /** 音频码率；仅 `type=song` / `type=url` 可选。 */
  br?: MetingBr | string | number;
  /** 歌词输出格式；仅 `type=lrc` 可选。 */
  format?: MetingFormat | string;
  /** 翻译轨开关；仅 `type=lrc` 可选。 */
  trans?: boolean | 'inline';
  /** 罗马音副轨开关；仅 `type=lrc` 可选。 */
  roma?: boolean;
  /** 副轨顺序反转；仅 `type=lrc` 可选。 */
  romaFirst?: boolean;
  /** 歌词时间轴规范化；仅 `type=lrc` 可选。 */
  lrcNormalize?: boolean;
  /** Handsome 兼容模式：返回 `cover` 而不是 `pic`。 */
  handsome?: boolean;
  /** 忽略服务端缓存并尝试重新获取。 */
  refresh?: boolean;
  /** 图片链接直接返回源站地址。 */
  imgRedirect?: boolean;
  /** 分块输出；仅 `type=playlist` 可选。 */
  stream?: boolean;
  /** 搜索结果页码；仅 `type=search` 可选。 */
  page?: number;
  /** 搜索结果数量；仅 `type=search` 可选。 */
  limit?: number;
  /** 服务端开启 AUTH 时的签名。 */
  auth?: string;
  /** 旧版歌词类型参数，作为 `format` 的兼容别名。 */
  lrctype?: string | number;
  /** 透传额外查询参数，后写入，可覆盖上面的同名字段。 */
  params?: Record<string, MetingParamValue>;
}

/** 单次请求的公共覆盖项。 */
export interface MetingRequestOptions {
  /** 覆盖 `siteConfig.mdx.meting.api`。 */
  api?: string;
  /** 覆盖 `siteConfig.mdx.meting.timeout`，单位毫秒。 */
  timeout?: number;
  /** 与超时信号合并的外部取消信号。 */
  signal?: AbortSignal;
  /** 额外请求头。 */
  headers?: Record<string, string>;
}

/** 归一化后的曲目；`pic` 与 `cover` 指向同一张封面。 */
export interface MetingTrack {
  name: string;
  artist: string;
  album: string;
  source: string;
  url: string;
  pic: string;
  cover: string;
  lrc: string;
  /** 服务端返回的原始对象，保留 `album_artist` / `year` 等未归一化字段。 */
  raw: Record<string, unknown>;
}

export type MetingResult<T extends MetingType> = T extends 'song'
  ? MetingTrack
  : T extends MetingListType
    ? MetingTrack[]
    : T extends MetingTextType | MetingRedirectType
      ? string
      : T extends 'debug'
        ? Record<string, unknown>
        : unknown;

export interface MetingRequestConfig extends MetingRequestOptions {
  /** 浏览器端遇到 `url` / `pic` 时直接返回接口地址，不读取 302 的 Location。 */
  browserRedirect?: boolean;
}

/** 交给 `MusicPlayer` 客户端填充的数据源。 */
export interface MetingClientSource {
  query: MetingQuery;
  /** 单次调用覆盖的 API 地址；省略时使用页面上的站点配置。 */
  api?: string;
  /** 单次调用覆盖的超时；省略时使用页面上的站点配置。 */
  timeout?: number;
}

interface ResolvedMetingRequest {
  url: URL;
  timeout: number;
  signal: AbortSignal;
  timedOut: () => boolean;
  clear: () => void;
  headers?: Record<string, string>;
  browserRedirect: boolean;
}

const JSON_TYPES: ReadonlySet<MetingType> = new Set(['song', 'playlist', 'albumlist', 'search', 'debug']);
const REDIRECT_TYPES: ReadonlySet<MetingType> = new Set(['url', 'pic']);

export function isMetingJsonType(type: MetingType): boolean {
  return JSON_TYPES.has(type);
}

export function isMetingRedirectType(type: MetingType): boolean {
  return REDIRECT_TYPES.has(type);
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return String(value);
}

function setParam(params: URLSearchParams, key: string, value: MetingParamValue): void {
  if (value === undefined) return;
  params.set(key, String(value));
}

function resolveApi(api: string): URL {
  let url: URL;
  try {
    url = new URL(api);
  } catch {
    throw new Error(`[daybook:meting] api 不是合法地址：${api}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`[daybook:meting] api 只支持 http:// 或 https://：${api}`);
  }
  return url;
}

/**
 * 校验查询参数的基本结构。
 *
 * `search` 省略 `id` 时补 `0`；除 `debug` 外必须有 `id`；`search` 必须有 `keyword`。
 */
export function assertMetingQuery(query: MetingQuery): void {
  const { type } = query;
  if (type !== 'debug' && type !== 'search' && query.id === undefined) {
    throw new Error(`[daybook:meting] type=${type} 需要 id`);
  }
  if (type === 'search' && !query.keyword?.trim()) {
    throw new Error('[daybook:meting] type=search 需要 keyword');
  }
}

/**
 * 把查询参数拼成 Meting-API 地址。
 */
export function buildMetingUrl(query: MetingQuery, api: string = DEFAULT_METING_API): URL {
  const url = resolveApi(api);
  const params = new URLSearchParams();
  assertMetingQuery(query);

  params.set('server', query.server ?? 'netease');
  params.set('type', query.type);

  if (query.type === 'search') {
    params.set('id', String(query.id ?? 0));
  } else if (query.id !== undefined) {
    params.set('id', String(query.id));
  }

  if (query.keyword !== undefined) setParam(params, 'keyword', query.keyword);
  if (query.picsize !== undefined) setParam(params, 'picsize', query.picsize);
  if (query.br !== undefined) setParam(params, 'br', query.br);
  if (query.format !== undefined) setParam(params, 'format', query.format);
  if (query.trans !== undefined) setParam(params, 'trans', query.trans);
  if (query.roma !== undefined) setParam(params, 'roma', query.roma);
  if (query.romaFirst !== undefined) setParam(params, 'roma_first', query.romaFirst);
  if (query.lrcNormalize !== undefined) setParam(params, 'lrc_normalize', query.lrcNormalize);
  if (query.handsome !== undefined) setParam(params, 'handsome', query.handsome);
  if (query.refresh !== undefined) setParam(params, 'refresh', query.refresh);
  if (query.imgRedirect !== undefined) setParam(params, 'img_redirect', query.imgRedirect);
  if (query.stream !== undefined) setParam(params, 'stream', query.stream);
  if (query.page !== undefined) setParam(params, 'page', query.page);
  if (query.limit !== undefined) setParam(params, 'limit', query.limit);
  if (query.auth !== undefined) setParam(params, 'auth', query.auth);
  if (query.lrctype !== undefined) setParam(params, 'lrctype', query.lrctype);

  for (const [key, value] of Object.entries(query.params ?? {})) {
    setParam(params, key, value);
  }

  url.search = params.toString();
  return url;
}

function timeoutError(url: URL, timeout: number): Error {
  return new Error(`[daybook:meting] 请求超时（${timeout}ms）：${url}`);
}

function networkError(url: URL, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`[daybook:meting] 请求失败：${url}\n  ${message}`);
}

async function httpError(response: Response, url: URL): Promise<Error> {
  let detail = '';
  try {
    const body = (await response.text()).trim();
    if (body) {
      try {
        const parsed = JSON.parse(body) as { error?: unknown };
        detail = typeof parsed.error === 'string' ? parsed.error : body;
      } catch {
        detail = body;
      }
    }
  } catch {
    detail = '';
  }

  const suffix = detail ? `：${detail.slice(0, 300)}` : '';
  if (response.status === 429) {
    return new Error(`[daybook:meting] 触发 Meting-API 限流（HTTP 429）${suffix}`);
  }
  return new Error(`[daybook:meting] ${url} 返回 HTTP ${response.status}${suffix}`);
}

function parseJson(body: string, url: URL): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    const snippet = body.trim().slice(0, 300);
    throw new Error(`[daybook:meting] ${url} 返回的不是合法 JSON${snippet ? `：${snippet}` : ''}`);
  }
}

function createTimeoutSignal(
  timeout: number,
  external?: AbortSignal,
): { signal: AbortSignal; timedOut: () => boolean; clear: () => void } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  const onAbort = (): void => controller.abort();
  external?.addEventListener('abort', onAbort, { once: true });
  if (external?.aborted) controller.abort();

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

export function createMetingRequest(query: MetingQuery, config: MetingRequestConfig): ResolvedMetingRequest {
  const timeout = config.timeout ?? DEFAULT_METING_TIMEOUT;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error(`[daybook:meting] timeout 必须是正数：${timeout}`);
  }

  const timeoutSignal = createTimeoutSignal(timeout, config.signal);
  return {
    url: buildMetingUrl(query, config.api ?? DEFAULT_METING_API),
    timeout,
    signal: timeoutSignal.signal,
    timedOut: timeoutSignal.timedOut,
    clear: timeoutSignal.clear,
    headers: config.headers,
    browserRedirect: config.browserRedirect ?? false,
  };
}

/**
 * 执行一次 Meting-API 请求并返回原始结果。
 *
 * JSON 类型返回解析后的对象；`url` / `pic` 在服务端返回重定向目标，
 * 在浏览器端直接返回接口地址；其余类型返回文本。
 */
export async function executeMetingRequest(request: ResolvedMetingRequest, type: MetingType): Promise<unknown> {
  const { url, signal, headers, browserRedirect } = request;

  if (browserRedirect && isMetingRedirectType(type)) {
    request.clear();
    return url.toString();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers,
      ...(isMetingRedirectType(type) ? { redirect: 'manual' as const } : {}),
    });
  } catch (error) {
    request.clear();
    if (request.timedOut()) throw timeoutError(url, request.timeout);
    throw networkError(url, error);
  }

  try {
    if (isMetingRedirectType(type)) {
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) return new URL(location, url).toString();
      }
      if (!response.ok) throw await httpError(response, url);
      return response.url || url.toString();
    }

    if (!response.ok) throw await httpError(response, url);

    const body = await response.text();
    if (isMetingJsonType(type)) {
      if (!body.trim()) throw new Error(`[daybook:meting] ${url} 返回了空响应`);
      return parseJson(body, url);
    }
    return body;
  } finally {
    request.clear();
  }
}

function normalizeMediaUrl(value: string, apiUrl: URL): string {
  if (!value) return value;
  try {
    const parsed = new URL(value);
    if (apiUrl.protocol === 'https:' && parsed.protocol === 'http:' && parsed.host === apiUrl.host) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    /* 不是绝对地址时保持原样，例如站内相对路径。 */
  }
  return value;
}

function normalizeTrack(raw: unknown, apiUrl: URL, index: number): MetingTrack {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`[daybook:meting] 第 ${index + 1} 条曲目不是对象`);
  }

  const record = raw as Record<string, unknown>;
  const pic = normalizeMediaUrl(asText(record.pic) || asText(record.cover), apiUrl);

  return {
    name: asText(record.name),
    artist: asText(record.artist),
    album: asText(record.album),
    source: asText(record.source),
    url: normalizeMediaUrl(asText(record.url), apiUrl),
    pic,
    cover: pic,
    lrc: normalizeMediaUrl(asText(record.lrc), apiUrl),
    raw: record,
  };
}

function normalizeTrackList(raw: unknown, apiUrl: URL): MetingTrack[] {
  if (!Array.isArray(raw)) {
    if (raw !== null && typeof raw === 'object' && typeof (raw as { error?: unknown }).error === 'string') {
      throw new Error(`[daybook:meting] ${(raw as { error: string }).error}`);
    }
    throw new Error('[daybook:meting] Meting-API 没有返回曲目数组');
  }
  return raw.map((item, index) => normalizeTrack(item, apiUrl, index));
}

export function normalizeMusicResult<T extends MetingType>(query: MetingQuery, raw: unknown, apiUrl: URL): MetingResult<T> {
  switch (query.type) {
    case 'song': {
      const tracks = normalizeTrackList(raw, apiUrl);
      const [track] = tracks;
      if (!track) throw new Error(`[daybook:meting] 没有找到歌曲：${query.id}`);
      return track as MetingResult<T>;
    }
    case 'playlist':
    case 'albumlist':
    case 'search':
      return normalizeTrackList(raw, apiUrl) as MetingResult<T>;
    case 'debug':
      return raw as MetingResult<T>;
    default:
      return asText(raw) as MetingResult<T>;
  }
}
