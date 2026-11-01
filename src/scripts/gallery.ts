import { PUBLIC_LIGHTGALLERY_LICENSE_KEY } from 'astro:env/client';
import type { GalleryItem, LightGallery } from 'lightgallery';
import lightGallery from 'lightgallery';
import lightGalleryStyles from 'lightgallery/css/lightgallery-bundle.css?inline';
import lgAutoplay from 'lightgallery/plugins/autoplay';
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import { readClientMessages } from './client-messages';

/**
 * 页面级图片画廊。
 *
 * 把当前页正文里的 Markdown 图片归为一组，点击后交给 lightGallery v3 放大。
 * 模块由 `client.ts` 在页面存在正文图片时按需加载，lightGallery 的 JS 与样式
 * 因此不会进入无图页面的关键路径。
 */

/** 正文图片选择器：与 `src/styles/app.css` 里的指针提示保持一致。 */
const GALLERY_SELECTOR = ':is(.a-prose, .a-entry-text) img.a-img:not(a img)';

/** 自建的缩略图开关按钮。lightGallery 内置开关要求 `allowMediaOverlap`，会压住图注。 */
const THUMB_TOGGLE_CLASS = 'lg-toggle-thumbs';

/**
 * 工具栏按钮的视觉顺序（左 → 右）。
 *
 * 官方样式是 `.lg-toolbar .lg-icon { float: right }`，DOM 里越靠前越靠右，
 * 所以按「从右往左」依次 append 就能得到：缩放 · 缩略图 · 播放 · 全屏 · 下载 · 关闭。
 */
const TOOLBAR_ORDER = [
  '.lg-close',
  '.lg-more',
  '.lg-download',
  '.lg-fullscreen',
  '.lg-autoplay-button',
  `.${THUMB_TOGGLE_CLASS}`,
  '[id^="lg-actual-size"]',
];

/** 库把这几项标成私有：只在这里窄断言使用，可选的调用前都做 typeof 守卫。 */
type GalleryInternals = {
  lgOpened: boolean;
  index: number;
  defaultIcons?: Record<string, string>;
  getMediaContainerPosition?: () => { top: number; bottom: number };
  setMediaContainerPosition?: (top: number, bottom: number) => void;
  updateCurrentImageSize?: (index: number) => void;
};

function asInternals(gallery: LightGallery): GalleryInternals {
  return gallery as unknown as GalleryInternals;
}

const messages = readClientMessages();

let instance: LightGallery | null = null;
let bound = false;
let thumbsHidden = false;

/** 已完成键盘装饰的图片；换页会重建 DOM，WeakSet 不会留住旧节点。 */
const decorated = new WeakSet<HTMLImageElement>();

/** 首次用到时再插入 lightGallery 样式（`?inline` 由 Vite 处理相对资源）。 */
function ensureStyles(): void {
  if (document.querySelector('style[data-gallery-style]')) return;
  const style = document.createElement('style');
  style.dataset.galleryStyle = '';
  style.textContent = lightGalleryStyles;
  document.head.append(style);
}

function collectImages(): HTMLImageElement[] {
  return Array.from(document.querySelectorAll<HTMLImageElement>(GALLERY_SELECTOR));
}

/** alt 当纯文本用：lightGallery 的图注走 innerHTML，先转义再加进 `subHtml`。 */
function escapeHtml(value: string): string {
  const holder = document.createElement('span');
  holder.textContent = value;
  return holder.innerHTML;
}

function toGalleryItem(img: HTMLImageElement): GalleryItem {
  const src = img.currentSrc || img.src;
  const alt = img.alt.trim();
  const item: GalleryItem = { src, thumb: src, alt };
  if (alt) item.subHtml = escapeHtml(alt);
  // 有内在尺寸才能从缩略图位置飞入；图片还没加载完就退化成淡入。
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    item.lgSize = `${img.naturalWidth}-${img.naturalHeight}`;
  }
  return item;
}

function applyThumbsHidden(): void {
  const outer = document.querySelector<HTMLElement>('.lg-container .lg-outer');
  if (!outer) return;
  outer.classList.toggle('lg-thumbs-hidden', thumbsHidden);
  outer.querySelector<HTMLElement>(`.${THUMB_TOGGLE_CLASS}`)?.setAttribute('aria-pressed', String(!thumbsHidden));

  const gallery = instance && asInternals(instance);
  if (!gallery?.lgOpened) return;
  // 只 display:none 不会让图片重新撑满：把新的内容区上下留白再量一次当前图。
  const { top, bottom } = gallery.getMediaContainerPosition?.() ?? { top: 0, bottom: 0 };
  gallery.setMediaContainerPosition?.(top, bottom);
  gallery.updateCurrentImageSize?.(gallery.index);
}

function setThumbsHidden(hidden: boolean): void {
  thumbsHidden = hidden;
  applyThumbsHidden();
}

function buildThumbToggle(gallery: LightGallery): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `lg-icon lg-icon-custom ${THUMB_TOGGLE_CLASS}`;
  toggle.setAttribute('aria-label', messages.lightbox.thumbnails);
  toggle.setAttribute('aria-pressed', String(!thumbsHidden));
  // 图标是库内置的 SVG 字符串（非用户内容），与官方按钮保持同一份。
  const icon = asInternals(gallery).defaultIcons?.toggleThumbnails ?? '';
  toggle.innerHTML = `<span class="lg-ci lg-ci-toggle-thumbnails" aria-hidden="true">${icon}</span>`;
  toggle.addEventListener('click', () => setThumbsHidden(!thumbsHidden));
  return toggle;
}

