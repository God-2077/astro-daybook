import assert from 'node:assert/strict';
import test from 'node:test';

import { localePackages } from '../../src/i18n/locales';
import { TWIKOO_LOCALE_BASE, twikooLocaleFile } from '../../src/lib/twikoo-locale';

test('site languages map to the expected Twikoo locale shards', () => {
  assert.equal(twikooLocaleFile(localePackages.zh_CN.meta.twikooLang), null);
  assert.equal(twikooLocaleFile(localePackages.zh_TW.meta.twikooLang), 'zh-TW.js');
  assert.equal(twikooLocaleFile(localePackages.en.meta.twikooLang), null);
  assert.equal(twikooLocaleFile(localePackages.ja.meta.twikooLang), 'ja-JP.js');
});

test('Twikoo language aliases normalize to the shard filename', () => {
  assert.equal(twikooLocaleFile(undefined), null);
  assert.equal(twikooLocaleFile(''), null);
  assert.equal(twikooLocaleFile('zh'), null);
  assert.equal(twikooLocaleFile('zh-CN'), null);
  assert.equal(twikooLocaleFile('en'), null);
  assert.equal(twikooLocaleFile('en-US'), null);
  assert.equal(twikooLocaleFile('zh-TW'), 'zh-TW.js');
  assert.equal(twikooLocaleFile('zh-tw'), 'zh-TW.js');
  assert.equal(twikooLocaleFile('zh-HK'), 'zh-HK.js');
  assert.equal(twikooLocaleFile('ja'), 'ja-JP.js');
  assert.equal(twikooLocaleFile('JA-JP'), 'ja-JP.js');
  assert.equal(twikooLocaleFile('ko'), 'ko-KR.js');
  assert.equal(twikooLocaleFile('vi-VN'), 'vi-VN.js');
  assert.equal(twikooLocaleFile('id'), 'id-ID.js');
  assert.equal(twikooLocaleFile('uz'), 'uz-UZ.js');
  assert.equal(twikooLocaleFile('fr'), null);
});

test('the shard base path is shared by the build integration and the client', () => {
  assert.equal(TWIKOO_LOCALE_BASE, 'js/twikoo');
});
