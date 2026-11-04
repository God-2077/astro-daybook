import assert from 'node:assert/strict';
import test from 'node:test';

import { dailySchema, pageSchema, postSchema } from '../../src/lib/content/schema';

const base = {
  date: '2026-10-21 10:00:00',
};

test('daily frontmatter allows no title and an optional category', () => {
  const parsed = dailySchema.parse({ ...base, category: '日常' });
  assert.equal(parsed.title, undefined);
  assert.equal(parsed.category, '日常');
  assert.equal(parsed.draft, false);
  assert.equal(parsed.pin, false);
  assert.equal(parsed.comments, true);
});

test('daily category stays outside the post taxonomy fields', () => {
  assert.equal(dailySchema.safeParse({ ...base, categories: ['日记'] }).success, false);
  assert.equal(postSchema.safeParse({ ...base, title: '一篇文章', categories: ['日记'] }).success, true);
});

test('daily hideHomeTitle defaults to false and can be enabled per entry', () => {
  assert.equal(dailySchema.parse(base).hideHomeTitle, false);
  assert.equal(dailySchema.parse({ ...base, hideHomeTitle: true }).hideHomeTitle, true);
  assert.equal(postSchema.safeParse({ ...base, title: '一篇文章', hideHomeTitle: true }).success, false);
});

test('post frontmatter still requires a non-empty title', () => {
  assert.equal(postSchema.safeParse(base).success, false);
  assert.equal(postSchema.safeParse({ ...base, title: '   ' }).success, false);
});

test('page frontmatter defaults to a public, commentable standalone page', () => {
  const parsed = pageSchema.parse({ title: '歌单' });
  assert.equal(parsed.title, '歌单');
  assert.equal(parsed.date, undefined);
  assert.equal(parsed.draft, false);
  assert.deepEqual(parsed.hideFrom, []);
  assert.equal(parsed.comments, true);
});

test('page frontmatter requires a title and rejects layout-era fields', () => {
  assert.equal(pageSchema.safeParse({}).success, false);
  assert.equal(pageSchema.safeParse({ title: '   ' }).success, false);
  assert.equal(pageSchema.safeParse({ title: '歌单', layout: '../layouts/PageLayout.astro' }).success, false);
  assert.equal(pageSchema.safeParse({ title: '歌单', password: 'x' }).success, false);
  assert.equal(pageSchema.safeParse({ title: '歌单', slug: 'music' }).success, false);
});

test('page frontmatter keeps the original date string and validates hideFrom', () => {
  assert.equal(pageSchema.parse({ title: '歌单', date: '2026-10-01 20:00:00' }).date, '2026-10-01 20:00:00');
  assert.equal(pageSchema.safeParse({ title: '歌单', hideFrom: ['unknown'] }).success, false);
});
