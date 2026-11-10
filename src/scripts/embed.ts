let bound = false;

function youtubeUrl(id: string): string {
  const params = new URLSearchParams({ autoplay: '1', rel: '0' });
  return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?' + params.toString();
}

function bilibiliUrl(id: string): string {
  const params = new URLSearchParams({
    isOutside: 'true',
    bvid: id,
    p: '1',
    autoplay: '1',
    muted: '0',
  });
  return 'https://player.bilibili.com/player.html?' + params.toString();
}

function createFrame(figure: HTMLElement, provider: string, id: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.className = 'a-md-embed-frame';
  iframe.src = provider === 'youtube' ? youtubeUrl(id) : bilibiliUrl(id);
  iframe.title = figure.dataset.embedTitle || (provider === 'youtube' ? 'YouTube' : 'Bilibili');
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  iframe.allow =
    provider === 'youtube'
      ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      : 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  return iframe;
}

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) return;
  const facade = target.closest<HTMLElement>('[data-embed-facade]');
  if (!facade) return;

  const figure = facade.closest<HTMLElement>('[data-embed]');
  if (!figure) return;
  const provider = figure.dataset.embedProvider;
  const id = figure.dataset.embedId;
  if (!provider || !id || (provider !== 'youtube' && provider !== 'bilibili')) return;

  event.preventDefault();
  const iframe = createFrame(figure, provider, id);
  facade.replaceWith(iframe);
  figure.dataset.embedState = 'playing';
  iframe.focus();
}

function watchPoster(figure: HTMLElement): void {
  const poster = figure.querySelector<HTMLImageElement>('.a-md-embed-poster');
  if (!poster) return;
  const fail = (): void => {
    figure.dataset.embedPoster = 'error';
    poster.hidden = true;
  };
  if (poster.complete && poster.naturalWidth === 0) fail();
  else poster.addEventListener('error', fail, { once: true });
}

/** 点击封面后才创建 iframe；按 Esc 离开时不会留下自动播放的隐藏播放器。 */
export function initEmbeds(): void {
  if (!bound) {
    bound = true;
    document.addEventListener('click', onClick);
  }
  for (const figure of document.querySelectorAll<HTMLElement>('[data-embed]')) watchPoster(figure);
}
