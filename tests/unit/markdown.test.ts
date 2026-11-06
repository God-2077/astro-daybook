import assert from 'node:assert/strict';
import test from 'node:test';

import { siteConfig } from '../../src/config/site';
import { renderMarkdown } from '../../src/lib/markdown';

test('h2 gets the decorative star before its text', async () => {
  const { html } = await renderMarkdown('## 小标题\n\n正文');
  assert.match(html, /<h2[^>]*><svg class="a-h2-star"[^>]*>/);
  assert.match(html, /<\/svg>小标题/);
  assert.match(html, /<\/svg>小标题<a class="a-h2-anchor"/);
});

test('standalone images become figures with lazy async images', async () => {
  const { html } = await renderMarkdown('![图注](/images/demo/diary-line.svg)');
  assert.match(html, /<figure class="a-figure"><div class="a-frame">/);
  assert.match(html, /<figcaption>图注<\/figcaption>/);
  assert.match(html, /class="a-img"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
});

test('raster standalone images get the height-cap class', async () => {
  const { html } = await renderMarkdown('![图注](/images/demo/photo.jpg)');
  assert.match(html, /<figure class="a-figure a-figure--raster"><div class="a-frame">/);
});

test('svg figures keep the full-width layout without the cap class', async () => {
  const { html } = await renderMarkdown('![线稿](/images/demo/diary-line.svg)');
  assert.match(html, /<figure class="a-figure"><div class="a-frame">/);
  assert.doesNotMatch(html, /a-figure--raster/);
});

test('remote and query-string raster images are capped, svg with query is not', async () => {
  const { html } = await renderMarkdown(
    '![远程](https://example.com/a.png) ![带参数](/images/a.jpg?w=800#top) ![svg](/images/b.svg?w=800)',
  );
  assert.equal((html.match(/a-figure--raster/g) ?? []).length, 2);
  assert.match(html, /<div class="a-figure-row">\n?<figure class="a-figure a-figure--raster">/);
  assert.match(html, /<figure class="a-figure"><div class="a-frame"><img[^>]*src="\/images\/b\.svg\?w=800"/);
});

test('inline images also get lazy async attributes without changing the paragraph', async () => {
  const { html } = await renderMarkdown('前面 ![图标](/icon.png) 后面');
  assert.match(html, /<p>前面 <img[^>]*class="a-img"[^>]*loading="lazy"[^>]*decoding="async"[^>]*> 后面<\/p>/);
  assert.doesNotMatch(html, /<figure/);
});

test('empty alt keeps the figure but drops the caption', async () => {
  const { html } = await renderMarkdown('![](/images/demo/diary-line.svg)');
  assert.match(html, /<figure class="a-figure">/);
  assert.doesNotMatch(html, /<figcaption/);
});

test('a standalone image line splits out of a text paragraph', async () => {
  const { html } = await renderMarkdown('说明\n![图注](/images/demo/diary-line.svg)');
  assert.match(html, /^<p>说明<\/p>\n<figure class="a-figure"><div class="a-frame">/);
  assert.match(html, /<figcaption>图注<\/figcaption>/);
  assert.doesNotMatch(html, /<p>[^<]*<img/);
});

test('a standalone image line equals a blank-line separated image paragraph', async () => {
  const tight = await renderMarkdown('说明\n![图注](/images/demo/diary-line.svg)\n说明');
  const loose = await renderMarkdown('说明\n\n![图注](/images/demo/diary-line.svg)\n\n说明');
  assert.equal(tight.html, loose.html);
  assert.match(tight.html, /^<p>说明<\/p>\n<figure class="a-figure">[\s\S]*<\/figure>\n<p>说明<\/p>$/);
});

test('consecutive standalone image lines each become a figure', async () => {
  const { html } = await renderMarkdown('![一](/images/demo/a.svg)\n![二](/images/demo/b.svg)');
  assert.equal((html.match(/<figure class="a-figure">/g) ?? []).length, 2);
  assert.match(html, /<figcaption>一<\/figcaption>/);
  assert.match(html, /<figcaption>二<\/figcaption>/);
  assert.doesNotMatch(html, /a-figure-row/);
  assert.doesNotMatch(html, /<p>/);
});

test('images separated by a space share a figure row', async () => {
  const { html } = await renderMarkdown('![左](/images/demo/a.svg) ![右](/images/demo/b.svg)');
  assert.match(html, /^<div class="a-figure-row"><figure class="a-figure">/);
  assert.equal((html.match(/<figure class="a-figure">/g) ?? []).length, 2);
  assert.match(html, /<figcaption>左<\/figcaption>/);
  assert.match(html, /<figcaption>右<\/figcaption>/);
});

test('three images on one line form a row of three', async () => {
  const { html } = await renderMarkdown('![](/images/demo/a.svg) ![](/images/demo/b.svg) ![](/images/demo/c.svg)');
  assert.match(html, /^<div class="a-figure-row">/);
  assert.equal((html.match(/<figure class="a-figure">/g) ?? []).length, 3);
  assert.equal((html.match(/<div class="a-frame">/g) ?? []).length, 3);
});

test('a hard break before a standalone image is dropped', async () => {
  const { html } = await renderMarkdown('说明  \n![](/images/demo/a.svg)');
  assert.match(html, /^<p>说明<\/p>\n<figure class="a-figure">/);
  assert.doesNotMatch(html, /<br>/);
});

test('text, row and text keep their order', async () => {
  const { html } = await renderMarkdown('上\n![左](/images/demo/a.svg) ![右](/images/demo/b.svg)\n下');
  assert.match(html, /^<p>上<\/p>\n<div class="a-figure-row">/);
  assert.match(html, /<\/div>\n<p>下<\/p>$/);
});

test('text-only paragraphs are left untouched', async () => {
  const { html } = await renderMarkdown('第一行\n第二行');
  assert.equal(html, '<p>第一行\n第二行</p>');
});

test('external links open in a new tab with noopener', async () => {
  const { html } = await renderMarkdown('[外链](https://example.com/post "悬停标题")');
  assert.match(html, /<a href="https:\/\/example\.com\/post" title="悬停标题" target="_blank" rel="noopener">外链<\/a>/);
});

test('same-host absolute links stay in the current tab', async () => {
  const href = `${siteConfig.url}/post/hello`;
  const { html } = await renderMarkdown(`[站内绝对地址](${href})`);
  assert.ok(html.includes(`href="${href}"`), '同 host 绝对地址应保留原 href');
  assert.doesNotMatch(html, /target=|rel=/);
});

test('internal paths, anchors and mailto links are left untouched', async () => {
  const { html } = await renderMarkdown('[站内](/posts) [锚点](#h-小节) [邮件](mailto:hi@example.com)');
  assert.doesNotMatch(html, /target=|noopener/);
});
