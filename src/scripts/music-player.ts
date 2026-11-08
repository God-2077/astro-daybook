import { formatTime, type LyricLine, parseLrc } from '../lib/music';

interface TrackState {
  el: HTMLButtonElement;
  url: string;
  cover: string;
  lrc: string;
  name: string;
  artist: string;
  timeEl: HTMLElement | null;
  duration: number | null;
}

function label(root: HTMLElement, key: string, fallback: string): string {
  const value = root.dataset[key]?.trim();
  return value || fallback;
}

function initPlayer(root: HTMLElement): void {
  if (root.dataset.musicReady === 'true') return;

  const audio = root.querySelector<HTMLAudioElement>('[data-music-audio]');
  const playBtn = root.querySelector<HTMLButtonElement>('[data-music-play]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-music-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-music-next]');
  const progress = root.querySelector<HTMLElement>('[data-music-progress]');
  const fill = root.querySelector<HTMLElement>('[data-music-fill]');
  const currentEl = root.querySelector<HTMLElement>('[data-music-current]');
  const durationEl = root.querySelector<HTMLElement>('[data-music-duration]');
  const titleEl = root.querySelector<HTMLElement>('[data-music-title]');
  const artistEl = root.querySelector<HTMLElement>('[data-music-artist]');
  const coverImg = root.querySelector<HTMLImageElement>('.a-music-cover-img');
  const coverFallback = root.querySelector<HTMLElement>('.a-music-cover-fallback');
  const lyricEl = root.querySelector<HTMLElement>('[data-music-lyric]');
  const lyricTrack = lyricEl?.querySelector<HTMLElement>('[data-music-lyric-track]') ?? null;
  const lyricLines = lyricEl ? [...lyricEl.querySelectorAll<HTMLElement>('[data-music-lyric-line]')] : [];
  const statusEl = root.querySelector<HTMLElement>('[data-music-status]');
  const panel = root.querySelector<HTMLElement>('[data-music-panel]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-music-toggle]');
  const trackEls = [...root.querySelectorAll<HTMLButtonElement>('[data-music-track]')];

  if (
    !audio ||
    !playBtn ||
    !prevBtn ||
    !nextBtn ||
    !progress ||
    !fill ||
    !currentEl ||
    !durationEl ||
    !titleEl ||
    !artistEl ||
    trackEls.length === 0
  ) {
    return;
  }

  root.dataset.musicReady = 'true';

  const labels = {
    play: label(root, 'labelPlay', 'Play'),
    pause: label(root, 'labelPause', 'Pause'),
    error: label(root, 'labelError', 'Could not load audio'),
    unknownArtist: label(root, 'labelUnknownArtist', 'Unknown artist'),
  };

  const tracks: TrackState[] = trackEls.map((el) => ({
    el,
    url: el.dataset.url?.trim() ?? '',
    cover: el.dataset.cover?.trim() ?? '',
    lrc: el.dataset.lrc?.trim() ?? '',
    name: el.querySelector<HTMLElement>('.a-music-track-name')?.textContent?.trim() ?? '',
    artist: el.querySelector<HTMLElement>('.a-music-track-artist')?.textContent?.trim() ?? '',
    timeEl: el.querySelector<HTMLElement>('[data-music-track-time]'),
    duration: null,
  }));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const durations: Array<number | null> = tracks.map(() => null);
  const lyricCache = new Map<string, LyricLine[]>();

  let current = Math.max(
    0,
    tracks.findIndex((track) => track.el.classList.contains('is-current')),
  );
  let lyrics: LyricLine[] = [];
  let lyricRequest = 0;
  let lyricText = '';
  let lyricAnimating = false;
  let lyricPending: string | null = null;
  let lyricTimer = 0;
  let probing = false;

  const setPlayingUI = (playing: boolean): void => {
    root.dataset.playing = playing ? 'true' : 'false';
    playBtn.setAttribute('aria-label', playing ? labels.pause : labels.play);
  };

  const setProgress = (ratio: number): void => {
    const value = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
    fill.style.transform = `scaleX(${value})`;
    progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  };

  const setLyricVisible = (visible: boolean): void => {
    if (!lyricEl) return;
    if (visible) lyricEl.removeAttribute('data-empty');
    else lyricEl.setAttribute('data-empty', 'true');
  };

  const resetLyric = (): void => {
    if (!lyricEl) return;
    if (lyricTimer) {
      window.clearTimeout(lyricTimer);
      lyricTimer = 0;
    }
    lyricEl.classList.remove('is-scrolling', 'is-jumping');
    setLyricVisible(false);
    for (const line of lyricLines) line.textContent = '';
    lyricText = '';
    lyricAnimating = false;
    lyricPending = null;
  };

  const setLyricLine = (text: string): void => {
    if (!lyricEl) return;
    if (!text) {
      resetLyric();
      return;
    }
    if (text === lyricText) {
      setLyricVisible(true);
      return;
    }
    if (!lyricTrack || lyricLines.length < 2) {
      lyricEl.textContent = text;
      setLyricVisible(true);
      lyricText = text;
      return;
    }
    const firstLine = lyricLines[0];
    const secondLine = lyricLines[1];
    if (!firstLine || !secondLine) return;

    if (!lyricText) {
      firstLine.textContent = text;
      secondLine.textContent = '';
      setLyricVisible(true);
      lyricText = text;
      return;
    }
    if (lyricAnimating) {
      lyricPending = text;
      return;
    }
    if (reduceMotion.matches) {
      firstLine.textContent = text;
      secondLine.textContent = '';
      setLyricVisible(true);
      lyricText = text;
      return;
    }

    secondLine.textContent = text;
    setLyricVisible(true);
    void lyricTrack.offsetHeight;
    lyricEl.classList.add('is-scrolling');
    lyricAnimating = true;
    lyricTimer = window.setTimeout(() => {
      lyricEl.classList.add('is-jumping');
      firstLine.textContent = text;
      secondLine.textContent = '';
      lyricText = text;
      lyricEl.classList.remove('is-scrolling');
      void lyricTrack.offsetHeight;
      lyricEl.classList.remove('is-jumping');
      lyricAnimating = false;
      lyricTimer = 0;
      const pending = lyricPending;
      lyricPending = null;
      if (pending && pending !== lyricText) setLyricLine(pending);
    }, 240);
  };

  const updateLyric = (time: number): void => {
    if (!lyricEl) return;
    if (lyrics.length === 0) {
      setLyricLine('');
      return;
    }
    let low = 0;
    let high = lyrics.length - 1;
    let found = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const line = lyrics[middle];
      if (!line) break;
      if (line.time <= time) {
        found = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    setLyricLine(found >= 0 ? (lyrics[found]?.text ?? '') : '');
  };

  const update = (): void => {
    const known = durations[current];
    const mediaDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (known ?? 0);
    if (mediaDuration > 0) {
      durations[current] = mediaDuration;
      const currentTrack = tracks[current];
      if (currentTrack?.timeEl) currentTrack.timeEl.textContent = formatTime(mediaDuration);
      durationEl.textContent = formatTime(mediaDuration);
    }
    const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    currentEl.textContent = formatTime(time);
    setProgress(mediaDuration > 0 ? time / mediaDuration : 0);
    progress.setAttribute('aria-valuetext', `${formatTime(time)} / ${mediaDuration > 0 ? formatTime(mediaDuration) : '--:--'}`);
    updateLyric(time);
  };

  const clearError = (): void => {
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = '';
  };

  const showError = (): void => {
    if (statusEl) {
      statusEl.textContent = labels.error;
      statusEl.hidden = false;
    }
    setPlayingUI(false);
  };

  const pauseOthers = (): void => {
    for (const other of document.querySelectorAll<HTMLAudioElement>('[data-music-audio]')) {
      if (other !== audio) other.pause();
    }
  };

  const probeDurations = async (): Promise<void> => {
    if (probing) return;
    probing = true;
    try {
      for (const [index, track] of tracks.entries()) {
        if (durations[index] !== null || !track.url) continue;
        await new Promise<void>((resolve) => {
          const probe = new Audio();
          probe.preload = 'metadata';
          let settled = false;
          const done = (): void => {
            if (settled) return;
            settled = true;
            probe.removeAttribute('src');
            probe.load();
            resolve();
          };
          probe.addEventListener(
            'loadedmetadata',
            () => {
              if (Number.isFinite(probe.duration) && probe.duration > 0) {
                durations[index] = probe.duration;
                if (track.timeEl) track.timeEl.textContent = formatTime(probe.duration);
                if (index === current) update();
              }
              done();
            },
            { once: true },
          );
          probe.addEventListener('error', done, { once: true });
          probe.src = track.url;
          probe.load();
        });
      }
    } finally {
      probing = false;
    }
  };

  const loadLyrics = (index: number): void => {
    lyrics = [];
    resetLyric();
    const source = tracks[index]?.lrc;
    if (!source) return;

    const cached = lyricCache.get(source);
    if (cached) {
      lyrics = cached;
      updateLyric(audio.currentTime);
      return;
    }

    const request = ++lyricRequest;
    void fetch(source, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        const parsed = parseLrc(text);
        lyricCache.set(source, parsed);
        if (request === lyricRequest && index === current) {
          lyrics = parsed;
          updateLyric(audio.currentTime);
        }
      })
      .catch(() => {
        if (request === lyricRequest) {
          lyrics = [];
          resetLyric();
        }
      });
  };

  const setOpen = (open: boolean): void => {
    root.dataset.open = open ? 'true' : 'false';
    if (panel) panel.inert = !open;
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    if (open) void probeDurations();
  };

  const setTrack = (index: number, autoplay: boolean): void => {
    const track = tracks[index];
    if (!track) return;
    current = index;

    for (const [i, item] of tracks.entries()) {
      const active = i === index;
      item.el.classList.toggle('is-current', active);
      if (active) item.el.setAttribute('aria-current', 'true');
      else item.el.removeAttribute('aria-current');
    }

    titleEl.textContent = track.name;
    artistEl.textContent = track.artist || labels.unknownArtist;

    if (track.cover && coverImg) {
      coverImg.src = track.cover;
      coverImg.hidden = false;
      if (coverFallback) coverFallback.hidden = true;
    } else if (coverImg) {
      coverImg.hidden = true;
      coverImg.removeAttribute('src');
      if (coverFallback) coverFallback.hidden = false;
    }

    clearError();
    currentEl.textContent = '00:00';
    const known = durations[index];
    const durationText = known !== null && known > 0 ? formatTime(known) : '--:--';
    durationEl.textContent = durationText;
    setProgress(0);
    progress.setAttribute('aria-valuetext', `00:00 / ${durationText}`);

    audio.src = track.url;
    audio.load();
    loadLyrics(index);

    if (autoplay) {
      void audio.play().catch(() => {
        /* 浏览器拒绝自动播放时保持暂停态；加载失败由 error 事件提示。 */
      });
    }
  };

  const seekToClientX = (clientX: number): void => {
    const known = durations[current];
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (known ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) return;
    const rect = progress.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    update();
  };

  if (toggle) {
    toggle.addEventListener('click', () => {
      setOpen(root.dataset.open !== 'true');
    });
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      void audio.play().catch(() => {
        /* 加载失败由 error 事件提示。 */
      });
    } else {
      audio.pause();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      update();
      return;
    }
    setTrack((current - 1 + tracks.length) % tracks.length, true);
  });

  nextBtn.addEventListener('click', () => {
    setTrack((current + 1) % tracks.length, true);
  });

  for (const [index, item] of tracks.entries()) {
    item.el.addEventListener('click', () => {
      if (index === current) {
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      setTrack(index, true);
    });
  }

  progress.addEventListener('click', (event) => {
    seekToClientX(event.clientX);
  });

  progress.addEventListener('keydown', (event) => {
    const known = durations[current];
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (known ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') audio.currentTime = 0;
    else if (event.key === 'End') audio.currentTime = duration;
    else {
      const delta = event.key === 'ArrowLeft' ? -5 : 5;
      audio.currentTime = Math.min(duration, Math.max(0, audio.currentTime + delta));
    }
    update();
  });

  audio.addEventListener('play', () => {
    setPlayingUI(true);
    pauseOthers();
  });

  audio.addEventListener('pause', () => {
    setPlayingUI(false);
  });

  audio.addEventListener('timeupdate', update);

  audio.addEventListener('loadedmetadata', () => {
    clearError();
    update();
  });

  audio.addEventListener('durationchange', update);

  audio.addEventListener('ended', () => {
    if (root.dataset.autoNext === 'true' && current < tracks.length - 1) {
      setTrack(current + 1, true);
      return;
    }
    setPlayingUI(false);
    audio.currentTime = 0;
    update();
  });

  audio.addEventListener('error', showError);

  coverImg?.addEventListener('error', () => {
    coverImg.hidden = true;
    if (coverFallback) coverFallback.hidden = false;
  });

  setPlayingUI(false);
  setTrack(current, false);
  setOpen(root.dataset.open === 'true');
  update();
}

/** 初始化页面上所有尚未绑定过的播放器；ClientRouter 换页后可重复调用。 */
export function initMusicPlayers(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-music]')) {
    initPlayer(root);
  }
}
