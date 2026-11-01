import { getCollection } from 'astro:content';
import { siteConfig } from '../../config/site';
import type { AnyEntry, ContentCollection, DailyData, DailyEntry, HideFrom, PostData, PostEntry } from '../../types/content';
import { ContentError, ProjectError } from '../errors';
import { parseContentDate } from './date';
import { contentFormat } from './format';
import { readRawFrontmatter } from './raw';

const RESERVED_PREFIXES = ['/page/', '/posts/page/', '/categories/', '/tags/'];
const FIXED_ROUTES = new Set([
  '/',
  '/posts',
  '/categories',
  '/tags',
  '/archives',
  '/about',
  '/friends',
  '/404',
  '/feed.xml',
  '/feed-diary.xml',
  '/feed-posts.xml',
  '/sitemap.xml',
  '/robots.txt',
]);

interface RawCollectionEntry {
  id: string;
  filePath?: string;
  body?: string;
  data: Record<string, unknown>;
}

function isDev(): boolean {
  return Boolean(import.meta.env?.DEV);
}

function collectionDir(collection: ContentCollection): string {
  return `src/content/${collection}/`;
}

function relativeContentPath(collection: ContentCollection, filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = collectionDir(collection);
  const index = normalized.lastIndexOf(marker);
  if (index >= 0) return normalized.slice(index + marker.length);
  return normalized.split('/').pop() ?? normalized;
}

