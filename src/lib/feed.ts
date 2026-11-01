import { enUS } from 'date-fns/locale/en-US';
import { formatInTimeZone } from 'date-fns-tz';
import { siteConfig } from '../config/site';
import { localeMeta, t } from '../i18n/current';
import type { AnyEntry } from '../types/content';
import { getDescription } from './content/description';
import { getEntryTitle } from './content/title';
import { absoluteUrl } from './site';

export interface FeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
  content?: string;
}

export interface FeedOptions {
  title: string;
  description: string;
  selfPath: string;
  timeZone: string;
  items: FeedItem[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

export function rssDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'EEE, dd MMM yyyy HH:mm:ss xx', { locale: enUS });
}

export function absoluteLinks(html: string): string {
  return html.replace(/(href|src)="([^"]+)"/g, (_match, attr: string, value: string) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return `${attr}="${value}"`;
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${attr}="${absoluteUrl(path)}"`;
  });
}

export function itemFromEntry(entry: AnyEntry, options: { html?: string; fullText: boolean; timeZone: string }): FeedItem {
  const link = absoluteUrl(entry.url);
  const locked = Boolean(entry.data.password);
  const kind = entry.collection === 'daily' ? siteConfig.labels.diary : t('content.post');
  const description = getDescription(entry, siteConfig.labels.diary);
  const lockedBody =
    entry.collection === 'daily'
      ? `<p>${t('feed.lockedDaily', { diary: siteConfig.labels.diary })}</p>`
      : `<p>${t('feed.lockedPost')}</p>`;
  const content = locked ? lockedBody : options.fullText && options.html ? absoluteLinks(options.html) : undefined;

  return {
    title: getEntryTitle(entry),
    link,
    guid: link,
    pubDate: rssDate(entry.data.date, options.timeZone),
    description: `${kind} · ${description}`,
    ...(content ? { content } : {}),
    ...(locked ? { content: lockedBody } : {}),
  };
}

export function renderFeed(options: FeedOptions): string {
  const now = rssDate(new Date(), options.timeZone);
  const items = options.items
    .map((item) => {
      const lines = [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
        `      <pubDate>${escapeXml(item.pubDate)}</pubDate>`,
        `      <description>${escapeXml(item.description)}</description>`,
      ];
      if (item.content) {
        lines.push(`      <content:encoded>${cdata(item.content)}</content:encoded>`);
      }
      lines.push('    </item>');
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(absoluteUrl('/'))}</link>
    <description>${escapeXml(options.description)}</description>
    <language>${escapeXml(localeMeta.htmlLang)}</language>
    <lastBuildDate>${escapeXml(now)}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl(options.selfPath))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
