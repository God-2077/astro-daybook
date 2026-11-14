import assert from 'node:assert/strict';
import test from 'node:test';

import { defineLinksConfig, defineSiteConfig, isCommentsRendered } from '../../src/config/define';

const base = {
  title: '测试站',
  url: 'https://example.com',
  author: '测试作者',
};

test('site config resolves defaults and derives footerBrand/since', () => {
  const config = defineSiteConfig(base);
  assert.equal(config.footerBrand, '测试站');
  assert.equal(config.timezone, 'Asia/Shanghai');
  assert.ok(config.since >= 2024);
  assert.equal(config.copyright.author, '测试作者');
  assert.equal(config.pagination.daily, 20);
  assert.equal(config.theme, 'system');
  assert.deepEqual(config.mdx.meting, {
    api: 'https://163.hyc.moe/',
    timeout: 5000,
    cache: {
      enabled: true,
      ttl: { playlist: 86_400_000, search: 86_400_000, default: 2_592_000_000 },
    },
  });
});

test('mdx meting config accepts overrides and rejects invalid values', () => {
  const config = defineSiteConfig({
    ...base,
    mdx: {
      meting: {
        api: 'https://music.example/api/',
        timeout: 12000,
        cache: { enabled: false, ttl: { playlist: 1000, search: 2000, default: 3000 } },
      },
    },
  });
  assert.deepEqual(config.mdx.meting, {
    api: 'https://music.example/api/',
    timeout: 12000,
    cache: { enabled: false, ttl: { playlist: 1000, search: 2000, default: 3000 } },
  });

  assert.throws(() => defineSiteConfig({ ...base, mdx: { meting: { api: 'not-a-url' } } }), /mdx.meting.api|http/);
  assert.throws(() => defineSiteConfig({ ...base, mdx: { meting: { timeout: 0 } } }), /mdx.meting.timeout|greater than 0/);
  assert.throws(
    () => defineSiteConfig({ ...base, mdx: { meting: { cache: { ttl: { playlist: -1 } } } } }),
    /mdx.meting.cache.ttl.playlist|-1|Too small|>=0/,
  );
  assert.throws(
    () => defineSiteConfig({ ...base, mdx: { meting: { cache: { ttl: { default: 1.5 } } } } }),
    /mdx.meting.cache.ttl.default|int|integer/,
  );
  assert.throws(() => defineSiteConfig({ ...base, mdx: { unknown: true } as never }), /mdx|Unrecognized/);
});

test('bottom nav defaults to four enabled entries and archive defaults to articles', () => {
  const config = defineSiteConfig(base);
  assert.equal(config.bottomNav.enabled, true);
  assert.deepEqual(
    config.bottomNav.items.map((item) => item.link),
    ['/', '/posts', '/friends', '/about'],
  );
  assert.equal(config.archive.defaultType, 'articles');
});

test('bottom nav accepts disabled state, custom titles, icons and archive type', () => {
  const config = defineSiteConfig({
    ...base,
    bottomNav: {
      enabled: false,
      items: [{ link: 'https://example.com', title: '外站', icon: 'i-external' }, { link: '/archives' }],
    },
    archive: { defaultType: 'diary' },
  });
  assert.equal(config.bottomNav.enabled, false);
  assert.deepEqual(config.bottomNav.items, [
    { link: 'https://example.com', title: '外站', icon: 'i-external' },
    { link: '/archives' },
  ]);
  assert.equal(config.archive.defaultType, 'diary');
});

test('invalid bottom nav and archive config fail at config load', () => {
  assert.throws(() => defineSiteConfig({ ...base, bottomNav: { items: [] } }), /bottomNav|items/);
  assert.throws(() => defineSiteConfig({ ...base, bottomNav: { items: [{ link: 'posts' }] } }), /内部链接|http/);
  assert.throws(() => defineSiteConfig({ ...base, bottomNav: { items: [{ link: '/', icon: 'book' }] } }), /bottomNav|icon/);
  assert.throws(() => defineSiteConfig({ ...base, bottomNav: { foo: true } as never }), /bottomNav|Unrecognized/);
  assert.throws(() => defineSiteConfig({ ...base, archive: { defaultType: 'posts' } as never }), /archive|defaultType|Invalid/);
});

