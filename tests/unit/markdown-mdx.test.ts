import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '@mdx-js/mdx';
import remarkDirective from 'remark-directive';

import { remarkDirectives, remarkMermaid } from '../../src/lib/markdown-directives';

const md = (...lines: string[]): string => lines.join('\n');

async function compileMdx(source: string): Promise<string> {
  return String(
    await compile(source, {
      remarkPlugins: [remarkDirective, [remarkDirectives, 'zh_CN'], [remarkMermaid, 'zh_CN']],
      jsx: true,
      jsxImportSource: 'astro',
      elementAttributeNameCase: 'html',
    }),
  );
}

test('MDX compiles container alerts and folds to intrinsic JSX', async () => {
  const alert = await compileMdx(md(':::note[标题 **加粗**]', '内容', ':::'));
  assert.ok(alert.includes('_components.blockquote'));
  assert.ok(alert.includes('a-md-alert a-md-alert--note'));
  assert.ok(alert.includes('_components.strong'));

  const fold = await compileMdx(md(':::fold[展开]', '内容', ':::'));
  assert.ok(fold.includes('_components.details'));
  assert.ok(fold.includes('_components.summary'));
  assert.ok(fold.includes('a-md-fold'));
});

test('MDX compiles media and music leaf directives', async () => {
  const youtube = await compileMdx('::youtube{id="R401j1QAvEg"}');
  assert.ok(youtube.includes('a-md-embed'));
  assert.ok(youtube.includes('data-embed-id="R401j1QAvEg"'));
  assert.ok(youtube.includes('a-md-embed-facade'));

  const meting = await compileMdx('::meting{id="1234567890" type="playlist"}');
  assert.ok(meting.includes('a-music'));
  assert.ok(meting.includes('data-meting-source'));
});

test('MDX compiles the music YAML container', async () => {
  const html = await compileMdx(
    md(':::music', '- name: 光るなら', '  artist: Goose house', '  url: https://example.com/a.mp3', ':::'),
  );
  assert.ok(html.includes('a-music'));
  assert.ok(html.includes('data-music-track'));
  assert.ok(html.includes('光るなら'));
});

test('MDX compiles mermaid fences to figures', async () => {
  const html = await compileMdx(md('```mermaid', 'sequenceDiagram', '    A->>B: Hi', '```'));
  assert.ok(html.includes('a-mermaid'));
  assert.ok(html.includes('a-mermaid-source'));
  assert.ok(!html.includes('language-mermaid'));
});

test('MDX compiles inline directives to intrinsic tags', async () => {
  const html = await compileMdx(
    ':underline[下划线] :ins[波浪]{type="wavy"} :kbd[Ctrl] :hidden[隐藏] :abbr[HTML]{title="HyperText Markup Language"}',
  );
  assert.ok(html.includes('_components.u'));
  assert.ok(html.includes('_components.ins'));
  assert.ok(html.includes('_components.kbd'));
  assert.ok(html.includes('_components.abbr'));
  assert.ok(html.includes('a-md-hidden'));
});
