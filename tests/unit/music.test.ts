import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTime, normalizePlaylist, parseLrc } from '../../src/lib/music';

test('playlist requires a non-empty name and url', () => {
  assert.throws(() => normalizePlaylist([]), /at least one track/);
  assert.throws(() => normalizePlaylist([{ name: ' ', url: '/a.mp3' }]), /name is required/);
  assert.throws(() => normalizePlaylist([{ name: 'song', url: '  ' }]), /url is required/);
});

test('playlist trims values and drops empty optional fields', () => {
  const tracks = normalizePlaylist([
    { name: ' 光るなら ', url: ' /music/a.mp3 ', artist: ' Goose house ', cover: ' ', lrc: '' },
  ]);

  assert.deepEqual(tracks, [
    { name: '光るなら', url: '/music/a.mp3', artist: 'Goose house', cover: undefined, lrc: undefined },
  ]);
});

test('LRC parser handles multiple tags, fractions and ordering', () => {
  const lines = parseLrc('[ti:demo]\n[00:02.00][00:01.5]hello\n[01:03]world\n[00:00.000]intro\nnot a lyric\n');

  assert.deepEqual(lines, [
    { time: 0, text: 'intro' },
    { time: 1.5, text: 'hello' },
    { time: 2, text: 'hello' },
    { time: 63, text: 'world' },
  ]);
});

test('time formatter uses MM:SS and a placeholder for unknown values', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65.9), '01:05');
  assert.equal(formatTime(Number.NaN), '--:--');
  assert.equal(formatTime(-1), '--:--');
});
