import assert from 'node:assert/strict';
import test from 'node:test';

import { siteConfig } from '../../src/config/site';
import { isExternalUrl } from '../../src/lib/site';

test('isExternalUrl treats links on another host as external', () => {
  assert.equal(isExternalUrl('https://example.com/post'), true);
  assert.equal(isExternalUrl('http://example.com'), true);
  assert.equal(isExternalUrl('HTTPS://EXAMPLE.COM/about'), true);
});

test('isExternalUrl keeps same-host absolute links internal', () => {
  assert.equal(isExternalUrl(`${siteConfig.url}/post/hello`), false);
  assert.equal(isExternalUrl(siteConfig.url.replace(/^https:/, 'http:')), false);
  assert.equal(isExternalUrl(`${siteConfig.url.toUpperCase()}/about`), false);
});

test('isExternalUrl ignores internal paths, anchors and non-http schemes', () => {
  assert.equal(isExternalUrl('/posts'), false);
  assert.equal(isExternalUrl('#h-intro'), false);
  assert.equal(isExternalUrl('../note'), false);
  assert.equal(isExternalUrl('mailto:hi@example.com'), false);
  assert.equal(isExternalUrl('tel:+10000000000'), false);
  assert.equal(isExternalUrl('https://'), false);
});
