import { format } from '../i18n/format';
import { readClientMessages } from './client-messages';

const messages = readClientMessages();

const THEME_KEY = 'daybook-theme';
const THEME_COLORS = { light: '#fdfbfb', dark: '#1d1a27' } as const;

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** 把偏好解析成实际明暗；`system` 看当前系统设置。 */
function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference;
  return systemPrefersDark() ? 'dark' : 'light';
}

/**
 * 本次访问的主题偏好：localStorage 里的用户选择优先，其次 `siteConfig.theme`
 * （由 BaseLayout 写到 `<html data-theme-mode>`），最后跟随系统。
 * 与 BaseLayout 的 is:inline 脚本保持同一套规则。
 */
function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* localStorage 不可用时按配置/系统偏好 */
  }
  const mode = document.documentElement.dataset.themeMode;
  if (mode === 'light' || mode === 'dark') return mode;
  return 'system';
}

/** 同步浏览器地址栏/状态栏颜色，避免强制深色时仍是浅色主题色。 */
function syncThemeColor(theme: Theme): void {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', THEME_COLORS[theme]);
  });
}

function applyTheme(preference: ThemePreference): void {
  const theme = resolveTheme(preference);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
  syncThemeColor(theme);
  syncThemeControls();
}

function setTheme(preference: ThemePreference, persist = true): void {
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      /* localStorage 不可用时只影响当前页 */
    }
  }
  applyTheme(preference);
}

function syncThemeControls(): void {
  const preference = readThemePreference();
  const theme = resolveTheme(preference);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-btn]').forEach((button) => {
    button.setAttribute('aria-label', theme === 'dark' ? messages.themeToLight : messages.themeToDark);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-theme-set]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeSet === preference));
  });
}

let themeWatcherBound = false;

/** 只跟随系统一次；用户手动选择 light/dark 后即使系统变化也不改。 */
function setupThemeWatcher(): void {
  if (themeWatcherBound || typeof window.matchMedia !== 'function') return;
  themeWatcherBound = true;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePreference() === 'system') applyTheme('system');
  });
}

/**
 * ClientRouter 换页会用服务端 HTML 覆盖 <html>，运行时加上的 dark class 会丢失。
 * 在交换前把新文档的主题预设好，交换后立即重新套用（不写回 localStorage）。
 */
function prepareNextDocument(event: Event): void {
  const next = (event as Event & { newDocument?: Document }).newDocument;
  if (!next) return;
  const theme = resolveTheme(readThemePreference());
  next.documentElement.classList.toggle('dark', theme === 'dark');
  next.documentElement.dataset.theme = theme;
  next.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', THEME_COLORS[theme]);
  });
}

let loadbarStartTimer: number | undefined;
let loadbarSafetyTimer: number | undefined;
let loadbarResetTimer: number | undefined;
let loadbarActive = false;

function setLoadbarProgress(percent: number): void {
  const bar = document.querySelector<HTMLElement>('#a-loadbar span');
  if (bar) bar.style.width = `${percent}%`;
}

function setPageBusy(busy: boolean): void {
  document.querySelector<HTMLElement>('#main')?.setAttribute('aria-busy', String(busy));
}

function setStatus(text: string): void {
  const status = document.querySelector<HTMLElement>('#a-status');
  if (status) status.textContent = text;
}

function showLoadbar(): void {
  loadbarActive = true;
  document.documentElement.dataset.navLoading = 'true';
  setPageBusy(true);
  setStatus(messages.loading);
  setLoadbarProgress(8);
  window.requestAnimationFrame(() => {
    if (loadbarActive) setLoadbarProgress(72);
  });
}

/** 站内跳转开始：120ms 内完成则不闪进度条，超过则显示并给足 12s 兜底。 */
function startNavigation(): void {
  window.clearTimeout(loadbarStartTimer);
  window.clearTimeout(loadbarSafetyTimer);
  window.clearTimeout(loadbarResetTimer);
  if (!loadbarActive) {
    loadbarStartTimer = window.setTimeout(showLoadbar, 120);
  } else {
    setPageBusy(true);
    setStatus(messages.loading);
    setLoadbarProgress(8);
    window.requestAnimationFrame(() => {
      if (loadbarActive) setLoadbarProgress(72);
    });
  }
  loadbarSafetyTimer = window.setTimeout(() => finishNavigation(true), 12000);
}

function progressNavigation(percent: number): void {
  if (loadbarActive) setLoadbarProgress(percent);
}

