import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildMetingUrl, fetchMusic, request } from '../../src/lib/meting';

const API = 'https://163.hyc.moe/';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('buildMetingUrl applies defaults and maps documented parameters', () => {
  const url = buildMetingUrl(
    {
      server: 'tencent',
      type: 'lrc',
      id: 'abc',
      format: 'spl',
      trans: true,
      roma: true,
      romaFirst: true,
      lrcNormalize: false,
      handsome: true,
      refresh: true,
      imgRedirect: true,
      stream: true,
      page: 2,
      limit: 10,
      auth: 'sig',
      lrctype: 1,
      params: { custom: 'yes' },
    },
    'https://music.example/meting/',
  );

  assert.equal(url.origin, 'https://music.example');
  assert.equal(url.pathname, '/meting/');
  assert.equal(url.searchParams.get('server'), 'tencent');
  assert.equal(url.searchParams.get('type'), 'lrc');
  assert.equal(url.searchParams.get('id'), 'abc');
  assert.equal(url.searchParams.get('format'), 'spl');
  assert.equal(url.searchParams.get('trans'), 'true');
  assert.equal(url.searchParams.get('roma'), 'true');
  assert.equal(url.searchParams.get('roma_first'), 'true');
  assert.equal(url.searchParams.get('lrc_normalize'), 'false');
  assert.equal(url.searchParams.get('handsome'), 'true');
  assert.equal(url.searchParams.get('refresh'), 'true');
  assert.equal(url.searchParams.get('img_redirect'), 'true');
  assert.equal(url.searchParams.get('stream'), 'true');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(url.searchParams.get('auth'), 'sig');
  assert.equal(url.searchParams.get('lrctype'), '1');
  assert.equal(url.searchParams.get('custom'), 'yes');
});

test('buildMetingUrl defaults server and search id', () => {
  const url = buildMetingUrl({ type: 'search', keyword: '寄往未来的信' }, API);

  assert.equal(url.searchParams.get('server'), 'netease');
  assert.equal(url.searchParams.get('type'), 'search');
  assert.equal(url.searchParams.get('id'), '0');
  assert.equal(url.searchParams.get('keyword'), '寄往未来的信');
});

test('buildMetingUrl rejects missing id, keyword and invalid api', () => {
  assert.throws(() => buildMetingUrl({ type: 'song' }, API), /需要 id/);
  assert.throws(() => buildMetingUrl({ type: 'search' }, API), /需要 keyword/);
  assert.throws(() => buildMetingUrl({ type: 'song', id: 1 }, 'ftp://example.com'), /http/);
});

test('fetchMusic returns a single normalized song and upgrades same-host media URLs', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse([
      {
        name: '可愛くてごめん',
        artist: 'HoneyWorks/かぴ',
        album: '告白実行委員会',
        source: 'netease',
        url: 'http://163.hyc.moe?server=netease&type=url&id=1',
        lrc: 'http://163.hyc.moe?server=netease&type=lrc&id=1',
        pic: 'http://163.hyc.moe?server=netease&type=pic&id=2',
      },
    ]),
  );

  const music = await fetchMusic({ type: 'song', id: '1' }, { api: API, timeout: 1000, cache: false });

  assert.equal(music.name, '可愛くてごめん');
  assert.equal(music.artist, 'HoneyWorks/かぴ');
  assert.equal(music.album, '告白実行委員会');
  assert.equal(music.source, 'netease');
  assert.equal(music.url, 'https://163.hyc.moe/?server=netease&type=url&id=1');
  assert.equal(music.lrc, 'https://163.hyc.moe/?server=netease&type=lrc&id=1');
  assert.equal(music.pic, 'https://163.hyc.moe/?server=netease&type=pic&id=2');
  assert.equal(music.cover, music.pic);
});

