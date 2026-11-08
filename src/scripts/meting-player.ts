/**
 * 客户端 Meting 播放器的数据填充。
 *
 * 构建期只输出 `MusicPlayer` 空壳和 `data-meting-source`；这里在浏览器里请求
 * Meting-API，把曲目写进现有播放器 DOM，然后复用 `music-player.ts` 的交互。
 */

import { createMetingClient } from '../lib/meting-browser';
import type { MetingClientSource, MetingPlayerType, MetingQuery, MetingTrack } from '../lib/meting-core';
import { initMusicPlayers } from './music-player';

interface PlayerSource extends MetingClientSource {
  query: MetingQuery & { type: MetingPlayerType };
}

function label(root: HTMLElement, key: string, fallback: string): string {
  const value = root.dataset[key]?.trim();
  return value || fallback;
}

function readSource(root: HTMLElement): PlayerSource | null {
  const raw = root.dataset.metingSource;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlayerSource;
    if (!parsed?.query?.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setStatus(root: HTMLElement, text: string): void {
  const status = root.querySelector<HTMLElement>('[data-music-status]');
  if (!status) return;
  status.textContent = text;
  status.hidden = !text;
}

function setTitle(root: HTMLElement, title: string): void {
  const titleEl = root.querySelector<HTMLElement>('[data-music-title]');
  if (titleEl) titleEl.textContent = title;
  const artistEl = root.querySelector<HTMLElement>('[data-music-artist]');
  if (artistEl) artistEl.textContent = '';
}

function createTrackItem(track: MetingTrack, index: number, unknownArtist: string): HTMLLIElement {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `a-music-track${index === 0 ? ' is-current' : ''}`;
  button.dataset.musicTrack = '';
  button.dataset.url = track.url;
  if (track.cover) button.dataset.cover = track.cover;
  if (track.lrc) button.dataset.lrc = track.lrc;
  if (index === 0) button.setAttribute('aria-current', 'true');

  const indexEl = document.createElement('span');
  indexEl.className = 'a-music-track-index';
  indexEl.setAttribute('aria-hidden', 'true');

  const numberEl = document.createElement('span');
  numberEl.className = 'a-music-track-num';
  numberEl.textContent = String(index + 1).padStart(2, '0');

  const equalizer = document.createElement('span');
  equalizer.className = 'a-music-eq';
  equalizer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i += 1) equalizer.append(document.createElement('i'));

  indexEl.append(numberEl, equalizer);

  const textEl = document.createElement('span');
  textEl.className = 'a-music-track-text';

  const nameEl = document.createElement('span');
  nameEl.className = 'a-music-track-name';
  nameEl.textContent = track.name;

  const artistEl = document.createElement('span');
  artistEl.className = 'a-music-track-artist';
  artistEl.textContent = track.artist || unknownArtist;

  textEl.append(nameEl, artistEl);

  const timeEl = document.createElement('span');
  timeEl.className = 'a-music-track-time';
  timeEl.dataset.musicTrackTime = '';
  timeEl.textContent = '--:--';

  button.append(indexEl, textEl, timeEl);
  item.append(button);
  return item;
}

function fillPlayer(root: HTMLElement, tracks: MetingTrack[]): void {
  const list = root.querySelector<HTMLOListElement>('ol.a-music-tracks');
  if (!list) throw new Error('[daybook:meting] 缺少曲目列表容器');

  const unknownArtist = label(root, 'labelUnknownArtist', 'Unknown artist');
  list.replaceChildren(...tracks.map((track, index) => createTrackItem(track, index, unknownArtist)));

  root.dataset.single = tracks.length === 1 ? 'true' : 'false';
  delete root.dataset.metingPending;
  root.removeAttribute('aria-busy');

  const count = root.querySelector<HTMLElement>('[data-music-playlist-count]');
  if (count) {
    const template = label(root, 'labelPlaylist', 'Playlist · {count} songs');
    count.textContent = template.replace('{count}', String(tracks.length));
  }

  const artistEl = root.querySelector<HTMLElement>('[data-music-artist]');
  if (artistEl && !root.querySelector('.a-music-sep')) {
    const separator = document.createElement('span');
    separator.className = 'a-music-sep';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '-';
    artistEl.before(separator);
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    '[data-music-play], [data-music-prev], [data-music-next], [data-music-toggle]',
  )) {
    button.disabled = false;
  }

  const progress = root.querySelector<HTMLElement>('[data-music-progress]');
  progress?.setAttribute('tabindex', '0');
  progress?.removeAttribute('aria-disabled');
  setStatus(root, '');
  initMusicPlayers();
}

function fail(root: HTMLElement, message: string): void {
  delete root.dataset.metingPending;
  root.removeAttribute('aria-busy');
  root.dataset.metingError = 'true';
  setTitle(root, label(root, 'labelLoadError', 'Could not load music'));
  setStatus(root, message);
}

async function initPlayer(root: HTMLElement): Promise<void> {
  if (root.dataset.metingReady === 'true') return;
  root.dataset.metingReady = 'true';

  const source = readSource(root);
  if (!source) {
    fail(root, label(root, 'labelLoadError', 'Could not load music'));
    return;
  }

  try {
    const client = createMetingClient({ api: source.api, timeout: source.timeout });
    const result = await client.fetchMusic(source.query);
    const tracks = Array.isArray(result) ? result : [result];

    if (tracks.length === 0) {
      throw new Error(`type=${source.query.type} 没有返回可播放的曲目`);
    }

    const missing = tracks.find((track) => !track.url);
    if (missing) {
      throw new Error(`曲目「${missing.name || '未知'}」没有可播放地址`);
    }

    fillPlayer(root, tracks);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[daybook:meting] 客户端加载失败：${message}`);
    fail(root, label(root, 'labelLoadError', 'Could not load music'));
  }
}

/** 初始化页面上所有尚未填充的客户端播放器。 */
export function initMetingPlayers(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-meting-source]')) {
    void initPlayer(root);
  }
}
