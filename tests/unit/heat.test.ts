import assert from 'node:assert/strict';
import test from 'node:test';

import { articleTier, diaryScale, diaryTier, diaryTiers } from '../../src/lib/heat';

test('articles use fixed thresholds and share one scale across years', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 12].map((count) => articleTier(count)),
    [0, 1, 2, 2, 3, 3, 4, 4],
  );
});

test('diary scale interpolates quantiles over non-zero months only', () => {
  const scale = diaryScale([0, 5, 3, 0, 1, 3, 2, 1, 0, 0, 0, 0]);
  assert.ok(scale);
  assert.equal(scale.q25, 1.25);
  assert.equal(scale.q50, 2.5);
  assert.equal(scale.q75, 3);
  assert.equal(scale.flat, false);
});

test('diary tiers follow the yearly quantiles and keep zero months blank', () => {
  assert.deepEqual(diaryTiers([0, 1, 1, 2, 3, 3, 5, 0, 0, 0, 0, 0]), [0, 1, 1, 2, 3, 3, 4, 0, 0, 0, 0, 0]);
});

test('each year gets its own relative scale', () => {
  assert.deepEqual(diaryTiers([1, 2, 3, 4]), diaryTiers([10, 20, 30, 40]));
  assert.deepEqual(diaryTiers([1, 2, 3, 4]), [1, 2, 3, 4]);
});

test('equal monthly counts fall back to the middle tier without a star', () => {
  assert.deepEqual(diaryTiers([5, 5, 5]), [2, 2, 2]);
  assert.deepEqual(diaryTiers([0, 7, 0]), [0, 2, 0]);
});

test('a year without content has no scale and stays at tier 0', () => {
  assert.equal(diaryScale([0, 0, 0]), null);
  assert.deepEqual(diaryTiers([0, 0, 0]), [0, 0, 0]);
  assert.equal(diaryTier(3, null), 2);
});
