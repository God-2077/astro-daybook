/**
 * 播放器的纯数据逻辑：配置校验、LRC 解析与时间格式化。
 *
 * 这里不碰 DOM 与网络，构建期（组件）和浏览器（播放器脚本）都可以引用。
 */

export interface MusicTrack {
  /** 曲名，必填。 */
  name: string;
  /** 音频地址，必填；相对站点的 /public 路径或绝对地址均可。 */
  url: string;
  /** 艺人，可选；缺省显示“未知作者”。 */
  artist?: string;
  /** 封面图地址，可选；缺省显示音符线稿。 */
  cover?: string;
  /** LRC 歌词地址，可选；缺省不显示歌词行。 */
  lrc?: string;
}

export interface LyricLine {
  /** 该行歌词对应的音频时间，单位为秒。 */
  time: number;
  text: string;
}

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 校验并规范化 playlist。
 *
 * 在构建期调用：缺 name/url 会直接让构建失败，而不是把坏数据带到浏览器。
 */
export function normalizePlaylist(playlist: readonly MusicTrack[]): MusicTrack[] {
  if (!Array.isArray(playlist) || playlist.length === 0) {
    throw new Error('[daybook:music] playlist must contain at least one track');
  }

  return playlist.map((track, index) => {
    const name = typeof track?.name === 'string' ? track.name.trim() : '';
    const url = typeof track?.url === 'string' ? track.url.trim() : '';

    if (!name) throw new Error(`[daybook:music] playlist[${index}].name is required`);
    if (!url) throw new Error(`[daybook:music] playlist[${index}].url is required`);

    return {
      name,
      url,
      artist: cleanOptional(track.artist),
      cover: cleanOptional(track.cover),
      lrc: cleanOptional(track.lrc),
    };
  });
}

/** 解析 LRC；支持一行多个时间标签，返回按时间升序的非空行。 */
export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeTag = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const raw of source.split(/\r?\n/)) {
    const tags = [...raw.matchAll(timeTag)];
    if (tags.length === 0) continue;

    const text = raw.replace(/^(?:\[[^\]]*\])+/, '').trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      const fraction = tag[3] ? Number(tag[3].padEnd(3, '0').slice(0, 3)) / 1000 : 0;
      const time = minutes * 60 + seconds + fraction;
      if (Number.isFinite(time)) lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/** 秒数 → `MM:SS`；未知时长显示 `--:--`。 */
export function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '--:--';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
