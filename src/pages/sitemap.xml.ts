import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { t } from '../i18n/current';
import { formatContentDate } from '../lib/content/date';
import { collectTaxonomy, entriesForSurface, getAllEntries, isInSitemap } from '../lib/content/entries';
import { getPageEntries, pageUrl } from '../lib/content/pages';
import { totalPagesFor } from '../lib/pagination';
import { absoluteUrl } from '../lib/site';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function lastModified(date: Date): string {
  return formatContentDate(date, siteConfig.timezone, "yyyy-MM-dd'T'HH:mm:ssxxx");
}

export const GET: APIRoute = async () => {
  if (!siteConfig.sitemap.enabled) {
    return new Response(t('errors.sitemapDisabled'), { status: 404 });
  }

  const entries = (await getAllEntries()).filter(isInSitemap);
  const daily = await entriesForSurface('home', 'daily');
  const posts = await entriesForSurface('posts', 'post');
  const urls = new Map<string, SitemapEntry>();

  const add = (loc: string, lastmod?: string) => {
    if (!urls.has(loc)) urls.set(loc, { loc, lastmod });
  };

  add('/posts');
  add('/categories');
  add('/tags');
  add('/archives');
  add('/about');
  add('/friends');

  const newest = entries.reduce<Date | undefined>((latest, entry) => {
    const date = entry.data.updated ?? entry.data.date;
    return !latest || date > latest ? date : latest;
  }, undefined);
  add('/', newest ? lastModified(newest) : undefined);

  for (const entry of entries) {
    add(entry.url, lastModified(entry.data.updated ?? entry.data.date));
  }

  const dailyPages = totalPagesFor(daily.length, siteConfig.pagination.daily);
  for (let page = 2; page <= dailyPages; page += 1) add(`/page/${page}`);
  const postPages = totalPagesFor(posts.length, siteConfig.pagination.post);
  for (let page = 2; page <= postPages; page += 1) add(`/posts/page/${page}`);

  const categories = await collectTaxonomy('categories');
  for (const category of categories) add(category.href);
  const tags = await collectTaxonomy('tags');
  for (const tag of tags) add(tag.href);

  const pages = await getPageEntries();
  for (const page of pages) {
    if (page.data.draft) continue;
    if (page.data.hideFrom.includes('sitemap')) continue;
    add(pageUrl(page.id));
  }

  const body = [...urls.values()]
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(absoluteUrl(entry.loc))}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
