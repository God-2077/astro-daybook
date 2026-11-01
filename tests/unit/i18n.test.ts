import assert from 'node:assert/strict';
import test from 'node:test';

import { SITE_LANGS } from '../../src/i18n/languages';
import { localePackages } from '../../src/i18n/locales';
import { translate, translateCount } from '../../src/i18n/translate';

const baseKeys = Object.keys(localePackages.zh_CN.messages).sort();
const countKinds = Object.keys(localePackages.zh_CN.counts).sort();

test('every locale defines the same messages and count forms', () => {
  for (const lang of SITE_LANGS) {
    const pkg = localePackages[lang];
    assert.equal(pkg.meta.lang, lang);
    assert.deepEqual(Object.keys(pkg.messages).sort(), baseKeys);
    assert.deepEqual(Object.keys(pkg.counts).sort(), countKinds);
    assert.equal(pkg.meta.weekdays.length, 7);
    assert.equal(pkg.meta.months.length, 12);
  }
});

test('translate interpolates named placeholders', () => {
  assert.equal(translate('zh_CN', 'pager.pageTitle', { page: 2 }), '第 2 页');
  assert.equal(translate('en', 'pager.pageTitle', { page: 2 }), 'Page 2');
  assert.equal(
    translate('en', 'pager.info', { page: 1, totalPages: 3, entries: translateCount('en', 'entries', 2) }),
    'Page 1 / 3 · 2 entries',
  );
});

test('translateCount follows English plural rules and keeps CJK counts stable', () => {
  assert.equal(translateCount('en', 'entries', 1), '1 entry');
  assert.equal(translateCount('en', 'entries', 2), '2 entries');
  assert.equal(translateCount('en', 'posts', 1), '1 article');
  assert.equal(translateCount('zh_CN', 'entries', 2), '2 篇');
  assert.equal(translateCount('zh_TW', 'posts', 2), '2 篇文章');
  assert.equal(translateCount('ja', 'posts', 2), '2 件の記事');
});

test('locale metadata maps language tags, OG locales and date patterns', () => {
  assert.deepEqual(
    SITE_LANGS.map((lang) => localePackages[lang].meta.htmlLang),
    ['en', 'ja', 'zh-CN', 'zh-TW'],
  );
  assert.deepEqual(
    SITE_LANGS.map((lang) => localePackages[lang].meta.ogLocale),
    ['en_US', 'ja_JP', 'zh_CN', 'zh_TW'],
  );
  assert.deepEqual(
    SITE_LANGS.map((lang) => localePackages[lang].meta.twikooLang),
    ['en', 'ja', 'zh-CN', 'zh-TW'],
  );
  assert.deepEqual(
    SITE_LANGS.map((lang) => localePackages[lang].meta.walineLang),
    ['en', 'jp', 'zh-CN', 'zh-TW'],
  );
  assert.deepEqual(
    SITE_LANGS.map((lang) => localePackages[lang].meta.artalkLang),
    ['en', 'ja', 'zh-CN', 'zh-TW'],
  );
  assert.equal(localePackages.en.meta.datePatterns.display, 'MMM d, yyyy');
  assert.equal(localePackages.ja.meta.datePatterns.display, 'yyyy/MM/dd');
  assert.equal(localePackages.zh_CN.meta.datePatterns.display, 'yyyy-MM-dd');
  assert.equal(localePackages.en.meta.monthTitle(2026, 10, 'October'), 'October 2026');
  assert.equal(localePackages.ja.meta.monthTitle(2026, 10, '10月'), '2026年10月');
  assert.equal(localePackages.zh_CN.meta.monthTitle(2026, 10, '十月'), '2026 年 10 月');
});