function normalizeSlug(value: string, file: string, field: string): string {
  const slug = value.trim().replace(/^\/+|\/+$/g, '');
  if (!slug) throw new ContentError(file, `${field} 不能为空`);
  if (/[?#\\]/.test(slug)) {
    throw new ContentError(file, `${field} 不能包含 ?、# 或反斜杠：${value}`);
  }
  if (slug.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new ContentError(file, `${field} 含非法路径段：${value}`);
  }
  return slug;
}

function normalizePermalink(value: string, file: string): string {
  const permalink = value.trim().replace(/^\/+|\/+$/g, '');
  if (!permalink) throw new ContentError(file, 'permalink 不能为空');
  if (/[?#\\]/.test(permalink)) {
    throw new ContentError(file, `permalink 不能包含 ?、# 或反斜杠：${value}`);
  }
  if (permalink.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new ContentError(file, `permalink 含非法路径段：${value}`);
  }
  return permalink;
}

function stringField(data: Record<string, unknown>, name: string): string | undefined {
  const value = data[name];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${name} 不是字符串`);
  return value.trim();
}

function resolveCommon(
  collection: ContentCollection,
  filePath: string,
  source: RawCollectionEntry,
  raw: Record<string, unknown>,
): Omit<DailyData, 'categories' | 'tags' | 'keywords' | 'hideHomeTitle'> & {
  categories: string[];
  tags: string[];
  keywords: string[];
  url: string;
} {
  const field = (name: string) => `${relativeContentPath(collection, filePath)}:${name}`;
  const title = typeof source.data.title === 'string' ? source.data.title.trim() : '';

  const rawDate = raw.date ?? source.data.date;
  const date = parseContentDate(rawDate, siteConfig.timezone, filePath, field('date'));
  const rawUpdated = raw.updated ?? source.data.updated;
  const updated =
    rawUpdated === undefined || rawUpdated === null || rawUpdated === ''
      ? undefined
      : parseContentDate(rawUpdated, siteConfig.timezone, filePath, field('updated'));

  const defaultSlug = relativeContentPath(collection, filePath).replace(/\.(md|mdx)$/i, '');
  const slugValue = stringField(raw, 'slug') ?? stringField(source.data, 'slug');
  const slug = normalizeSlug(slugValue ?? defaultSlug, filePath, 'slug');
  const permalinkValue = stringField(raw, 'permalink') ?? stringField(source.data, 'permalink');
  const permalink = permalinkValue ? normalizePermalink(permalinkValue, filePath) : undefined;
  const url = permalink ? `/${permalink}` : `/${collection}/${slug}`;

  const hideFromRaw = source.data.hideFrom;
  const hideFrom = Array.isArray(hideFromRaw) ? (hideFromRaw as HideFrom[]) : [];

  const descriptionValue = typeof source.data.description === 'string' ? source.data.description.trim() : '';

  return {
    title,
    date,
    updated,
    description: descriptionValue || undefined,
    slug,
    permalink,
    draft: source.data.draft === true,
    pin: source.data.pin === true,
    password: typeof source.data.password === 'string' ? source.data.password : undefined,
    hideFrom,
    comments: source.data.comments !== false,
    categories: [],
    tags: [],
    keywords: [],
    url,
  };
}

async function loadCollection(collection: ContentCollection): Promise<AnyEntry[]> {
  const collectionName = collection === 'daily' ? 'dailyCollection' : 'postsCollection';
  const sources = (await getCollection(collectionName)) as unknown as RawCollectionEntry[];

  return Promise.all(
    sources.map(async (source) => {
      const filePath = source.filePath ?? source.id;
      const raw = await readRawFrontmatter(filePath, source.body ?? '');
      const common = resolveCommon(collection, filePath, source, raw.data);

      if (collection === 'daily') {
        const category = typeof source.data.category === 'string' ? source.data.category.trim() || undefined : undefined;
        const entry: DailyEntry = {
          collection: 'daily',
          id: source.id,
          filePath,
          body: raw.body,
          format: contentFormat(filePath),
          slug: common.slug,
          url: common.url,
          data: { ...common, category, hideHomeTitle: source.data.hideHomeTitle === true },
        };
        return entry;
      }

      const postData: PostData = {
        ...common,
        categories: Array.isArray(source.data.categories)
          ? source.data.categories
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        tags: Array.isArray(source.data.tags)
          ? source.data.tags
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        keywords: Array.isArray(source.data.keywords)
          ? source.data.keywords
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      };
      const entry: PostEntry = {
        collection: 'post',
        id: source.id,
        filePath,
        body: raw.body,
        format: contentFormat(filePath),
        slug: postData.slug,
        url: common.url,
        data: postData,
      };
      return entry;
    }),
  );
}

let allEntriesPromise: Promise<AnyEntry[]> | undefined;

export function getAllEntries(): Promise<AnyEntry[]> {
  allEntriesPromise ??= (async () => {
    const entries = [...(await loadCollection('daily')), ...(await loadCollection('post'))];
    validateEntries(entries);
    return entries;
  })();
  return allEntriesPromise;
}

export const CONTENT_SURFACE = {
  home: 'home',
  posts: 'posts',
  rss: 'rss',
  archive: 'archive',
  search: 'search',
  tag: 'tag',
  category: 'category',
  sitemap: 'sitemap',
} as const;

export type ContentSurface = (typeof CONTENT_SURFACE)[keyof typeof CONTENT_SURFACE];

export function isVisible(entry: AnyEntry, surface: ContentSurface): boolean {
  if (entry.data.draft) {
    if (!isDev()) return false;
    if (surface === 'rss' || surface === 'search' || surface === 'sitemap') return false;
  }
  return !entry.data.hideFrom.includes(surface as HideFrom);
}

export function isIndexable(entry: AnyEntry): boolean {
  if (entry.data.draft) return false;
  if (entry.data.hideFrom.includes('search')) return false;
  return true;
}

export function isInSitemap(entry: AnyEntry): boolean {
  if (entry.data.draft) return false;
  if (entry.data.hideFrom.includes('sitemap')) return false;
  if (entry.data.password && !siteConfig.sitemap.includeProtected) return false;
  return true;
}

/** 纯时间倒序（新 → 旧），同时间按 slug 升序；feed 这类"最新优先"的列表用它。 */
export function compareByDate(a: AnyEntry, b: AnyEntry): number {
  const dateDiff = b.data.date.getTime() - a.data.date.getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

export function compareEntries(a: AnyEntry, b: AnyEntry): number {
  if (a.data.pin !== b.data.pin) return a.data.pin ? -1 : 1;
  return compareByDate(a, b);
}

export function sortEntries<T extends AnyEntry>(entries: T[]): T[] {
  return [...entries].sort(compareEntries);
}

export async function entriesForSurface(surface: ContentSurface, collection?: ContentCollection): Promise<AnyEntry[]> {
  const entries = await getAllEntries();
  return sortEntries(entries.filter((entry) => (!collection || entry.collection === collection) && isVisible(entry, surface)));
}

export async function getEntryByUrl(url: string): Promise<AnyEntry | undefined> {
  const entries = await getAllEntries();
  return entries.find((entry) => entry.url === url);
}

export function taxonomySlug(kind: 'categories' | 'tags', name: string): string {
  return siteConfig.taxonomy[kind]?.[name] ?? encodeURIComponent(name);
}

export function taxonomyHref(kind: 'categories' | 'tags', name: string): string {
  return `/${kind}/${taxonomySlug(kind, name)}`;
}

export async function collectTaxonomy(
  kind: 'categories' | 'tags',
): Promise<{ name: string; slug: string; href: string; count: number }[]> {
  const surface = kind === 'categories' ? 'category' : 'tag';
  const entries = await entriesForSurface(surface, 'post');
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.collection !== 'post') continue;
    const values = kind === 'categories' ? entry.data.categories : entry.data.tags;
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: taxonomySlug(kind, name), href: taxonomyHref(kind, name), count }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function validateEntries(entries: AnyEntry[]): void {
  const byUrl = new Map<string, AnyEntry>();
  const byLowerTaxonomy = new Map<string, string>();

  for (const entry of entries) {
    if (entry.format === 'mdx' && entry.data.password) {
      throw new ContentError(
        entry.filePath,
        'MDX 内容暂不支持 password：构建期加密需要 Markdown 渲染出的 HTML 字符串，请改用 .md 或移除 password',
      );
    }
    if (FIXED_ROUTES.has(entry.url) || RESERVED_PREFIXES.some((prefix) => entry.url.startsWith(prefix))) {
      throw new ContentError(entry.filePath, `URL ${entry.url} 与固定路由冲突；请修改 slug 或 permalink`);
    }
    const existing = byUrl.get(entry.url);
    if (existing) {
      throw new ContentError(entry.filePath, `URL ${entry.url} 与 ${existing.filePath} 冲突；请修改 slug 或 permalink`);
    }
    byUrl.set(entry.url, entry);

    const items = entry.collection === 'post' ? [...entry.data.categories, ...entry.data.tags] : [];
    for (const name of items) {
      if (!name.trim()) throw new ContentError(entry.filePath, '分类/标签不能为空');
      if (/[/?#]/.test(name)) {
        throw new ContentError(
          entry.filePath,
          `分类/标签 "${name}" 含有 / ? #，无法生成 URL；请在 siteConfig.taxonomy 中提供 slug 映射`,
        );
      }
      const lower = name.toLocaleLowerCase();
      const previous = byLowerTaxonomy.get(lower);
      if (previous && previous !== name) {
        console.warn(
          `[daybook:content] ${entry.filePath}\n  分类/标签 "${name}" 与 "${previous}" 仅大小写不同，请确认是否故意。`,
        );
      }
      byLowerTaxonomy.set(lower, name);
    }
  }

  validateNavLinks(entries, byUrl);
}

