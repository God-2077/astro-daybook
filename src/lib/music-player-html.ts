import type { FormatParams } from '../i18n/format';
import type { MessageKey } from '../i18n/locale-types';
import { escapeHtml } from './html-escape';
import type { MetingClientSource } from './meting-core';
import { type MusicTrack, normalizePlaylist } from './music';

/**
 * MusicPlayer 的共享 HTML 构造器。
 *
 * Astro 组件、:::music 与 ::meting 都从这里生成同一个 section.a-music，
 * 保证 music-player.ts / meting-player.ts 的选择器只有一套。
 * 这里不 import i18n/current 或 siteConfig，翻译函数由调用方注入。
 */

type AttrValue = string | number | boolean | undefined | null;

function attrs(entries: Record<string, AttrValue>): string {
  let output = '';
  for (const [key, value] of Object.entries(entries)) {
    if (value === true) {
      output += ` ${key}`;
      continue;
    }
    if (value === false || value === undefined || value === null) continue;
    output += ` ${key}="${escapeHtml(String(value))}"`;
  }
  return output;
}

function iconSvg(name: string, className = 'a-ico'): string {
  return `<svg class="${escapeHtml(className)}" aria-hidden="true" focusable="false"><use href="#${escapeHtml(name)}"></use></svg>`;
}

export interface MusicPlayerHtmlInput {
  playlist?: readonly MusicTrack[];
  metingSource?: MetingClientSource;
  autoPlayNext?: boolean;
  playlistExpand?: boolean;
}