test('daily title fallback resolves its defaults and accepts strategies or templates', () => {
  const config = defineSiteConfig(base);
  assert.deepEqual(config.dailyTitleFallback, { detail: 'date', archive: 'slug', feed: 'date' });

  const custom = defineSiteConfig({
    ...base,
    dailyTitleFallback: {
      detail: 'untitled',
      archive: { template: '{diary} · {date}' },
      feed: 'slug',
    },
  });
  assert.deepEqual(custom.dailyTitleFallback, {
    detail: 'untitled',
    archive: { template: '{diary} · {date}' },
    feed: 'slug',
  });
});

test('invalid daily title fallback fails at config load', () => {
  assert.throws(
    () => defineSiteConfig({ ...base, dailyTitleFallback: { detail: { template: '{unknown}' } } }),
    /dailyTitleFallback\.detail\.template|未知占位符/,
  );
  assert.throws(
    () => defineSiteConfig({ ...base, dailyTitleFallback: { archive: { template: '   ' } } }),
    /dailyTitleFallback\.archive\.template|Too small|at least 1/,
  );
  assert.throws(
    () => defineSiteConfig({ ...base, dailyTitleFallback: { feed: 'posts' } as never }),
    /dailyTitleFallback|feed|Invalid/,
  );
});

test('site config resolves language-specific defaults and derived locales', () => {
  const zh = defineSiteConfig(base);
  assert.equal(zh.lang, 'zh_CN');
  assert.equal(zh.labels.diary, '日记');
  assert.equal(zh.home.title, '日记');
  assert.equal(zh.home.showTitles, true);
  assert.equal(zh.nav[0]?.title, '日记');
  assert.deepEqual(
    zh.footerNav.map((item) => item.title),
    ['归档', '友链', 'RSS'],
  );
  assert.equal(zh.seo.locale, 'zh_CN');
  assert.equal(zh.comments.twikoo.lang, 'zh-CN');
  assert.equal(zh.comments.waline.lang, 'zh-CN');
  assert.equal(zh.comments.waline.serverURL, '');
  assert.equal(zh.comments.waline.login, 'enable');
  assert.equal(zh.comments.waline.pageSize, 10);
  assert.equal(zh.comments.artalk.locale, 'zh-CN');
  assert.equal(zh.comments.artalk.server, '');
  assert.equal(zh.comments.artalk.site, '测试站');
  assert.equal(zh.comments.artalk.pageSize, 20);

  const en = defineSiteConfig({ ...base, lang: 'en' });
  assert.equal(en.lang, 'en');
  assert.equal(en.labels.diary, 'Diary');
  assert.equal(en.home.title, 'Diary');
  assert.equal(en.nav[0]?.title, 'Diary');
  assert.deepEqual(
    en.footerNav.map((item) => item.title),
    ['Archives', 'Friends', 'RSS'],
  );
  assert.equal(en.seo.locale, 'en_US');
  assert.equal(en.comments.twikoo.lang, 'en');
  assert.equal(en.comments.waline.lang, 'en');
  assert.equal(en.comments.artalk.locale, 'en');
});

test('Japanese maps Waline language to jp and keeps Artalk ja', () => {
  const config = defineSiteConfig({ ...base, lang: 'ja' });
  assert.equal(config.comments.twikoo.lang, 'ja');
  assert.equal(config.comments.waline.lang, 'jp');
  assert.equal(config.comments.artalk.locale, 'ja');
});

test('explicit locale and comment languages still override the site language', () => {
  const config = defineSiteConfig({
    ...base,
    lang: 'en',
    seo: { locale: 'en_GB' },
    comments: {
      provider: 'artalk',
      twikoo: { lang: 'ja' },
      waline: { serverURL: 'https://waline.example.com', lang: 'jp', login: 'force', pageSize: 20 },
      artalk: { server: 'https://artalk.example.com', site: '自定义站点', locale: 'ja', pageSize: 30 },
    },
  });
  assert.equal(config.seo.locale, 'en_GB');
  assert.equal(config.comments.provider, 'artalk');
  assert.equal(config.comments.twikoo.lang, 'ja');
  assert.equal(config.comments.waline.serverURL, 'https://waline.example.com');
  assert.equal(config.comments.waline.lang, 'jp');
  assert.equal(config.comments.waline.login, 'force');
  assert.equal(config.comments.waline.pageSize, 20);
  assert.equal(config.comments.artalk.server, 'https://artalk.example.com');
  assert.equal(config.comments.artalk.site, '自定义站点');
  assert.equal(config.comments.artalk.locale, 'ja');
  assert.equal(config.comments.artalk.pageSize, 30);
});