function finishNavigation(timedOut = false): void {
  window.clearTimeout(loadbarStartTimer);
  window.clearTimeout(loadbarSafetyTimer);
  window.clearTimeout(loadbarResetTimer);
  if (!loadbarActive) {
    document.documentElement.removeAttribute('data-nav-loading');
    setPageBusy(false);
    if (timedOut) setLoadbarProgress(0);
    return;
  }
  loadbarActive = false;
  setLoadbarProgress(100);
  setPageBusy(false);
  setStatus(timedOut ? messages.slow : messages.loaded);
  loadbarResetTimer = window.setTimeout(() => {
    document.documentElement.removeAttribute('data-nav-loading');
    setLoadbarProgress(0);
    if (!timedOut) setStatus('');
  }, 260);
}

/** bfcache 恢复等场景强制复位，避免进度条卡住。 */
function resetNavigation(): void {
  window.clearTimeout(loadbarStartTimer);
  window.clearTimeout(loadbarSafetyTimer);
  window.clearTimeout(loadbarResetTimer);
  loadbarActive = false;
  document.documentElement.removeAttribute('data-nav-loading');
  setLoadbarProgress(0);
  setPageBusy(false);
  setStatus('');
}

/** 给正文图片挂骨架状态；已缓存/已加载的直接标记完成，避免闪一下。 */
function setupImages(): void {
  document.querySelectorAll<HTMLImageElement>('.a-frame img').forEach((img) => {
    const frame = img.closest<HTMLElement>('.a-frame');
    if (!frame || frame.dataset.imgBound === 'true') return;
    frame.dataset.imgBound = 'true';

    const markLoaded = () => {
      frame.classList.remove('is-pending');
      frame.classList.add('is-loaded');
    };
    const markError = () => {
      frame.classList.remove('is-pending');
      frame.classList.add('is-error');
      frame.dataset.imgAlt = img.alt || messages.imageFailed;
    };

    if (img.complete) {
      if (img.naturalWidth > 0) markLoaded();
      else markError();
      return;
    }

    frame.classList.add('is-pending');
    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', markError, { once: true });
  });
}

/** 图片放大按需加载：lightGallery 体积较大，页面没有正文图片时不引入。 */
function setupGallery(): void {
  if (!document.querySelector('img.a-img')) return;
  void import('./gallery').then(({ initGallery }) => {
    initGallery();
  });
}

function closeMenus(except?: Element | null): void {
  document.querySelectorAll<HTMLElement>('.a-navmenu').forEach((menu) => {
    if (except && menu === except) return;
    const button = menu.querySelector<HTMLButtonElement>('[data-menu-btn]');
    const panel = menu.querySelector<HTMLElement>('.a-subnav');
    if (!button || !panel) return;
    button.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  });
}

function openDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#a-drawer');
  const toggle = document.querySelector<HTMLButtonElement>('#a-drawer-toggle');
  if (!drawer) return;
  drawer.hidden = false;
  document.body.classList.add('a-drawer-open');
  toggle?.setAttribute('aria-expanded', 'true');
  drawer.querySelector<HTMLButtonElement>('#a-drawer-close')?.focus();
}

function closeDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('#a-drawer');
  const toggle = document.querySelector<HTMLButtonElement>('#a-drawer-toggle');
  if (!drawer) return;
  drawer.hidden = true;
  document.body.classList.remove('a-drawer-open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.focus();
}

let tocObserver: IntersectionObserver | null = null;

function setupToc(): void {
  tocObserver?.disconnect();
  tocObserver = null;

  const links = [...document.querySelectorAll<HTMLAnchorElement>('.a-toc a[href^="#"], .a-toc-m a[href^="#"]')];
  if (links.length === 0) return;

  const byId = new Map<string, HTMLAnchorElement[]>();
  for (const link of links) {
    const id = decodeURIComponent(link.hash.slice(1));
    const list = byId.get(id) ?? [];
    list.push(link);
    byId.set(id, list);
  }

  const headings = [...byId.keys()]
    .map((id) => document.getElementById(id))
    .filter((heading): heading is HTMLElement => Boolean(heading));
  if (headings.length === 0) return;

  const activate = (id: string) => {
    links.forEach((link) => {
      link.removeAttribute('aria-current');
    });
    byId.get(id)?.forEach((link) => {
      link.setAttribute('aria-current', 'true');
    });
  };

  tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const first = visible[0];
      if (first) activate((first.target as HTMLElement).id);
    },
    { rootMargin: '-12% 0px -70% 0px', threshold: [0, 1] },
  );

  headings.forEach((heading) => {
    tocObserver?.observe(heading);
  });
  activate(headings[0]?.id ?? '');
}

/**
 * Locked pages render an empty TOC shell; build it after the article is decrypted.
 * The server-rendered TOC is left alone by checking for existing children.
 * TOC 只列 h2（与构建期 Toc.astro 的规则保持一致）。
 */
