import { siteConfig } from '../config/site';
import { t } from '../i18n/current';
import type { AnyEntry } from '../types/content';
import { compareByDate, entriesForSurface, sortEntries } from './content/entries';
import { itemFromEntry, renderFeed } from './feed';
import { renderMarkdown } from './markdown';

export type FeedScope = 'all' | 'diary' | 'post';

let warnedMdxFullText = false;

export async function buildFeed(scope: FeedScope, selfPath: string): Promise<string> {
  const timeZone = siteConfig.timezone;
  const daily = await entriesForSurface('rss', 'daily');
  const posts = await entriesForSurface('rss', 'post');
  let entries: AnyEntry[];
  if (scope === 'diary') entries = daily;
  else if (scope === 'post') entries = posts;
  else entries = sortEntries([...daily, ...posts]);

  // RSS 只按时间倒序：置顶是站内列表的排序概念，不能把旧条目顶到 feed 头部并占掉 limit 名额。
  const limited = [...entries].sort(compareByDate).slice(0, siteConfig.rss.limit);
  const items = await Promise.all(
    limited.map(async (entry) => {
      if (siteConfig.rss.fullText && entry.format === 'mdx' && !warnedMdxFullText) {
        warnedMdxFullText = true;
        console.warn('[daybook:feed] rss.fullText 暂不支持 MDX，RSS 将回退到摘要；如需全文请改用 .md 或关闭 fullText。');
      }
      const html =
        siteConfig.rss.fullText && !entry.data.password && entry.format === 'md'
          ? (await renderMarkdown(entry.body)).html
          : undefined;
      return itemFromEntry(entry, {
        html,
        fullText: siteConfig.rss.fullText,
        timeZone,
      });
    }),
  );

  const suffix =
    scope === 'diary'
      ? t('feed.diarySuffix', { diary: siteConfig.labels.diary })
      : scope === 'post'
        ? t('feed.postSuffix')
        : '';
  return renderFeed({
    title: `${siteConfig.title}${suffix}`,
    description: siteConfig.description || siteConfig.subtitle || siteConfig.title,
    selfPath,
    timeZone,
    items,
  });
}

export function feedResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
