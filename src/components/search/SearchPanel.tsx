import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { format } from '../../i18n/format';
import type { SearchMessages } from '../../i18n/locale-types';

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
}

interface PagefindResult {
  data: () => Promise<PagefindResultData>;
}

interface Pagefind {
  options: (options: Record<string, unknown>) => void;
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
}

const TABS = ['all', 'daily', 'post', 'page'] as const;

type ResultKind = (typeof TABS)[number];

let pagefindPromise: Promise<Pagefind> | null = null;

function loadPagefind(): Promise<Pagefind> {
  pagefindPromise ??= import(/* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`)
    .then((module) => {
      const pagefind = module as unknown as Pagefind;
      pagefind.options({ excerptLength: 24 });
      return pagefind;
    })
    .catch((error: unknown) => {
      pagefindPromise = null;
      throw error;
    });
  return pagefindPromise;
}

function kindLabel(type: string | undefined, messages: SearchMessages): string {
  if (type === 'daily') return messages.kindDaily;
  if (type === 'post') return messages.kindPost;
  return messages.kindPage;
}

/**
 * Pagefind 按 dist 目录结构生成 URL（`.../index.html`），结果链接会带尾斜杠；
 * 而本站 `trailingSlash: 'never'`，直接用会 404。统一去掉尾斜杠（根路径保留 `/`）。
 */
function toSitePath(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function syncToggleButtons(expanded: boolean) {
  document.querySelectorAll<HTMLElement>('[data-search-toggle]').forEach((button) => {
    button.setAttribute('aria-expanded', String(expanded));
  });
}

function countByKind(results: PagefindResultData[]): Record<ResultKind, number> {
  const counts: Record<ResultKind, number> = { all: results.length, daily: 0, post: 0, page: 0 };
  for (const result of results) {
    const kind = result.meta.type;
    if (kind === 'daily' || kind === 'post' || kind === 'page') counts[kind] += 1;
  }
  return counts;
}

/** §6.11 空态线稿：放大镜 + 便签，沿用原型笔触。 */
function SearchSketch() {
  return (
    <svg
      className="a-search-state-art"
      viewBox="0 0 96 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="36" cy="27" r="14" />
      <path d="M47 38l13 13" />
      <path d="M56 12h22v15H56z" opacity=".55" />
      <path d="M60 17h14M60 22h9" opacity=".55" />
      <path className="a-ill-accent" d="M24 54h20" />
    </svg>
  );
}

/** SSR 阶段退回 useEffect，避免 useLayoutEffect 的告警；测量只在客户端发生。 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface SearchPanelProps {
  /** 由服务端注入的已翻译文案；客户端不读取站点配置。 */
  messages: SearchMessages;
}

export default function SearchPanel({ messages }: SearchPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ResultKind>('all');
  const openerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<ResultKind, HTMLButtonElement | null>>>({});
  const scrollbarRef = useRef(0);
  const savedScrollRef = useRef(0);
  const openRef = useRef(false);

  openRef.current = open;

  useEffect(() => {
    const toggle = (event: Event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLElement>('[data-search-toggle]');
      if (!button) return;
      event.preventDefault();
      openerRef.current = button;
      setOpen((current) => {
        const next = !current;
        // 在打开、隐藏滚动条之前记录宽度，用于补偿页面横向抖动。
        if (next) scrollbarRef.current = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        syncToggleButtons(next);
        return next;
      });
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || !openRef.current) return;
      setOpen(false);
      syncToggleButtons(false);
      openerRef.current?.focus();
    };

    document.addEventListener('click', toggle);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', toggle);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    body.classList.toggle('a-search-open', open);

    if (!open) {
      root.style.removeProperty('--a-search-sbw');
      // 关闭后把正文滚回打开前的位置（隐藏页脚期间文档变短，浏览器会归零）
      const previous = savedScrollRef.current;
      savedScrollRef.current = 0;
      const frame = previous > 0 ? window.requestAnimationFrame(() => window.scrollTo(0, previous)) : 0;
      return () => {
        body.classList.remove('a-search-open');
        root.style.removeProperty('--a-search-sbw');
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    savedScrollRef.current = window.scrollY;
    root.style.setProperty('--a-search-sbw', `${scrollbarRef.current}px`);
    const sheet = sheetRef.current;

    const measure = () => {
      // 量静止的父容器而不是卡片本身：卡片入场动画带 translateY，会污染 rect.top。
      // 此时页面已滚到顶部，直接用视口坐标，避免 scrollY 尚未归零时多扣几像素。
      const anchor = sheet?.parentElement;
      if (!anchor) return;
      const top = Math.max(0, anchor.getBoundingClientRect().top);
      sheet?.style.setProperty('--a-search-top', `${top.toFixed(2)}px`);
    };

    window.scrollTo(0, 0);
    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      body.classList.remove('a-search-open');
      root.style.removeProperty('--a-search-sbw');
    };
  }, [open]);

  useEffect(() => {
    const onPageLoad = () => {
      setOpen(false);
      syncToggleButtons(false);
    };
    document.addEventListener('astro:page-load', onPageLoad);
    return () => document.removeEventListener('astro:page-load', onPageLoad);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError('');
      setLoading(false);
      setTab('all');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const text = query.trim();
    if (!text) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const timer = window.setTimeout(async () => {
      try {
        const pagefind = await loadPagefind();
        const search = await pagefind.search(text);
        const data = await Promise.all(search.results.slice(0, 18).map((result) => result.data()));
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) {
          setError(messages.error);
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, messages.error]);

  const filtered = results.filter((result) => {
    const kind = result.meta.type ?? '';
    return tab === 'all' ? true : kind === tab;
  });

  const counts = countByKind(results);
  const hasQuery = query.trim().length > 0;
  const showCounts = hasQuery && !loading && !error;
  const hasTabFilter = tab !== 'all';

  const closeSearch = () => {
    setOpen(false);
    syncToggleButtons(false);
    openerRef.current?.focus();
  };

  const selectTab = (next: ResultKind) => {
    setTab(next);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  const onTabsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const order = TABS;
    const index = order.indexOf(tab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % order.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + order.length) % order.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = order.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = order[nextIndex];
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  const countText = error
    ? ''
    : loading
      ? messages.loading
      : hasQuery
        ? format(filtered.length === 1 ? messages.countOne : messages.countOther, { count: filtered.length })
        : '';

  return (
    <search className="a-search-root" id="a-search" aria-label={messages.rootAria} hidden={!open}>
      <div className="a-search-sheet" ref={sheetRef}>
        <div className="a-search-head">
          <div className="a-search-field">
            <svg className="a-ico a-search-ico" aria-hidden="true" focusable="false">
              <use href="#i-search" />
            </svg>
            <label className="a-sr" htmlFor="a-q">
              {messages.label}
            </label>
            <input
              ref={inputRef}
              className="a-search-input"
              id="a-q"
              type="search"
              placeholder={messages.placeholder}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-controls="a-search-results-panel"
            />
            {hasQuery && (
              <button
                type="button"
                className="a-search-clear"
                aria-label={messages.clearAria}
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <svg className="a-ico" aria-hidden="true" focusable="false">
                  <use href="#i-x" />
                </svg>
              </button>
            )}
            <span className="a-search-count" id="a-search-count" aria-live="polite">
              {countText}
            </span>
            <button
              type="button"
              className="a-search-close"
              id="a-search-close"
              aria-label={messages.closeAria}
              onClick={closeSearch}
            >
              <span className="a-search-close-key" aria-hidden="true">
                ESC
              </span>
              <svg className="a-ico a-search-close-x" aria-hidden="true" focusable="false">
                <use href="#i-x" />
              </svg>
              <span className="a-search-close-cancel" aria-hidden="true">
                {messages.cancel}
              </span>
            </button>
          </div>

          <div className="a-search-scopes" role="tablist" aria-label={messages.scopesAria} onKeyDown={onTabsKeyDown}>
            {TABS.map((key) => {
              const active = tab === key;
              const tabLabel =
                key === 'daily'
                  ? messages.tabDaily
                  : key === 'post'
                    ? messages.tabPost
                    : key === 'page'
                      ? messages.tabPage
                      : messages.tabAll;
              return (
                <button
                  key={key}
                  ref={(element) => {
                    tabRefs.current[key] = element;
                  }}
                  id={`a-search-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="a-search-results-panel"
                  tabIndex={active ? 0 : -1}
                  className={active ? 'a-search-scope is-active' : 'a-search-scope'}
                  onClick={() => selectTab(key)}
                >
                  <span className="a-search-scope-label">{tabLabel}</span>
                  {showCounts && (
                    <span className="a-search-scope-count" aria-hidden="true">
                      {counts[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={bodyRef}
          className="a-search-body"
          id="a-search-results-panel"
          role="tabpanel"
          aria-labelledby={`a-search-tab-${tab}`}
          aria-busy={loading}
        >
          {error ? (
            <div className="a-search-error" role="status">
              <span className="a-search-error-kicker">{messages.errorKicker}</span>
              <p className="a-search-error-text">{error}</p>
            </div>
          ) : !hasQuery ? (
            <div className="a-search-state a-search-state--idle">
              <SearchSketch />
              <p className="a-search-state-title">{messages.idle}</p>
              <p className="a-search-state-hint">{messages.hint}</p>
            </div>
          ) : loading ? (
            <div className="a-search-skeleton" aria-hidden="true">
              {['first', 'second', 'third'].map((key) => (
                <div className="a-search-skeleton-row" key={key}>
                  <span className="a-search-skeleton-meta" />
                  <span className="a-search-skeleton-title" />
                  <span className="a-search-skeleton-line" />
                  <span className="a-search-skeleton-line a-search-skeleton-line--short" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="a-search-state a-search-state--empty" id="a-search-empty">
              <SearchSketch />
              <p className="a-search-state-title">{messages.empty}</p>
              <p className="a-search-state-counts">
                {format(messages.counts, {
                  daily: counts.daily,
                  post: counts.post,
                  page: counts.page,
                })}
              </p>
              {hasTabFilter && counts.all > 0 && (
                <button type="button" className="a-search-empty-reset" onClick={() => selectTab('all')}>
                  {format(counts.all === 1 ? messages.viewAllOne : messages.viewAllOther, { count: counts.all })}
                </button>
              )}
            </div>
          ) : (
            <ol className="a-search-results">
              {filtered.map((result) => (
                <li className="a-search-result-item" key={result.url}>
                  <a className="a-search-result" href={toSitePath(result.url)}>
                    <span className="a-search-result-head">
                      <span className="a-search-result-kind">{kindLabel(result.meta.type, messages)}</span>
                      {result.meta.date && <time className="a-search-result-date">{result.meta.date}</time>}
                    </span>
                    <span className="a-search-result-title-row">
                      <span className="a-search-result-title">{result.meta.title ?? messages.untitled}</span>
                      <svg className="a-ico a-search-result-arrow" aria-hidden="true" focusable="false">
                        <use href="#i-arrow-right" />
                      </svg>
                    </span>
                    <span className="a-search-result-excerpt" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </search>
  );
}
