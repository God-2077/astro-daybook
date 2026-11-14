interface GithubRepo {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id?: string | null; name?: string | null } | null;
  owner: { avatar_url?: string | null } | null;
}

interface CacheEntry {
  at: number;
  data: GithubRepo;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'daybook:github:';
const bound = new WeakSet<HTMLElement>();
const pending = new Map<string, Promise<GithubRepo>>();
let observer: IntersectionObserver | null = null;
let observerBound = false;

function readCache(repo: string): GithubRepo | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + repo);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > CACHE_TTL) return undefined;
    return normalizeRepo(entry.data);
  } catch {
    return undefined;
  }
}

function writeCache(repo: string, data: GithubRepo): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + repo, JSON.stringify({ at: Date.now(), data } satisfies CacheEntry));
  } catch {
    /* 隐私模式或存储已满时只影响缓存 */
  }
}

function normalizeRepo(input: unknown): GithubRepo | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const value = input as Record<string, unknown>;
  const owner = value.owner && typeof value.owner === 'object' ? (value.owner as Record<string, unknown>) : null;
  const license = value.license && typeof value.license === 'object' ? (value.license as Record<string, unknown>) : null;
  const description = typeof value.description === 'string' ? value.description : null;
  const stars = typeof value.stargazers_count === 'number' ? value.stargazers_count : 0;
  const forks = typeof value.forks_count === 'number' ? value.forks_count : 0;
  return {
    description,
    stargazers_count: stars,
    forks_count: forks,
    license: license
      ? {
          spdx_id: typeof license.spdx_id === 'string' ? license.spdx_id : null,
          name: typeof license.name === 'string' ? license.name : null,
        }
      : null,
    owner: owner && typeof owner.avatar_url === 'string' ? { avatar_url: owner.avatar_url } : null,
  };
}

async function requestRepo(repo: string): Promise<GithubRepo> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://api.github.com/repos/' + repo, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('GitHub API ' + response.status);
    const data = normalizeRepo(await response.json());
    if (!data) throw new Error('GitHub API returned an invalid payload');
    writeCache(repo, data);
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

function getRepo(repo: string): Promise<GithubRepo> {
  const cached = readCache(repo);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(repo);
  if (existing) return existing;
  const request = requestRepo(repo).finally(() => pending.delete(repo));
  pending.set(repo, request);
  return request;
}

function formatCount(value: number): string {
  try {
    return new Intl.NumberFormat(document.documentElement.lang || undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(value);
  }
}

function setText(card: HTMLElement, selector: string, value: string | undefined): void {
  if (!value) return;
  const node = card.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function applyRepo(card: HTMLElement, data: GithubRepo): void {
  const avatar = card.querySelector<HTMLImageElement>('[data-github-avatar]');
  const avatarUrl = data.owner?.avatar_url;
  if (avatar && avatarUrl) {
    avatar.addEventListener(
      'error',
      () => {
        avatar.hidden = true;
      },
      { once: true },
    );
    avatar.src = avatarUrl;
    avatar.hidden = false;
  }

  if (data.description) setText(card, '[data-github-description]', data.description);
  setText(card, '[data-github-stars]', formatCount(data.stargazers_count));
  setText(card, '[data-github-forks]', formatCount(data.forks_count));

  const license = data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' ? data.license.spdx_id : data.license?.name;
  if (license) setText(card, '[data-github-license]', license);
}

function loadCard(card: HTMLElement): void {
  const repo = card.dataset.githubRepo;
  if (!repo) return;
  void getRepo(repo)
    .then((data) => {
      applyRepo(card, data);
    })
    .catch(() => {
      card.dataset.githubError = 'true';
    });
}

/** 卡片进入视口附近才请求 GitHub API；同一仓库的多次请求会合并。 */
export function initGithubCards(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-github-card]'));
  if (cards.length === 0) return;

  if (!observerBound) {
    observerBound = true;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const card = entry.target as HTMLElement;
            observer?.unobserve(card);
            loadCard(card);
          }
        },
        { rootMargin: '200px 0px' },
      );
    }
  }

  for (const card of cards) {
    if (bound.has(card)) continue;
    bound.add(card);
    if (observer) observer.observe(card);
    else loadCard(card);
  }
}
