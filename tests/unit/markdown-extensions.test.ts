import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdown } from '../../src/lib/markdown';

const md = (...lines: string[]): string => lines.join('\n');

test('footnote references use bracketed superscript numbers', async () => {
  const { html } = await renderMarkdown(
    md('这是一个带脚注的句子[^1],这是另一个脚注[^note]。', '', '[^1]: 这是第一个脚注的内容。', '[^note]: 这是命名脚注的内容。'),
  );
  assert.ok(html.includes('aria-label="脚注 1">[1]</a>'));
  assert.ok(html.includes('aria-label="脚注 2">[2]</a>'));
  assert.ok(!html.includes('aria-describedby'));
  assert.ok(html.includes('<section data-footnotes="" class="a-footnotes">'));
});

test('github alerts become themed blockquotes with a default title', async () => {
  const { html } = await renderMarkdown(md('> [!WARNING]', '> 请注意'));
  assert.ok(html.includes('<blockquote class="a-md-alert a-md-alert--warning">'));
  assert.ok(html.includes('class="a-md-alert-title"'));
  assert.ok(html.includes('<use href="#i-warning"></use></svg>警告</p>'));
  assert.ok(html.includes('<p>请注意</p>'));
  assert.ok(!html.includes('[!WARNING]'));
});

test('container alerts keep inline markdown in custom titles', async () => {
  const { html } = await renderMarkdown(md(':::tip[自定义 **标题**]', '内容', ':::'));
  assert.ok(html.includes('<blockquote class="a-md-alert a-md-alert--tip">'));
  assert.ok(html.includes('<use href="#i-bulb"></use></svg>自定义 <strong>标题</strong></p>'));
  assert.ok(html.includes('<p>内容</p>'));
});

test('fold becomes a closed details element', async () => {
  const { html } = await renderMarkdown(md(':::fold[使用提示]', '折叠内容', ':::'));
  assert.ok(html.startsWith('<details class="a-md-fold">'));
  assert.ok(html.includes('<summary class="a-md-fold-summary">使用提示</summary>'));
  assert.ok(html.includes('<p>折叠内容</p>\n</details>'));
  assert.ok(!html.includes('<details open'));
});

test('github leaf directives render a static card shell', async () => {
  const { html } = await renderMarkdown('::github{repo="God-2077/astro-daybook"}');
  assert.ok(html.includes('<a class="a-md-github" data-github-card="" data-github-repo="God-2077/astro-daybook"'));
  assert.ok(html.includes('href="https://github.com/God-2077/astro-daybook"'));
  assert.ok(html.includes('class="a-md-github-owner">God-2077</span>'));
  assert.ok(html.includes('class="a-md-github-repo">astro-daybook</span>'));
  assert.ok(html.includes('data-github-stars'));
  assert.ok(html.includes('data-github-forks'));
  assert.ok(html.includes('data-github-license'));
});

test('youtube and bilibili leaf directives render poster facades', async () => {
  const youtube = (await renderMarkdown('::youtube{id="R401j1QAvEg"}')).html;
  assert.ok(
    youtube.includes('<figure class="a-md-embed" data-embed="" data-embed-provider="youtube" data-embed-id="R401j1QAvEg"'),
  );
  assert.ok(
    youtube.includes('class="a-md-embed-facade" data-embed-facade="" href="https://www.youtube.com/watch?v=R401j1QAvEg"'),
  );
  assert.ok(youtube.includes('https://i.ytimg.com/vi/R401j1QAvEg/hqdefault.jpg'));
  assert.ok(!youtube.includes('data-embed-autoload'));
  assert.ok(!youtube.includes('<iframe'));

  const bilibili = (await renderMarkdown('::bilibili{id="BV1sK4y1Z7KG"}')).html;
  assert.ok(bilibili.includes('data-embed-provider="bilibili" data-embed-id="BV1sK4y1Z7KG"'));
  assert.ok(bilibili.includes('href="https://www.bilibili.com/video/BV1sK4y1Z7KG"'));
  assert.ok(bilibili.includes('class="a-md-embed-id">BV1sK4y1Z7KG</span>'));
  assert.ok(!bilibili.includes('<iframe'));
});

test('youtube autoload=false delays iframe creation until a click', async () => {
  const { html } = await renderMarkdown('::youtube{id="R401j1QAvEg" autoload="false"}');
  assert.ok(html.includes('data-embed-autoload="false"'));
  assert.ok(html.includes('class="a-md-embed-facade"'));
  assert.ok(!html.includes('<iframe'));
});

test('meting leaf directive renders the shared music player shell', async () => {
  const { html } = await renderMarkdown(
    '::meting{id="1234567890" server="netease" type="playlist" autoPlayNext="true" playlistExpand="true"}',
  );
  assert.ok(html.includes('<section class="a-music" aria-label="音乐播放器" data-music=""'));
  assert.ok(html.includes('data-auto-next="true"'));
  assert.ok(html.includes('data-open="true"'));
  assert.ok(html.includes('data-meting-pending="true"'));
  assert.ok(html.includes('data-meting-source="{&#x22;query&#x22;'));
  assert.ok(!html.includes('data-music-track'));
});