export function renderMusicPlayerHtml(
  input: MusicPlayerHtmlInput,
  translate: (key: MessageKey, params?: FormatParams) => string,
): string {
  const { playlist, metingSource, autoPlayNext = false, playlistExpand = false } = input;
  const tracks = playlist ? normalizePlaylist(playlist) : [];
  const pending = Boolean(metingSource);
  if (!pending && tracks.length === 0) throw new Error('[daybook:music] playlist is empty');

  const [first] = tracks;
  const panelId = `music-list-${crypto.randomUUID()}`;
  const unknownArtist = translate('music.unknownArtist');
  const loadingLabel = translate('music.loading');
  const loadErrorLabel = translate('music.loadError');
  const playlistLabelTemplate = translate('music.playlistCount', { count: '{count}' });
  const playlistLabel = pending ? loadingLabel : translate('music.playlistCount', { count: tracks.length });
  const title = first?.name ?? loadingLabel;
  const artist = first ? first.artist || unknownArtist : '';
  const cover = first?.cover;

  const trackItems = tracks
    .map((track, index) => {
      const current = index === 0;
      const trackAttrs = attrs({
        class: `a-music-track${current ? ' is-current' : ''}`,
        type: 'button',
        'data-music-track': true,
        'data-url': track.url,
        'data-cover': track.cover,
        'data-lrc': track.lrc,
        'aria-current': current ? 'true' : undefined,
      });
      const number = String(index + 1).padStart(2, '0');
      return `<li><button${trackAttrs}><span class="a-music-track-index" aria-hidden="true"><span class="a-music-track-num">${number}</span><span class="a-music-eq" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="a-music-track-text"><span class="a-music-track-name">${escapeHtml(track.name)}</span><span class="a-music-track-artist">${escapeHtml(track.artist || unknownArtist)}</span></span><span class="a-music-track-time" data-music-track-time>--:--</span></button></li>`;
    })
    .join('');

  const rootAttrs = attrs({
    class: 'a-music',
    'aria-label': translate('music.player'),
    'data-music': true,
    'data-playing': 'false',
    'data-open': playlistExpand ? 'true' : 'false',
    'data-auto-next': autoPlayNext ? 'true' : 'false',
    'data-single': !pending && tracks.length === 1 ? 'true' : 'false',
    'data-meting-source': metingSource ? JSON.stringify(metingSource) : undefined,
    'data-meting-pending': pending ? 'true' : undefined,
    'aria-busy': pending ? 'true' : undefined,
    'data-label-play': translate('music.play'),
    'data-label-pause': translate('music.pause'),
    'data-label-error': translate('music.error'),
    'data-label-loading': loadingLabel,
    'data-label-load-error': loadErrorLabel,
    'data-label-playlist': playlistLabelTemplate,
    'data-label-unknown-artist': unknownArtist,
  });

  const audioAttrs = attrs({
    'data-music-audio': true,
    preload: 'metadata',
    src: first?.url,
    hidden: true,
  });

  const coverAttrs = attrs({
    class: 'a-music-cover-img',
    src: cover,
    alt: '',
    width: 120,
    height: 120,
    decoding: 'async',
    hidden: !cover,
  });

  const artistMarkup = `<span class="a-music-sep" aria-hidden="true"${artist ? '' : ' hidden'}>-</span><span class="a-music-artist" data-music-artist>${escapeHtml(artist)}</span>`;

  const progressAttrs = attrs({
    class: 'a-music-progress',
    'data-music-progress': true,
    role: 'slider',
    tabindex: pending ? -1 : 0,
    'aria-label': translate('music.progress'),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': 0,
    'aria-valuetext': '00:00 / --:--',
    'aria-disabled': pending ? 'true' : undefined,
  });

  const toggleAttrs = attrs({
    class: 'a-music-toggle',
    type: 'button',
    'data-music-toggle': true,
    'aria-expanded': playlistExpand ? 'true' : 'false',
    'aria-controls': panelId,
    disabled: pending,
  });

  const panelAttrs = attrs({
    class: 'a-music-panel',
    'data-music-panel': true,
    id: panelId,
    inert: !playlistExpand,
  });

  return `<section${rootAttrs}><audio${audioAttrs}></audio><div class="a-music-main"><div class="a-music-cover"><img${coverAttrs} /><span class="a-music-cover-fallback"${cover ? ' hidden' : ''} aria-hidden="true">${iconSvg('i-music', 'a-ico a-music-cover-ico')}</span></div><div class="a-music-info"><div class="a-music-titles"><div class="a-music-heading"><span class="a-music-title" data-music-title>${escapeHtml(title)}</span>${artistMarkup}</div><div class="a-music-lyric" data-music-lyric data-empty="true"><span class="a-music-lyric-track" data-music-lyric-track><span class="a-music-lyric-line" data-music-lyric-line></span><span class="a-music-lyric-line" data-music-lyric-line aria-hidden="true"></span></span></div></div><div class="a-music-progress-block"><div${progressAttrs}><span class="a-music-progress-rail"><span class="a-music-progress-fill" data-music-fill></span></span></div><div class="a-music-times"><span data-music-current>00:00</span><span data-music-duration>--:--</span></div><p class="a-music-status" data-music-status role="status" aria-live="polite" hidden></p></div></div><div class="a-music-controls"><button class="a-music-btn" type="button" data-music-prev aria-label="${escapeHtml(translate('music.previous'))}"${pending ? ' disabled' : ''}>${iconSvg('i-prev')}</button><button class="a-music-play" type="button" data-music-play aria-label="${escapeHtml(translate('music.play'))}"${pending ? ' disabled' : ''}>${iconSvg('i-play', 'a-ico a-music-ico-play')}${iconSvg('i-pause', 'a-ico a-music-ico-pause')}</button><button class="a-music-btn" type="button" data-music-next aria-label="${escapeHtml(translate('music.next'))}"${pending ? ' disabled' : ''}>${iconSvg('i-next')}</button></div></div><div class="a-music-list"><button${toggleAttrs}><span class="a-music-toggle-label">${iconSvg('i-music', 'a-ico a-music-toggle-ico')}<span data-music-playlist-count>${escapeHtml(playlistLabel)}</span></span>${iconSvg('i-chevron-down', 'a-ico a-music-chev')}</button><div${panelAttrs}><div class="a-music-panel-inner"><ol class="a-music-tracks">${trackItems}</ol></div></div></div></section>`;
}
