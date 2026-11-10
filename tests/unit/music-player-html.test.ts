import assert from 'node:assert/strict';
import test from 'node:test';

import { translate } from '../../src/i18n/translate';
import { renderMusicPlayerHtml } from '../../src/lib/music-player-html';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]): string =>
  translate('zh_CN', key, params);

test('music player builder keeps the selectors used by the client scripts', () => {
  const html = renderMusicPlayerHtml(
    {
      playlist: [
        { name: '第一首', url: 'https://example.com/one.mp3', artist: '歌手', cover: 'https://example.com/one.jpg' },
        { name: '第二首', url: 'https://example.com/two.mp3' },
      ],
    },
    t,
  );
  for (const selector of [
    'data-music',
    'data-music-audio',
    'data-music-title',
    'data-music-artist',
    'data-music-progress',
    'data-music-prev',
    'data-music-play',
    'data-music-next',
    'data-music-toggle',
    'data-music-panel',
    'data-music-track',
    'data-music-playlist-count',
  ]) {
    assert.ok(html.includes(selector), selector);
  }
  assert.ok(html.includes('aria-current="true"'));
  assert.ok(html.includes('data-single="false"'));
  assert.ok(html.includes('music-list-'));
});

test('music player builder escapes user text and attributes', () => {
  const html = renderMusicPlayerHtml(
    {
      playlist: [
        {
          name: '<script>alert(1)</script>',
          url: 'https://example.com/a.mp3?x="quoted"&y=1',
          artist: 'A & B',
        },
      ],
    },
    t,
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('&quot;quoted&quot;'));
  assert.ok(html.includes('&amp;y=1'));
});

test('pending meting source renders the loading shell', () => {
  const html = renderMusicPlayerHtml(
    {
      metingSource: { query: { server: 'netease', type: 'playlist', id: '1' } },
      autoPlayNext: true,
      playlistExpand: true,
    },
    t,
  );
  assert.ok(html.includes('data-meting-pending'));
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(html.includes('data-auto-next="true"'));
  assert.ok(html.includes('data-open="true"'));
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('正在加载音乐'));
  assert.ok(html.includes('data-music-artist'));
  assert.ok(html.includes('a-music-sep'));
  assert.ok(!html.includes('data-music-track'));
});

test('empty playlist without meting source is rejected', () => {
  assert.throws(
    () => renderMusicPlayerHtml({ playlist: [] }, t),
    (error: Error) => error.message.includes('at least one track'),
  );
});
