import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { t } from '../i18n/current';
import { buildFeed, feedResponse } from '../lib/feed-build';

export const GET: APIRoute = async () => {
  if (!siteConfig.rss.enabled || !siteConfig.rss.default.enabled) {
    return new Response(t('errors.rssDisabled'), { status: 404 });
  }
  const xml = await buildFeed(siteConfig.rss.default.scope, '/feed.xml');
  return feedResponse(xml);
};
