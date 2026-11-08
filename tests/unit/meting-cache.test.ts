import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import { createMetingCache } from '../../src/lib/meting-cache';

async function tempCacheFile(t: TestContext): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'daybook-meting-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return path.join(directory, 'meting-api-data.json');
}

test('meting cache persists entries and respects per-type TTL', async (t) => {
  const file = await tempCacheFile(t);
  let now = 1_700_000_000_000;
  t.mock.method(Date, 'now', () => now);

  const cache = createMetingCache(file, (type) => (type === 'playlist' ? 1000 : 100_000));
  await cache.set('song-url', 'song', { name: 'song' });
  await cache.set('playlist-url', 'playlist', { name: 'list' });

  assert.deepEqual(await cache.get('song-url', 'song'), { hit: true, data: { name: 'song' } });
  assert.deepEqual(await cache.get('playlist-url', 'playlist'), { hit: true, data: { name: 'list' } });

  now += 1500;
  assert.deepEqual(await cache.get('playlist-url', 'playlist'), { hit: false });
  assert.deepEqual(await cache.get('song-url', 'song'), { hit: true, data: { name: 'song' } });

  const revived = createMetingCache(file, () => 100_000);
  assert.deepEqual(await revived.get('song-url', 'song'), { hit: true, data: { name: 'song' } });
});

test('meting cache recovers from a corrupt file', async (t) => {
  const file = await tempCacheFile(t);
  await writeFile(file, '{not json', 'utf8');
  const warn = t.mock.method(console, 'warn', () => undefined);
  const cache = createMetingCache(file, () => 100_000);

  assert.deepEqual(await cache.get('song-url', 'song'), { hit: false });
  await cache.set('song-url', 'song', { name: 'song' });

  const raw = JSON.parse(await readFile(file, 'utf8')) as { entries: Record<string, unknown> };
  assert.ok(raw.entries['song-url']);
  assert.ok(warn.mock.callCount() >= 1);
});

test('meting cache treats ttl 0 as disabled', async (t) => {
  const file = await tempCacheFile(t);
  const cache = createMetingCache(file, () => 0);

  await cache.set('song-url', 'song', { name: 'song' });
  assert.deepEqual(await cache.get('song-url', 'song'), { hit: false });
});
