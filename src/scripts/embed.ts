let bound = false;
const watchedPosters = new WeakSet<HTMLElement>();

type Provider = 'youtube' | 'bilibili';

function isProvider(value: string | undefined): value is Provider {
  return value === 'youtube' || value === 'bilibili';
}

function youtubeUrl(id: string, autoplay: boolean): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    enablejsapi: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
}

function bilibiliUrl(id: string, autoplay: boolean): string {
  const params = new URLSearchParams({
    isOutside: 'true',
    bvid: id,
    p: '1',
    autoplay: autoplay ? '1' : '0',
    muted: autoplay ? '0' : '1',
  });
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function createFrame(provider: Provider, id: string, autoplay: boolean, preload: boolean, title: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.className = 'a-md-embed-frame';
  iframe.title = title;
  iframe.src = provider === 'youtube' ? youtubeUrl(id, autoplay) : bilibiliUrl(id, autoplay);
  iframe.loading = 'eager';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  iframe.allow =
    provider === 'youtube'
      ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      : 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  if (preload) {
    // 预加载的 iframe 藏在前景封面之后，先不进入 Tab 顺序与读屏树。
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
  }
  return iframe;
}

function preload(figure: HTMLElement, provider: Provider, id: string): void {
  if (figure.querySelector('iframe') || figure.dataset.embedState) return;
  const iframe = createFrame(provider, id, false, true, figure.dataset.embedTitle ?? '');
  // 插到 facade 之前：同为绝对定位时，后出现的 facade 会盖在上面。
  figure.prepend(iframe);
  figure.dataset.embedState = 'ready';
}

function play(figure: HTMLElement, facade: HTMLElement, provider: Provider, id: string): void {
  const iframe = figure.querySelector<HTMLIFrameElement>('iframe');
  if (iframe) {
    iframe.removeAttribute('aria-hidden');
    iframe.tabIndex = 0;
    // 预加载地址不带 autoplay；点击后用同一 iframe 切到自动播放，避免留下静音的隐藏播放器。
    iframe.src = provider === 'youtube' ? youtubeUrl(id, true) : bilibiliUrl(id, true);
    facade.remove();
    figure.dataset.embedState = 'playing';
    iframe.focus();
    return;
  }

  const created = createFrame(provider, id, true, false, figure.dataset.embedTitle ?? '');
  facade.replaceWith(created);
  figure.dataset.embedState = 'playing';
  created.focus();
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
  const provider = figure?.dataset.embedProvider;
  const id = figure?.dataset.embedId;
  if (!figure || !isProvider(provider) || !id) return;

  event.preventDefault();
  play(figure, facade, provider, id);
}

function watchPoster(figure: HTMLElement): void {
  if (watchedPosters.has(figure)) return;
  watchedPosters.add(figure);
  const poster = figure.querySelector<HTMLImageElement>('.a-md-embed-poster');
  if (!poster) return;
  const fail = (): void => {
    figure.dataset.embedPoster = 'error';
    poster.hidden = true;
  };
  if (poster.complete && poster.naturalWidth === 0) fail();
  else poster.addEventListener('error', fail, { once: true });
}

/** 页面加载后预先创建 iframe；autoload="false" 的图仍等点击后才创建。 */
export function initEmbeds(): void {
  if (!bound) {
    bound = true;
    document.addEventListener('click', onClick);
  }
  for (const figure of document.querySelectorAll<HTMLElement>('[data-embed]')) {
    watchPoster(figure);
    if (figure.dataset.embedAutoload === 'false') continue;
    const provider = figure.dataset.embedProvider;
    const id = figure.dataset.embedId;
    if (isProvider(provider) && id) preload(figure, provider, id);
  }
}
