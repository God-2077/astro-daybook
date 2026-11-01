import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { t } from '../i18n/current';
import { getAllEntries } from '../lib/content/entries';
import { absoluteUrl } from '../lib/site';

export const GET: APIRoute = async () => {
  if (!siteConfig.robots.enabled) {
    return new Response(t('errors.robotsDisabled'), { status: 404 });
  }

  const lines = ['User-agent: *', 'Allow: /'];
  const protectedPaths = (await getAllEntries()).filter((entry) => entry.data.password).map((entry) => entry.url);
  const disallow = [...new Set([...siteConfig.robots.disallow, ...protectedPaths])];
  for (const path of disallow) lines.push(`Disallow: ${path}`);
  lines.push('', `Sitemap: ${absoluteUrl('/sitemap.xml')}`, '');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
