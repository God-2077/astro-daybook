import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { siteConfig } from '../../src/config/site';

const root = process.cwd();
const dist = path.join(root, 'dist');
const siteUrl = siteConfig.url;

function read(relative: string): string {
  return readFileSync(path.join(dist, relative), 'utf8');
}

function exists(relative: string): boolean {
  return existsSync(path.join(dist, relative));
}

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeURIComponent(match[1] ?? ''));
}

function rssItems(file: string): Array<Record<string, unknown>> {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(read(file)) as {
    rss?: { channel?: { item?: Record<string, unknown> | Array<Record<string, unknown>> } };
  };
  const item = parsed.rss?.channel?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

assert.ok(exists('index.html'), '首页应生成');
assert.ok(exists('404.html'), '404 应生成');
assert.ok(exists('music/index.html'), '独立页面 /music 应生成');
assert.ok(exists('sitemap.xml') && exists('robots.txt'), 'SEO 端点应生成');
assert.ok(exists('feed.xml') && exists('feed-diary.xml') && exists('feed-posts.xml'), 'RSS 应生成');
assert.ok(exists('pagefind/pagefind.js'), 'Pagefind 索引应生成');

assert.equal(exists('daily/2026-09-20-draft/index.html'), false, 'draft 日记不应有生产详情页');
assert.equal(exists('post/draft-future/index.html'), false, 'draft 文章不应有生产详情页');
assert.equal(exists('page/1/index.html'), false, '第一页不应生成 /page/1');
assert.equal(exists('posts/page/1/index.html'), false, '第一页不应生成 /posts/page/1');
assert.ok(exists('daily/2026-09-28-locked/index.html'), '密码日记应生成详情页');

const sitemap = locs(read('sitemap.xml'));
assert.ok(sitemap.includes(`${siteUrl}/music`), '独立页面应进 sitemap');
assert.ok(sitemap.includes(`${siteUrl}/post/astro-blog-studio`), '公开文章应进 sitemap');
assert.ok(sitemap.includes(`${siteUrl}/post/mdx-syntax`), 'MDX 文章应进 sitemap');
assert.ok(sitemap.includes(`${siteUrl}/post/meting-client`), 'Meting 示例文章应进 sitemap');
assert.ok(sitemap.includes(`${siteUrl}/categories/文章`), '分类页应进 sitemap');
assert.ok(!sitemap.includes(`${siteUrl}/post/locked-letter`), '密码文章默认不进 sitemap');
assert.ok(!sitemap.includes(`${siteUrl}/daily/2026-09-20-draft`), 'draft 不进 sitemap');
assert.ok(!sitemap.includes(`${siteUrl}/daily/2026-08-10-sitemap-hidden`), 'hideFrom sitemap 不进 sitemap');

const robots = read('robots.txt');
assert.match(robots, /Allow: \//);
assert.match(robots, /Disallow: \/post\/locked-letter/);
assert.match(robots, /Disallow: \/daily\/2026-09-28-locked/);

const detail = read('post/astro-blog-studio/index.html');
assert.ok(detail.includes(`<link rel="canonical" href="${siteUrl}/post/astro-blog-studio"`), '详情页 canonical 应指向站点 URL');
assert.match(detail, /property="og:type" content="article"/);
assert.ok(detail.includes(`property="og:image" content="${siteUrl}/og-default.png"`), '详情页 OG 图应为绝对地址');
assert.match(detail, /"@type":"BlogPosting"/);
assert.match(detail, /"@type":"BreadcrumbList"/);
assert.match(detail, /"@type":"WebSite"/);
assert.match(detail, /rel="alternate" type="application\/rss\+xml"/);
assert.doesNotMatch(detail, /返回文章|a-crumb/, '详情页不应有返回文章链接');
assert.match(detail, /<a class="a-meta-type" href="\/posts">文章<\/a>/, '文章类型应链接到文章索引');
assert.doesNotMatch(detail, /a-comments-page/, '详情页评论区应保持正文列宽度');
assert.doesNotMatch(detail, /wl-panel|atk-main-editor/, '厂商评论样式不应进入详情页 HTML');

for (const page of ['friends/index.html', 'about/index.html']) {
  if (siteConfig.comments.enabled) {
    assert.match(read(page), /<section class="a-comments a-comments-page"/, `${page} 的评论区应使用独立页居中布局`);
  } else {
    assert.doesNotMatch(read(page), /<section class="a-comments/, `${page} 关闭评论后不应渲染评论区`);
  }
}

const about = read('about/index.html');
assert.match(about, /<img class="a-stamp-avatar" src="\/avatar\.svg"/, '关于页应渲染 site.ts 配置的头像');
assert.match(about, /<h2 id="h-关于我"[^>]*><svg class="a-h2-star"/, '关于页正文应来自 MDX 并复用 ✦ 标题管线');
assert.doesNotMatch(about, /class="a-find"|class="a-timeline"/, '关于页不再渲染联系人与时间线');

if (exists('page/2/index.html')) {
  const page2 = read('page/2/index.html');
  assert.ok(page2.includes(`rel="prev" href="${siteUrl}/"`), '第二页应链接上一页');
  if (exists('page/3/index.html')) {
    assert.ok(page2.includes(`rel="next" href="${siteUrl}/page/3"`), '第二页应链接下一页');
  } else {
    assert.doesNotMatch(page2, /rel="next"/, '最后一页不应输出下一页链接');
  }
  assert.ok(page2.includes(`rel="canonical" href="${siteUrl}/page/2"`), '第二页 canonical 应正确');
  assert.match(page2, /<title>日记 · 第 2 页/, '分页标题应使用 labels.diary');
}

const home = read('index.html');
assert.match(home, /<html[^>]*data-theme-mode="system"/, 'html 应输出主题模式');
assert.match(home, /id="a-loadbar"/, '应输出站内导航进度条');
assert.match(home, /<title>日记/, '首页标题应使用 labels.diary');
assert.match(home, /<section class="a-day-group">/, '首页应按天分组');
assert.match(home, /class="a-entry-cat">一段回顾</, '首页应显示日记 category');
assert.match(home, /查看原文/, '首页应显示查看原文');
assert.match(home, /↗/, '查看原文应带箭头');
assert.equal((home.match(/datetime="2026-10-21"/g) ?? []).length, 1, '同一天的日期只应出现一次');
assert.match(home, /href="\/daily\/2026\/10\/21-night"/, '首页应包含无标题日记');
assert.doesNotMatch(home, /<h4 class="a-entry-title"><a href="\/daily\/2026\/10\/21-night"/, '无标题日记不应渲染标题');

assert.match(home, /<html[^>]*data-bottom-nav="on"/, 'html 应标记底部导航开启');
const bottomNavAt = home.indexOf('<nav class="a-bottomnav"');
assert.ok(bottomNavAt > -1, '默认应渲染移动端底部导航');
const bottomNavHtml = home.slice(bottomNavAt, home.indexOf('</nav>', bottomNavAt) + 6);
for (const link of ['/', '/posts', '/friends', '/about']) {
  assert.ok(bottomNavHtml.includes(`href="${link}"`), `底部导航应包含 ${link}`);
}
const footerAt = home.indexOf('<footer class="a-footer"');
assert.ok(footerAt > -1, '应渲染页脚');

const archives = read('archives/index.html');
assert.match(
  archives,
  /<div[^>]*class="a-arc-switch"[^>]*data-mode="articles"[^>]*data-index="0"/,
  '归档默认应选中文章，并标记第一个标签',
);
assert.ok(archives.indexOf('data-arc-mode="articles"') < archives.indexOf('data-arc-mode="diary"'), '默认文章在前、日记在后');
assert.match(archives, /id="a-arc-articles">/, '默认应显示文章归档列表');
assert.match(archives, /id="a-arc-diary" hidden>/, '默认应隐藏日记归档列表');
assert.match(archives, /data-arc-mode="articles"[^>]*aria-pressed="true"/, '文章标签默认按下');
assert.match(archives, /data-arc-mode="diary"[^>]*aria-pressed="false"/, '日记标签默认未按下');
assert.match(archives, /class="a-arc-entry-title">\s*2026\/10\/21-night/, '归档里无标题日记应使用 slug 作为标题');

// 置顶日记单独成组：曾经整月跟着置顶、把更新的月份挤到后面。
const pinnedSectionAt = home.indexOf('a-month-group--pinned');
const novemberAt = home.indexOf('a-month-label">2026 · 十一月');
const octoberAt = home.indexOf('a-month-label">2026 · 十月', novemberAt);
assert.ok(pinnedSectionAt > -1, '置顶日记应单独成组');
assert.match(home, /a-month-label">置顶</, '置顶节标题应为「置顶」');
assert.match(home, /a-month-sub"><h2 class="a-month-label">2026 · 十月</, '置顶节内应按月份补小标题');
assert.ok(pinnedSectionAt < novemberAt && novemberAt < octoberAt, '置顶分组在最前，其余月份严格按时间倒序');
assert.equal((home.match(/a-entry--pinned/g) ?? []).length, 1, '只有置顶的那一条日记带置顶标记');
assert.ok(home.indexOf('/daily/2026/10/23-year') < novemberAt, '置顶日记应排在月份分组之前');
assert.doesNotMatch(home.slice(octoberAt), /daily\/2026\/10\/23-year/, '十月分组里不应再出现置顶日记');
const homeTitleHidden = 'daily/2026-09-16-home-title-hidden/index.html';
assert.ok(exists(homeTitleHidden), 'hideHomeTitle 日记应生成详情页');
assert.match(
  read(homeTitleHidden),
  /<h1[^>]*id="a-article-title"[^>]*>首页不显示标题的日记<\/h1>/,
  'hideHomeTitle 只影响首页，详情页标题应保留',
);
assert.doesNotMatch(home, /<p>import /, '首页 MDX 日记不应泄漏 import');
assert.doesNotMatch(home, /noreferrer/, '外链不应再带 noreferrer');

const feedPages = [
  'index.html',
  ...(exists('page')
    ? readdirSync(path.join(dist, 'page'))
        .filter((name) => exists(`page/${name}/index.html`))
        .map((name) => `page/${name}/index.html`)
    : []),
];
const feedHtml = feedPages.map(read).join('\n');
assert.match(
  feedHtml,
  /<time class="a-day-date" datetime="2026-09-28"><span class="a-day-num">28<\/span><span class="a-day-wd">周一<\/span><\/time>/,
  '所有月份的日期栏都应使用相同的日号与星期排版',
);
assert.doesNotMatch(feedHtml, /a-day-ym/, '日期栏不应再渲染额外的年月行');
assert.doesNotMatch(
  feedHtml,
  /<h4 class="a-entry-title"><a href="\/daily\/2026-09-16-home-title-hidden"/,
  'hideHomeTitle 日记不应在首页（含分页）渲染标题',
);
assert.match(feedHtml, /这篇日记在首页不显示标题/, 'hideHomeTitle 日记的正文仍应出现在首页（含分页）');
assert.match(feedHtml, /href="\/daily\/2026-10-20-redesign"/, '首页（含分页）应包含 MDX 日记');
assert.match(feedHtml, /把博客重新画一遍/, '首页（含分页）应渲染 MDX 日记标题');

const friends = read('friends/index.html');
assert.match(friends, /rel="noopener"/, '外链应保留 noopener');
assert.doesNotMatch(friends, /noreferrer/, '友链不应再带 noreferrer');

const imageLayout = read('post/image-layout/index.html');
assert.match(
  imageLayout,
  /<figure class="a-figure a-figure--raster"><div class="a-frame">/,
  '位图正文图片应带限高类并包在 figure 中',
);

const markdownSyntax = read('post/markdown-syntax/index.html');
assert.match(
  markdownSyntax,
  /<figure class="a-figure"><div class="a-frame"><img[^>]*src="\/images\/demo\/diary-line\.svg"/,
  'SVG 图没有内禀尺寸，不应带限高类',
);
assert.match(markdownSyntax, /class="a-img"/, '正文图片应带 a-img');
assert.match(markdownSyntax, /loading="lazy"/, '正文图片应懒加载');
assert.match(markdownSyntax, /decoding="async"/, '正文图片应异步解码');
assert.match(markdownSyntax, /<p>这一段紧跟着一张图片\r?<\/p>\n<figure class="a-figure">/, '紧跟文字的独占行图片也应转 figure');
assert.match(markdownSyntax, /<div class="a-figure-row">\n?<figure class="a-figure">/, '同一行多图应渲染为 a-figure-row');
assert.equal((markdownSyntax.match(/<div class="a-figure-row">/g) ?? []).length, 2, '演示应包含两处并排图片');
assert.match(
  markdownSyntax,
  /<a href="https:\/\/example\.com" target="_blank" rel="noopener">普通链接<\/a>/,
  '正文外链应在新标签页打开',
);
assert.match(
  markdownSyntax,
  /<a href="https:\/\/example\.com" target="_blank" rel="noopener">https:\/\/example\.com<\/a>/,
  '裸链接也应在新标签页打开',
);

const mdxSyntax = read('post/mdx-syntax/index.html');
assert.match(mdxSyntax, /<ol class="a-mdx-timeline">/, 'MDX 时间线应渲染为有序列表');
assert.match(mdxSyntax, /<li class="a-mdx-timeline-item">/, 'MDX 时间线条目应渲染');
assert.match(
  mdxSyntax,
  /<time class="a-mdx-timeline-date" datetime="2026-09-20">2026-09-20<\/time>/,
  '时间线日期应使用 time[datetime]',
);
assert.match(mdxSyntax, /<p class="a-mdx-timeline-title">先统一 Markdown 管线<\/p>/, '时间线标题应渲染');
assert.match(mdxSyntax, /来自 MDX：2/, 'MDX 表达式应在构建期求值');
assert.match(mdxSyntax, /<h2 id="h-时间线"><svg class="a-h2-star"/, 'MDX 标题应复用 h2 ✦ 管线');
assert.match(mdxSyntax, /<figure class="a-figure"><div class="a-frame">/, 'MDX 单图应转 figure');
assert.match(mdxSyntax, /class="a-img"[^>]*loading="lazy"/, 'MDX 图片应懒加载');
assert.doesNotMatch(mdxSyntax, /<p>import /, 'MDX import 不应泄漏到正文');
assert.doesNotMatch(mdxSyntax, /a-figure--raster/, 'MDX 页里的 SVG 图不应带限高类');

const music = read('music/index.html');
assert.match(music, /<section class="a-view" data-view="page"/, '独立页面应使用 PageLayout');
assert.match(music, /<h2[^>]*><svg class="a-h2-star"/, 'MDX 独立页面应走共享正文管线');
assert.match(music, /<section class="a-music"/, '歌单页应渲染 MusicPlayer 卡片');
assert.match(music, /data-music-audio/, '播放器应带音频节点');
assert.match(music, /data-music-track/, '播放器应渲染曲目按钮');
assert.match(music, /播放列表 · 3 首歌/, '播放列表标题应来自 i18n');
assert.match(music, /data-single="false"/, '多曲歌单不应标记为单曲');
assert.match(music, /data-lrc="https:\/\/[^"]+\.lrc"/, '示例歌词应指向外部地址');
assert.match(music, /data-url="https:\/\/[^"]+\.mp3"/, '示例音频应指向外部地址');
assert.doesNotMatch(music, /<p>import /, 'MusicPlayer import 不应泄漏到正文');

const metingPost = read('post/meting-client/index.html');
assert.match(metingPost, /meting\.fetchMusic\(/, 'Meting 示例文章应展示 fetchMusic 写法');
assert.match(metingPost, /data-meting-source="[^"]*type&quot;:&quot;playlist/, 'Meting 示例文章应输出客户端播放器数据源');
assert.match(metingPost, /data-meting-pending="true"/, '客户端播放器构建期应保持待加载状态');
assert.match(metingPost, /data-meting-api="https:\/\/163\.hyc\.moe\/"/, '客户端播放器页面应输出浏览器端 Meting API 配置');
assert.doesNotMatch(metingPost, /data-url="https:\/\/163\.hyc\.moe\//, '客户端模式不应把 Meting 曲目写进构建产物');
assert.doesNotMatch(metingPost, /<p>import /, 'Meting 示例文章的 import 不应泄漏到正文');

const mdxDaily = read('daily/2026-10-20-redesign/index.html');
assert.match(mdxDaily, /<div class="a-prose" data-article-body>/, 'MDX 日记详情应渲染正文');
assert.match(mdxDaily, /把博客重新画一遍/, 'MDX 日记标题应保留');
assert.doesNotMatch(mdxDaily, /<p>import /, 'MDX 日记 import 不应泄漏到正文');

const singleMusic = read('daily/2026-11-01-music/index.html');
assert.match(singleMusic, /data-single="true"/, '单曲播放器应带 data-single 标记');
assert.match(singleMusic, /data-music-track/, '单曲播放器仍应保留曲目 DOM 供脚本初始化');

const untitledDaily = read('daily/2026/10/21-night/index.html');
assert.match(
  untitledDaily,
  /<h1 id="a-article-title" class="a-sr" data-pagefind-meta="title">2026-10-21<\/h1>/,
  '无标题日记详情应使用日期回退标题，并保留可访问性锚点',
);

const locked = read('post/locked-letter/index.html');
assert.match(locked, /<meta name="robots" content="noindex/);
assert.match(locked, /data-pagefind-body/);
assert.doesNotMatch(locked, /如果你看到了这里，请把信折好/, '加密正文不得出现在 HTML 中');
assert.match(locked, /ciphertext/);
assert.equal((locked.match(/data-pagefind-body/g) ?? []).length, 1);
assert.doesNotMatch(locked, /返回文章|a-crumb/, '加密详情页不应有返回文章链接');
assert.match(locked, /<a class="a-meta-type" href="\/posts">文章<\/a>/, '加密文章类型应链接到文章索引');

const hiddenSearch = read('post/reinstall/index.html');
assert.doesNotMatch(hiddenSearch, /data-pagefind-body/);
const hiddenSearchDaily = read('daily/2026-08-20-search-hidden/index.html');
assert.doesNotMatch(hiddenSearchDaily, /data-pagefind-body/);

const indexed = htmlFiles(dist).filter((file) => /<[^>]*\sdata-pagefind-body(?:\s|=|>)/.test(readFileSync(file, 'utf8')));
assert.equal(indexed.length, 30, `Pagefind 页面集合应精确为 30 个，实际 ${indexed.length}`);

const feed = rssItems('feed.xml');
assert.ok(feed.length > 0 && feed.length <= 20);
assert.ok(!feed.some((item) => text(item.link).includes('/post/openai-api')), 'hideFrom rss 应排除');
assert.ok(!feed.some((item) => text(item.link).includes('/2026-09-20-draft')), 'draft 应排除');
assert.ok(
  feed.every((item) => text(item.link).startsWith(`${siteUrl}/`)),
  'RSS 链接应为绝对地址',
);
const lockedItem = feed.find((item) => text(item.link).includes('/post/locked-letter'));
assert.ok(lockedItem, '密码文章应在默认 RSS 中');
assert.match(text(lockedItem['content:encoded']), /这篇文章已加密，请到原文查看/, '密码文章 RSS 正文应为固定文本');
const pubTimes = feed.map((item) => Date.parse(text(item.pubDate)));
assert.ok(
  pubTimes.every((time, index) => index === 0 || pubTimes[index - 1] >= time),
  'RSS 条目应严格按时间倒序，置顶不应把旧日记顶到 feed 头部',
);

const diaryFeed = rssItems('feed-diary.xml');
assert.ok(diaryFeed.some((item) => text(item.link).includes('/daily/')));
assert.ok(diaryFeed.every((item) => text(item.link).includes('/daily/')));
const untitledDiaryItem = diaryFeed.find((item) => text(item.link).includes('/daily/2026/10/21-night'));
assert.ok(untitledDiaryItem, '无标题日记应进日记 RSS');
assert.equal(text(untitledDiaryItem.title), '2026-10-21', '无标题日记 RSS 应使用日期回退标题');
const postFeed = rssItems('feed-posts.xml');
assert.ok(postFeed.every((item) => text(item.link).includes('/post/')));
assert.ok(
  postFeed.some((item) => text(item.link).includes('/post/mdx-syntax')),
  'MDX 文章应进文章 RSS',
);

const assets = readdirSync(path.join(dist, '_astro'));
const galleryChunk = assets.find((name) => /^gallery\..+\.js$/.test(name));
assert.ok(galleryChunk, '正文图片放大层应产出独立的 gallery 分块');
const gallerySource = readFileSync(path.join(dist, '_astro', galleryChunk), 'utf8');
assert.match(gallerySource, /lg-toolbar/, 'gallery 分块应内含 lightGallery 工具栏');
assert.match(gallerySource, /lg-actual-size/, 'gallery 分块应内含实际尺寸按钮');
assert.match(gallerySource, /lg-toggle-thumbs/, 'gallery 分块应内含自建的缩略图开关');
assert.match(gallerySource, /loading\.[\w-]+\.gif/, 'lightGallery 的加载占位图应由构建产出');
assert.doesNotMatch(gallerySource, /fancybox/i, 'gallery 分块不应残留 Fancybox');

const bundleText = assets
  .filter((name) => /\.(?:js|css)$/.test(name))
  .map((name) => readFileSync(path.join(dist, '_astro', name), 'utf8'))
  .join('\n');
assert.doesNotMatch(bundleText, /fancybox/i, '构建产物不应再包含 Fancybox');
assert.match(detail, /"lightbox":\{/, '灯箱文案应随客户端消息注入页面');

console.log(`build assertions passed: ${indexed.length} indexed pages, ${feed.length} default RSS items`);