function validateNavLinks(entries: AnyEntry[], byUrl: Map<string, AnyEntry>): void {
  const taxonomyRoutes = new Set<string>();
  for (const entry of entries) {
    if (entry.collection !== 'post') continue;
    for (const name of entry.data.categories) taxonomyRoutes.add(taxonomyHref('categories', name));
    for (const name of entry.data.tags) taxonomyRoutes.add(taxonomyHref('tags', name));
  }

  const routeExists = (link: string): boolean => {
    if (FIXED_ROUTES.has(link) || byUrl.has(link) || taxonomyRoutes.has(link)) return true;
    if (/^\/page\/\d+$/.test(link) || /^\/posts\/page\/\d+$/.test(link)) return true;
    return false;
  };

  const check = (item: { title: string; link: string }): void => {
    if (/^https?:\/\//i.test(item.link)) return;
    if (!item.link.startsWith('/')) {
      throw new ProjectError(`导航链接 ${item.link} 必须以 / 开头`, 'src/config/site.ts');
    }
    if (!routeExists(item.link)) {
      throw new ProjectError(
        `导航链接 ${item.link}（${item.title}）没有对应路由；请修正链接或先创建页面`,
        'src/config/site.ts',
      );
    }
  };

  for (const item of siteConfig.nav) {
    if ('items' in item) item.items.forEach(check);
    else check(item);
  }
  siteConfig.footerNav.forEach(check);
}
