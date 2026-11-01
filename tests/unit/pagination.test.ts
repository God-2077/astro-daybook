import assert from 'node:assert/strict';
import test from 'node:test';

import { pageHref, pagerItems, slicePage, totalPagesFor } from '../../src/lib/pagination';

test('pagerItems shows every page without ellipsis when total pages <= 4', () => {
  assert.deepEqual(pagerItems(1, 1), [1]);
  assert.deepEqual(pagerItems(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(pagerItems(4, 4), [1, 2, 3, 4]);
});

test('pagerItems on the first page: current, next, gap, total pages', () => {
  assert.deepEqual(pagerItems(1, 7), [1, 2, 'gap', 7]);
  assert.deepEqual(pagerItems(1, 5), [1, 2, 'gap', 5]);
  assert.deepEqual(pagerItems(1, 14), [1, 2, 'gap', 14]);
});

test('pagerItems in the middle: previous, current, next, gap, total pages', () => {
  assert.deepEqual(pagerItems(3, 7), [2, 3, 4, 'gap', 7]);
  assert.deepEqual(pagerItems(5, 8), [4, 5, 6, 'gap', 8]);
});

test('pagerItems on the second-to-last page: first, gap, previous, current, total pages', () => {
  assert.deepEqual(pagerItems(6, 7), [1, 'gap', 5, 6, 7]);
  assert.deepEqual(pagerItems(4, 5), [1, 'gap', 3, 4, 5]);
});

test('pagerItems on the last page: first, gap, previous, current', () => {
  assert.deepEqual(pagerItems(7, 7), [1, 'gap', 6, 7]);
  assert.deepEqual(pagerItems(5, 5), [1, 'gap', 4, 5]);
});

test('pagerItems clamps out-of-range pages', () => {
  assert.deepEqual(pagerItems(0, 7), [1, 2, 'gap', 7]);
  assert.deepEqual(pagerItems(9, 7), [1, 'gap', 6, 7]);
});

test('pageHref keeps page 1 at the base path', () => {
  assert.equal(pageHref('/posts', 1), '/posts');
  assert.equal(pageHref('/posts', 2), '/posts/page/2');
  assert.equal(pageHref('/', 3), '/page/3');
});

test('slicePage validates page bounds', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  assert.equal(totalPagesFor(items.length, 2), 3);
  assert.deepEqual(slicePage(items, 2, 2)?.items, ['c', 'd']);
  assert.equal(slicePage(items, 0, 2), null);
  assert.equal(slicePage(items, 4, 2), null);
});
