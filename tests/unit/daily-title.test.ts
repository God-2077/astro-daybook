import assert from 'node:assert/strict';
import test from 'node:test';

import { siteConfig } from '../../src/config/site';
import { t } from '../../src/i18n/current';
import { formatDisplayDate } from '../../src/lib/content/date';
import { getEntryTitle, renderDailyTitleFallback } from '../../src/lib/content/title';
import type { AnyEntry } from '../../src/types/content';

const date = new Date('2026-10-20T16:00:00.000Z');

function makeEntry(collection: 'daily' | 'post', title: string): AnyEntry {
  return {
    collection,
    slug: '2026/10/21-night',
    url: '/daily/2026/10/21-night',
    data: { title, date },
  } as unknown as AnyEntry;
}

test('fallback template replaces known placeholders and keeps unknown braces', () => {
  const values = { date: '2026-10-21', slug: '2026/10/21-night', diary: '日记', untitled: '未命名' };

  assert.equal(
    renderDailyTitleFallback('{diary} · {date} / {slug} ({untitled})', values),
    '日记 · 2026-10-21 / 2026/10/21-night (未命名)',
  );
  assert.equal(renderDailyTitleFallback('{unknown} { {date} }', values), '{unknown} { 2026-10-21 }');
});

test('untitled diary uses its configured fallback by position', () => {
  const entry = makeEntry('daily', '  ');
  const displayDate = formatDisplayDate(date, siteConfig.timezone);

  assert.equal(siteConfig.dailyTitleFallback.detail, 'date');
  assert.equal(siteConfig.dailyTitleFallback.archive, 'slug');
  assert.equal(siteConfig.dailyTitleFallback.feed, 'date');
  assert.equal(getEntryTitle(entry, 'detail'), displayDate);
  assert.equal(getEntryTitle(entry, 'archive'), '2026/10/21-night');
  assert.equal(getEntryTitle(entry, 'feed'), displayDate);
});

test('titled entries keep their title and untitled posts keep the untitled label', () => {
  assert.equal(getEntryTitle(makeEntry('daily', '  夜里散步  '), 'detail'), '夜里散步');
  assert.equal(getEntryTitle(makeEntry('post', ''), 'detail'), t('common.untitled'));
});