function buildLockedToc(): void {
  const prose = document.querySelector<HTMLElement>('.a-detail.is-locked .a-prose');
  if (!prose) return;

  const items = [...prose.querySelectorAll<HTMLElement>('h2[id]')]
    .map((heading) => {
      const label = heading.cloneNode(true) as HTMLElement;
      label.querySelectorAll('.a-h-anchor, .a-h2-anchor, .a-h2-star').forEach((anchor) => {
        anchor.remove();
      });
      return {
        slug: heading.id,
        text: (label.textContent ?? '').trim(),
      };
    })
    .filter((item) => item.text.length > 0);

  if (items.length === 0) return;

  for (const list of document.querySelectorAll<HTMLOListElement>('.a-toc-m ol, .a-toc ol')) {
    if (list.childElementCount > 0) continue;
    for (const item of items) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${item.slug}`;
      link.textContent = item.text;
      li.append(link);
      list.append(li);
    }
  }
}

interface HeatData {
  years: number[];
  current: { year: number; month: number };
  counts: Record<'articles' | 'diary', Record<string, number[]>>;
}

function renderHeat(mode: 'articles' | 'diary'): void {
  const grid = document.querySelector<HTMLElement>('#a-heat-grid');
  if (!grid?.dataset.heat) return;

  let data: HeatData;
  try {
    data = JSON.parse(grid.dataset.heat) as HeatData;
  } catch {
    return;
  }

  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const star = '<svg class="a-heat-star" aria-hidden="true"><use href="#i-star"></use></svg>';
  let html = '<div class="a-heat-months" aria-hidden="true"><span></span>';
  for (const month of months) html += `<span>${month}</span>`;
  html += '</div>';

  for (const year of data.years) {
    html += `<div class="a-heat-row" data-year="${year}">`;
    html += `<span class="a-heat-year">${year}</span>`;
    for (const month of months) {
      const count = data.counts[mode]?.[String(year)]?.[month - 1] ?? 0;
      const tier = Math.min(count, 4);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const label = format(count === 1 ? messages.heatLabelOne : messages.heatLabelOther, {
        year,
        monthNumber: month,
        monthName: messages.months[month - 1] ?? '',
        count,
      });
      const future = year > data.current.year || (year === data.current.year && month > data.current.month);
      if (future) {
        html += '<span class="a-heat-cell" data-tier="future" aria-hidden="true"></span>';
      } else if (count > 0) {
        html += `<a class="a-heat-cell" data-tier="${tier}" href="#month-${key}" data-label="${label}" aria-label="${label}">${tier === 4 ? star : ''}</a>`;
      } else {
        html += `<span class="a-heat-cell" data-tier="0" data-label="${label}" role="img" aria-label="${label}"></span>`;
      }
    }
    html += '</div>';
  }

  grid.innerHTML = html;
}

function syncArcAnchors(): void {
  for (const container of document.querySelectorAll<HTMLElement>('#a-arc-articles, #a-arc-diary')) {
    const visible = !container.hidden;
    const seen = new Set<string>();
    for (const section of container.querySelectorAll<HTMLElement>('.a-arc-year[data-arc-year]')) {
      const year = section.dataset.arcYear;
      if (visible && year) section.id = `year-${year}`;
      else section.removeAttribute('id');
    }
    for (const entry of container.querySelectorAll<HTMLElement>('.a-arc-entry[data-arc-month]')) {
      const month = entry.dataset.arcMonth;
      if (!month) continue;
      if (visible && !seen.has(month)) {
        entry.id = `month-${month}`;
        seen.add(month);
      } else {
        entry.removeAttribute('id');
      }
    }
  }
}

function initArchive(): void {
  const grid = document.querySelector<HTMLElement>('#a-heat-grid');
  if (!grid) return;
  const switchEl = document.querySelector<HTMLElement>('.a-arc-switch');
  const mode = switchEl?.dataset.mode === 'diary' ? 'diary' : 'articles';
  renderHeat(mode);
  syncArcAnchors();
}

function initPage(): void {
  syncThemeControls();
  closeMenus();
  document.body.classList.remove('a-drawer-open');
  const drawer = document.querySelector<HTMLElement>('#a-drawer');
  if (drawer && !drawer.hidden) drawer.hidden = true;
  const drawerToggle = document.querySelector<HTMLButtonElement>('#a-drawer-toggle');
  drawerToggle?.setAttribute('aria-expanded', 'false');
  setupToc();
  setupImages();
  setupGallery();
  initArchive();
  if (document.querySelector('[data-music]')) {
    void import('./music-player').then(({ initMusicPlayers }) => {
      initMusicPlayers();
    });
  }
}

function onClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target) return;

  const themeButton = target.closest<HTMLButtonElement>('[data-theme-btn]');
  if (themeButton) {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    return;
  }

  const themeSet = target.closest<HTMLButtonElement>('[data-theme-set]');
  if (themeSet) {
    const value = themeSet.dataset.themeSet;
    const preference: ThemePreference = value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
    setTheme(preference);
    return;
  }

  const drawerToggle = target.closest<HTMLButtonElement>('#a-drawer-toggle');
  if (drawerToggle) {
    openDrawer();
    return;
  }
  const drawerClose = target.closest<HTMLButtonElement>('#a-drawer-close');
  if (drawerClose) {
    closeDrawer();
    return;
  }

  const groupToggle = target.closest<HTMLButtonElement>('[data-drawer-group]');
  if (groupToggle) {
    const panel = groupToggle.nextElementSibling as HTMLElement | null;
    const expanded = groupToggle.getAttribute('aria-expanded') === 'true';
    groupToggle.setAttribute('aria-expanded', String(!expanded));
    if (panel) panel.hidden = expanded;
    return;
  }

  const foldToggle = target.closest<HTMLButtonElement>('.a-fold-toggle');
  if (foldToggle) {
    const entry = foldToggle.closest('.a-entry');
    const text = entry?.querySelector<HTMLElement>('.a-entry-text');
    if (text) {
      const collapsed = text.classList.toggle('is-collapsed');
      foldToggle.setAttribute('aria-expanded', String(!collapsed));
      const label = foldToggle.querySelector<HTMLElement>('.a-fold-text');
      if (label) label.textContent = collapsed ? messages.expand : messages.collapse;
    }
    return;
  }

  const arcMode = target.closest<HTMLButtonElement>('[data-arc-mode]');
  if (arcMode) {
    const mode = arcMode.dataset.arcMode === 'diary' ? 'diary' : 'articles';
    document.querySelectorAll<HTMLButtonElement>('[data-arc-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.arcMode === mode));
    });
    const switchEl = arcMode.closest<HTMLElement>('.a-arc-switch');
    if (switchEl) switchEl.dataset.mode = mode;
    const articles = document.querySelector<HTMLElement>('#a-arc-articles');
    const diary = document.querySelector<HTMLElement>('#a-arc-diary');
    if (articles) articles.hidden = mode !== 'articles';
    if (diary) diary.hidden = mode !== 'diary';
    const total = document.querySelector<HTMLElement>('#a-arc-total');
    const unit = document.querySelector<HTMLElement>('#a-arc-unit');
    const noun = document.querySelector<HTMLElement>('#a-arc-noun');
    const range = document.querySelector<HTMLElement>('#a-arc-range');
    if (total) total.textContent = arcMode.dataset.arcTotal ?? total.textContent;
    if (unit) unit.textContent = arcMode.dataset.arcUnit ?? unit.textContent;
    if (noun) noun.textContent = arcMode.dataset.arcNoun ?? noun.textContent;
    if (range) range.textContent = arcMode.dataset.arcRange ?? range.textContent;
    syncArcAnchors();
    renderHeat(mode);
    return;
  }

  const menuButton = target.closest<HTMLButtonElement>('[data-menu-btn]');
  if (menuButton) {
    const menu = menuButton.closest('.a-navmenu');
    const panel = menu?.querySelector<HTMLElement>('.a-subnav');
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    closeMenus(menu);
    menuButton.setAttribute('aria-expanded', String(!expanded));
    if (panel) panel.hidden = expanded;
    return;
  }

  if (!target.closest('.a-navmenu')) closeMenus();

  if (target.closest('#a-search a[href]')) {
    document.querySelector<HTMLButtonElement>('#a-search-close')?.click();
  }
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  closeMenus();
  const drawer = document.querySelector<HTMLElement>('#a-drawer');
  if (drawer && !drawer.hidden) {
    closeDrawer();
    return;
  }
  const openMenu = document.querySelector<HTMLButtonElement>('[data-menu-btn][aria-expanded="true"]');
  openMenu?.focus();
}

function boot(): void {
  if (!document.documentElement.dataset.daybookBound) {
    document.documentElement.dataset.daybookBound = 'true';
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('astro:before-preparation', startNavigation);
    document.addEventListener('astro:after-preparation', () => progressNavigation(86));
    document.addEventListener('astro:before-swap', prepareNextDocument);
    document.addEventListener('astro:after-swap', () => {
      progressNavigation(96);
      // ClientRouter 换页会以服务端 HTML 覆盖 <html>，运行时切到深色的 class 会丢失，
      // 这里在每次文档交换后立刻按用户偏好重新套用主题（不写回 localStorage）。
      applyTheme(readThemePreference());
    });
    document.addEventListener('astro:page-load', () => {
      finishNavigation();
      initPage();
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) resetNavigation();
    });
    document.addEventListener('daybook:content-unlocked', () => {
      buildLockedToc();
      setupToc();
      setupImages();
      setupGallery();
    });
    setupThemeWatcher();
  }
  initPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