test('fetchMusic returns track arrays and accepts handsome cover field', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse([
      {
        name: 'A',
        artist: 'a',
        cover: 'https://p1.example/a.jpg',
        url: 'https://m.example/a.mp3',
        lrc: 'https://l.example/a.lrc',
      },
      {
        name: 'B',
        artist: 'b',
        pic: 'https://p2.example/b.jpg',
        url: 'https://m.example/b.mp3',
        lrc: 'https://l.example/b.lrc',
      },
    ]),
  );

  const tracks = await fetchMusic({ type: 'playlist', id: 42 }, { api: API, timeout: 1000, cache: false });

  assert.equal(tracks.length, 2);
  assert.equal(tracks[0]?.pic, 'https://p1.example/a.jpg');
  assert.equal(tracks[1]?.cover, 'https://p2.example/b.jpg');
});

test('fetchMusic returns text for lyric and name endpoints', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('[00:00.00]test', { status: 200 }));

  const lrc = await fetchMusic({ type: 'lrc', id: 1 }, { api: API, timeout: 1000, cache: false });
  assert.equal(lrc, '[00:00.00]test');

  const name = await fetchMusic({ type: 'name', id: 1 }, { api: API, timeout: 1000, cache: false });
  assert.equal(name, '[00:00.00]test');
});

test('url and pic endpoints resolve Location redirects', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 302, headers: { location: '/resolved/audio.mp3' } }),
  );

  const url = await fetchMusic({ type: 'url', id: 1 }, { api: API, timeout: 1000, cache: false });
  assert.equal(url, 'https://163.hyc.moe/resolved/audio.mp3');

  const pic = await request({ type: 'pic', id: 1 }, { api: API, timeout: 1000, cache: false });
  assert.equal(pic, 'https://163.hyc.moe/resolved/audio.mp3');
});

test('fetchMusic surfaces rate limits, empty songs and invalid JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ error: 'rate limit exceeded' }, 429));
  await assert.rejects(fetchMusic({ type: 'playlist', id: 1 }, { api: API, timeout: 1000, cache: false }), /限流|429/);

  t.mock.method(globalThis, 'fetch', async () => jsonResponse([]));
  await assert.rejects(fetchMusic({ type: 'song', id: 1 }, { api: API, timeout: 1000, cache: false }), /没有找到歌曲/);

  t.mock.method(globalThis, 'fetch', async () => new Response('not-json', { status: 200 }));
  await assert.rejects(fetchMusic({ type: 'playlist', id: 1 }, { api: API, timeout: 1000, cache: false }), /不是合法 JSON/);
});

test('fetchMusic reports timeouts with the configured duration', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }),
  );

  await assert.rejects(fetchMusic({ type: 'song', id: 1 }, { api: API, timeout: 10, cache: false }), /请求超时（10ms）/);
});

test('browser client normalizes JSON and returns API URLs for redirect types', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return jsonResponse([
      { name: 'Browser', artist: 'Client', url: 'https://m.example/a.mp3', pic: 'https://p.example/a.jpg' },
    ]);
  });

  const { createMetingClient } = await import('../../src/lib/meting-browser');
  const client = createMetingClient({ api: API, timeout: 1000 });
  const song = await client.fetchMusic({ type: 'song', id: 1 });
  assert.equal(song.name, 'Browser');
  assert.equal(song.url, 'https://m.example/a.mp3');
  assert.equal(calls, 1);

  const audio = await client.fetchMusic({ type: 'url', id: 1 });
  assert.equal(audio, 'https://163.hyc.moe/?server=netease&type=url&id=1');
  assert.equal(calls, 1, '浏览器端 url 类型不应再发请求');
});

test('server cache avoids duplicate fetches and refresh bypasses it', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'daybook-meting-server-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cacheFile = path.join(directory, 'meting-api-data.json');

  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return jsonResponse([{ name: 'Cached', artist: 'Server', url: 'https://m.example/a.mp3' }]);
  });

  const options = { api: API, timeout: 1000, cache: true, cacheFile };
  const first = await fetchMusic({ type: 'song', id: 1 }, options);
  const second = await fetchMusic({ type: 'song', id: 1 }, options);
  assert.equal(first.name, 'Cached');
  assert.equal(second.name, 'Cached');
  assert.equal(calls, 1);

  await fetchMusic({ type: 'song', id: 1, refresh: true }, options);
  assert.equal(calls, 2);
});
