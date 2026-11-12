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
  });
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function createFrame(provider: Provider, id: string, autoplay: boolean, title: string): HTMLIFrameElement {
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
      : 'autoplay; picture-in-picture; encrypted-media';
  return iframe;
}

function mount(figure: HTMLElement, provider: Provider, id: string): void {
  if (figure.querySelector('iframe') || figure.dataset.embedState) return;
  const iframe = createFrame(provider, id, false, figure.dataset.embedTitle ?? '');
  // 封面只是加载前的占位：iframe 建好后立即移除，直接露出平台播放器。
  figure.replaceChildren(iframe);
  figure.dataset.embedState = 'ready';
}

function play(figure: HTMLElement, facade: HTMLElement, provider: Provider, id: string): void {
  const iframe = createFrame(provider, id, true, figure.dataset.embedTitle ?? '');
  facade.replaceWith(iframe);
  figure.dataset.embedState = 'playing';
  iframe.focus();
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

/** 页面加载后挂载 iframe 并移除封面；autoload="false" 的图仍等点击后才创建。 */
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
    if (isProvider(provider) && id) mount(figure, provider, id);
  }
}
