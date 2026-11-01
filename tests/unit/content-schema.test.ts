import assert from 'node:assert/strict';
import test from 'node:test';

import { dailySchema, postSchema } from '../../src/lib/content/schema';

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