function onGalleryInit(event: Event): void {
  const gallery = (event as CustomEvent<{ instance: LightGallery }>).detail.instance;
  const toolbar = document.querySelector<HTMLElement>('.lg-container .lg-toolbar');
  if (!toolbar) return;
  toolbar.append(buildThumbToggle(gallery));
  for (const selector of TOOLBAR_ORDER) {
    const button = toolbar.querySelector<HTMLElement>(selector);
    if (button) toolbar.append(button);
  }
  applyThumbsHidden();
}

function createGallery(images: HTMLImageElement[]): LightGallery {
  // `lgInit` 在构造函数内部同步派发，监听必须先挂上。
  document.body.addEventListener('lgInit', onGalleryInit, { once: true });
  const gallery = lightGallery(document.body, {
    plugins: [lgZoom, lgThumbnail, lgFullscreen, lgAutoplay],
    // 授权 key 来自 .env 的 PUBLIC_LIGHTGALLERY_LICENSE_KEY（未设置时用官方临时评估
    // key：功能全开，只在控制台留一条 not-for-production 警告）。
    // TODO 上线前换成申请到的正式 key（GPLv3 项目可免费申请，key 以 LIG 开头）。
    licenseKey: PUBLIC_LIGHTGALLERY_LICENSE_KEY,
    dynamic: true,
    dynamicEl: images.map(toGalleryItem),
    // 正文图片本来就已加载（切图命中缓存），不必预取邻图；关掉也能避免关闭后
    // 残留的预加载回调用已清空的 slide 去取节点。
    preload: 0,
    speed: 300,
    loop: true,
    hideScrollbar: true,
    counter: true,
    download: true,
    // 缩略图开关用上面的自建按钮，关掉内置的那套。
    toggleThumb: false,
    thumbWidth: 48,
    thumbHeight: '64px',
    thumbMargin: 6,
    alignThumbnails: 'middle',
    currentPagerPosition: 'middle',
    slideShowAutoplay: false,
    slideShowInterval: 4000,
    progressBar: true,
    // mobileSettings 不合并默认值：移动端同样保留这组控件。
    mobileSettings: {
      controls: true,
      showCloseIcon: true,
      download: true,
      showGestureButtons: true,
    },
    strings: {
      closeGallery: messages.lightbox.close,
      previousSlide: messages.lightbox.prev,
      nextSlide: messages.lightbox.next,
      viewActualSize: messages.lightbox.actualSize,
      toggleThumbnails: messages.lightbox.thumbnails,
      toggleAutoplay: messages.lightbox.autoplay,
      toggleFullscreen: messages.lightbox.fullscreen,
      download: messages.lightbox.download,
      galleryLabel: messages.lightbox.label,
      moreOptions: messages.lightbox.more,
      slideAnnouncement: messages.lightbox.slideCounter,
      mediaLoadingFailed: messages.imageFailed,
    },
  });
  instance = gallery;
  return gallery;
}

function openAt(img: HTMLImageElement): void {
  const images = collectImages();
  let gallery = instance;
  if (gallery) {
    // 解锁后的加密正文可能新增图片：每次打开前同步一份最新条目。
    gallery.refresh(images.map(toGalleryItem));
  } else {
    gallery = createGallery(images);
  }
  const toggle = document.querySelector<HTMLElement>(`.lg-container .${THUMB_TOGGLE_CLASS}`);
  if (toggle) toggle.hidden = images.length < 2;
  gallery.openGallery(Math.max(0, images.indexOf(img)), img);
  applyThumbsHidden();
}

function decorateImages(): void {
  document.querySelectorAll<HTMLImageElement>(GALLERY_SELECTOR).forEach((img) => {
    if (decorated.has(img)) return;
    decorated.add(img);
    // 空 alt 的装饰图不进入键盘序列（避免无可读名称的按钮），但仍可鼠标放大。
    if (!img.alt.trim()) return;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-haspopup', 'dialog');
  });
}

/**
 * 初始化画廊（幂等）：补键盘语义，并在页面确实有正文图片时注入样式与点击委托。
 * 首屏会调用两次，换页与加密正文解锁后还会再调用，所以每一步都必须可重复执行。
 */
export function initGallery(): void {
  decorateImages();
  if (!document.querySelector(GALLERY_SELECTOR)) return;
  ensureStyles();
  if (bound) return;
  document.addEventListener('click', onGalleryClick);
  bound = true;
}

function onGalleryClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (!target.matches(GALLERY_SELECTOR)) return;
  event.preventDefault();
  openAt(target);
}

function onGalleryKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.getAttribute('role') !== 'button') return;
  if (!target.matches(GALLERY_SELECTOR)) return;
  event.preventDefault();
  target.click();
}

document.addEventListener('keydown', onGalleryKeydown);

/**
 * 换页前收尾：换页会复用 <html>/<body>，放大层、滚动锁与内联留白都必须自己清掉。
 * `destroy()` 只有在 `closeGallery()` 返回 0 时才会同步移除容器；否则它把清理排进
 * setTimeout，而那时容器已被换页移走，库里的 remove()/预加载回调会命中 null。
 * 所以先关掉预加载并置 `lgOpened = false`，让它走同步分支，再补关掉被跳过的滚动锁。
 */
function teardownGallery(): void {
  if (instance) {
    instance.settings.preload = 0;
    asInternals(instance).lgOpened = false;
    instance.destroy();
    instance = null;
  } else {
    document.querySelector('.lg-container')?.remove();
  }
  thumbsHidden = false;
  document.documentElement.classList.remove('lg-on');
  document.body.classList.remove('lg-overlay-open');
  document.body.style.paddingRight = '';
}

document.addEventListener('astro:before-swap', teardownGallery);
