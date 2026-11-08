/**
 * MDX 增强入口（`@mdx`）。
 *
 * 在 MDX 里按需导入：
 *
 * ```mdx
 * import { meting } from '@mdx';
 *
 * {await meting.player({ server: 'netease', type: 'song', id: '1969519579' })}
 * ```
 *
 * `fetchMusic` / `request` 是构建期数据接口，`player` 会把结果直接转成
 * `MusicPlayer` 组件。浏览器端不会加载这个模块。
 */

import { jsx } from 'astro/jsx-runtime';
import MusicPlayer from '../../components/content/MusicPlayer.astro';
import { fetchMusic, type MetingOptions, type MetingPlayerType, type MetingQuery, request } from '../meting';
import { assertMetingQuery } from '../meting-core';

export type MetingPlayerQuery = Omit<MetingQuery, 'type'> & { type: MetingPlayerType };

export interface MetingPlayerOptions extends MetingOptions {
  /** 一首播完后是否自动播放下一首；默认 false。 */
  autoPlayNext?: boolean;
  /** 是否默认展开播放列表；默认 false。 */
  playlistExpand?: boolean;
  /** 为 true 时不在构建期请求，改为浏览器端拉取并填充播放器。 */
  client?: boolean;
}

/** `player` 的入参：查询字段与播放器选项写在同一个对象里。 */
export type MetingPlayerInput = MetingPlayerQuery & MetingPlayerOptions;

/**
 * 拉取歌曲/歌单/专辑/搜索结果并返回可直接渲染的 `MusicPlayer`。
 *
 * 只支持 `song`、`playlist`、`albumlist`、`search`；文本与重定向类型没有播放列表。
 * `autoPlayNext` / `playlistExpand` / `client` 与查询参数写在同一个对象里，
 * 也可以通过第二个参数追加或覆盖请求配置。
 */
export async function player(input: MetingPlayerInput, extra: MetingPlayerOptions = {}) {
  const {
    autoPlayNext = false,
    playlistExpand = false,
    client = false,
    api,
    timeout,
    signal,
    headers,
    cache,
    cacheFile,
    ...query
  } = input;
  const fetchOptions: MetingOptions = {
    api,
    timeout,
    signal,
    headers,
    cache,
    cacheFile,
    ...extra,
  };

  if (client) {
    assertMetingQuery(query);
    return jsx(MusicPlayer, {
      metingSource: {
        query,
        api: fetchOptions.api,
        timeout: fetchOptions.timeout,
      },
      autoPlayNext,
      playlistExpand,
    });
  }

  const result = await fetchMusic(query, fetchOptions);
  const tracks = Array.isArray(result) ? result : [result];

  if (tracks.length === 0) {
    throw new Error(`[daybook:meting] type=${query.type} 没有返回可播放的曲目`);
  }

  const missing = tracks.find((track) => !track.url);
  if (missing) {
    throw new Error(`[daybook:meting] 曲目「${missing.name || '未知'}」没有可播放地址`);
  }

  const playlist = tracks.map((track) => ({
    name: track.name,
    url: track.url,
    artist: track.artist || undefined,
    cover: track.cover || undefined,
    lrc: track.lrc || undefined,
  }));

  return jsx(MusicPlayer, { playlist, autoPlayNext, playlistExpand });
}

/** MDX 里常用的命名空间入口。 */
export const meting = {
  request,
  fetchMusic,
  player,
};

export type {
  MetingBr,
  MetingFormat,
  MetingListType,
  MetingOptions,
  MetingQuery,
  MetingResult,
  MetingServer,
  MetingTextType,
  MetingTrack,
  MetingType,
} from '../meting';
export { fetchMusic, request };