test('music container reads a YAML playlist and renders tracks', async () => {
  const { html } = await renderMarkdown(
    md(
      ':::music',
      '- name: 光るなら',
      '  artist: Goose house',
      '  url: https://example.com/a.mp3',
      '  cover: https://example.com/a.jpg',
      '  lrc: https://example.com/a.lrc',
      ':::',
    ),
  );
  assert.ok(html.includes('<section class="a-music"'));
  assert.ok(html.includes('data-single="true"'));
  assert.ok(html.includes('data-url="https://example.com/a.mp3"'));
  assert.ok(html.includes('data-cover="https://example.com/a.jpg"'));
  assert.ok(html.includes('data-lrc="https://example.com/a.lrc"'));
  assert.ok(html.includes('<span class="a-music-track-name">光るなら</span>'));
  assert.ok(html.includes('aria-current="true"'));
});

test('inline directives render underline, keyboard, hidden text and abbreviation', async () => {
  const { html } = await renderMarkdown(
    ':underline[下划线] :ins[波浪]{type="wavy"} :ins[描点]{type="dot"} :ins[虚线]{type="dashed"} :ins[双线]{type="double"} :kbd[Ctrl] :hidden[隐藏] :hidden[黑条]{type="background"} :abbr[HTML]{title="HyperText Markup Language"}',
  );
  assert.ok(html.includes('<u data-type="line" class="a-md-underline">下划线</u>'));
  assert.ok(html.includes('<ins data-type="wavy" class="a-md-underline">波浪</ins>'));
  assert.ok(html.includes('<ins data-type="dot" class="a-md-underline">描点</ins>'));
  assert.ok(html.includes('<ins data-type="dashed" class="a-md-underline">虚线</ins>'));
  assert.ok(html.includes('<ins data-type="double" class="a-md-underline">双线</ins>'));
  assert.ok(html.includes('<kbd class="a-md-kbd">Ctrl</kbd>'));
  assert.ok(html.includes('<span data-type="blur" tabindex="0" class="a-md-hidden">隐藏</span>'));
  assert.ok(html.includes('<span data-type="background" tabindex="0" class="a-md-hidden">黑条</span>'));
  assert.ok(html.includes('<abbr title="HyperText Markup Language" class="a-md-abbr">HTML</abbr>'));
});

test('code blocks get a wrapper and a copy button', async () => {
  const { html } = await renderMarkdown(md('\u0060\u0060\u0060js', 'const x = 1;', '\u0060\u0060\u0060'));
  assert.ok(html.startsWith('<div class="a-code-block"><button type="button" class="a-code-copy" data-code-copy="" hidden'));
  assert.ok(html.includes('aria-label="复制代码"'));
  assert.ok(html.includes('data-label-copied="已复制"'));
  assert.ok(html.includes('</button><pre class="astro-code'));
  assert.ok(html.includes('<code>'));
});

test('mermaid fences become figures with the source kept for the client', async () => {
  const { html } = await renderMarkdown(md('```mermaid', 'sequenceDiagram', '    A->>B: Hi', '```'));
  assert.ok(html.startsWith('<figure class="a-mermaid" data-mermaid="">'));
  assert.ok(html.includes('<div class="a-mermaid-tools" data-mermaid-tools="" hidden>'));
  assert.ok(html.includes('data-mermaid-action="zoom-in"'));
  assert.ok(html.includes('data-mermaid-action="zoom-out"'));
  assert.ok(html.includes('data-mermaid-action="reset"'));
  assert.ok(html.includes('data-mermaid-action="fullscreen"'));
  assert.ok(html.includes('data-label-fullscreen="全屏查看"'));
  assert.ok(html.includes('data-label-close="退出全屏"'));
  assert.ok(html.includes('<pre class="a-mermaid-source">sequenceDiagram'));
  assert.ok(html.includes('A->>B: Hi</pre>'));
  assert.ok(
    html.includes('<div class="a-mermaid-viewport" data-mermaid-viewport=""><div class="a-mermaid-canvas"></div></div>'),
  );
  assert.ok(html.includes('<p class="a-mermaid-error" hidden>'));
  assert.ok(!html.includes('language-mermaid'));
  assert.ok(!html.includes('astro-code'));
});

test('unknown directives fall back to their content with a warning', async () => {
  const container = await renderMarkdown(md(':::wat', '正文', ':::'));
  assert.equal(container.html, '<p>正文</p>');
  const inline = await renderMarkdown(':wat[保留内容]');
  assert.equal(inline.html, '<p>保留内容</p>');
});

test('invalid directive attributes reject the build', async () => {
  await assert.rejects(
    () => renderMarkdown('::youtube{id="bad id"}'),
    (error: Error) => error.message.includes('id 不合法'),
  );
  await assert.rejects(
    () => renderMarkdown('::meting{id="1" type="search"}'),
    (error: Error) => error.message.includes('type 只能是'),
  );
  await assert.rejects(
    () => renderMarkdown(md(':::music', '- name: no-url', ':::')),
    (error: Error) => error.message.includes('url is required'),
  );
  await assert.rejects(
    () => renderMarkdown(md(':::github{repo="a/b"}', ':::')),
    (error: Error) => error.message.includes('叶子'),
  );
  await assert.rejects(
    () => renderMarkdown('::youtube{id="R401j1QAvEg" autoload="yes"}'),
    (error: Error) => error.message.includes('autoload 只接受'),
  );
  await assert.rejects(
    () => renderMarkdown(':underline[文本]{type="dotted"}'),
    (error: Error) => error.message.includes('type 只能是'),
  );
});