test('unsupported comment providers are hidden without failing the build', () => {
  const config = defineSiteConfig({ ...base, comments: { provider: 'unknown' } });
  assert.equal(isCommentsRendered(config.comments), false);
  assert.equal(config.comments.provider, 'unknown');
  assert.equal(isCommentsRendered(defineSiteConfig(base).comments), true);
});

test('invalid site languages fail at config load', () => {
  assert.throws(() => defineSiteConfig({ ...base, lang: 'fr' as never }), /lang/);
});

test('site config resolves theme preference and rejects unknown values', () => {
  assert.equal(defineSiteConfig({ ...base, theme: 'dark' }).theme, 'dark');
  assert.equal(defineSiteConfig({ ...base, theme: 'light' }).theme, 'light');
  assert.equal(defineSiteConfig({ ...base, theme: 'system' }).theme, 'system');
  assert.throws(() => defineSiteConfig({ ...base, theme: 'auto' as never }), /theme/);
});

test('site config resolves custom HTML injection', () => {
  const config = defineSiteConfig(base);
  assert.deepEqual(config.inject, { headEnd: '', bodyEnd: '' });

  const injected = defineSiteConfig({
    ...base,
    inject: {
      headEnd: '<meta name="verify" content="ok" />',
      bodyEnd: '<script src="/custom.js" defer></script>',
    },
  });
  assert.equal(injected.inject.headEnd, '<meta name="verify" content="ok" />');
  assert.equal(injected.inject.bodyEnd, '<script src="/custom.js" defer></script>');

  assert.throws(() => defineSiteConfig({ ...base, inject: { head: '<meta />' } as never }), /inject|Unrecognized/);
});

test('site config resolves diary label independently from home title', () => {
  const config = defineSiteConfig(base);
  assert.equal(config.labels.diary, '日记');

  const custom = defineSiteConfig({
    ...base,
    home: { title: '首页标题', showTitles: false },
    labels: { diary: '随笔' },
  });
  assert.equal(custom.home.title, '首页标题');
  assert.equal(custom.home.showTitles, false);
  assert.equal(custom.labels.diary, '随笔');

  assert.throws(() => defineSiteConfig({ ...base, labels: { diary: '' } }), /labels\.diary/);
});

test('invalid timezone, URL and navigation fail at config load', () => {
  assert.throws(() => defineSiteConfig({ ...base, timezone: 'Not/AZone' }), /时区/);
  assert.throws(() => defineSiteConfig({ ...base, url: 'ftp://example.com' }), /URL|url/);
  assert.throws(() => defineSiteConfig({ ...base, nav: [{ title: '外链', link: 'example.com' }] }), /http|内部链接|合法/);
  assert.throws(() => defineSiteConfig({ ...base, nav: [{ title: '空组', items: [] }] }), /items|导航/);
});

test('site avatar defaults to empty and accepts public paths or http(s) URLs', () => {
  assert.equal(defineSiteConfig(base).avatar, '');
  assert.equal(defineSiteConfig({ ...base, avatar: '/avatar.svg' }).avatar, '/avatar.svg');
  assert.equal(defineSiteConfig({ ...base, avatar: 'https://cdn.example.com/a.png' }).avatar, 'https://cdn.example.com/a.png');
  assert.throws(() => defineSiteConfig({ ...base, avatar: 'avatar.svg' }), /avatar/);
  assert.throws(() => defineSiteConfig({ ...base, avatar: 'javascript:alert(1)' }), /avatar/);
});

test('links reject non-http links and allow relative avatars', () => {
  const links = defineLinksConfig({
    groups: [
      {
        name: '朋友',
        links: [{ name: 'A', url: 'https://example.com', avatar: '/avatar.png' }],
      },
    ],
  });
  assert.equal(links.groups[0]?.links[0]?.url, 'https://example.com');
  assert.throws(
    () =>
      defineLinksConfig({
        groups: [{ name: '朋友', links: [{ name: 'A', url: 'javascript:alert(1)' }] }],
      }),
    /http/,
  );
});
