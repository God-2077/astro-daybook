import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateReadingTime, extractDescription } from '../../src/lib/content/description';
import { contentFormat, stripMdx } from '../../src/lib/content/format';

test('contentFormat detects mdx case-insensitively', () => {
  assert.equal(contentFormat('src/content/post/a.mdx'), 'mdx');
  assert.equal(contentFormat('src/content/post/a.MDX'), 'mdx');
  assert.equal(contentFormat('src/content/post/a.md'), 'md');
  assert.equal(contentFormat('src/content/post/a.markdown'), 'md');
});

test('stripMdx removes ESM and JSX expressions but keeps prose and images', () => {
  const source = [
    "import Card from '../Card.astro';",
    'export const meta = {',
    "  title: 'Demo',",
    '};',
    '',
    '正文有 {1 + 1} 与 {/* 注释 */}。',
    '',
    '![图](/images/demo/diary-line.svg)',
  ].join('\n');
  const stripped = stripMdx(source);
  assert.doesNotMatch(stripped, /import|export|1 \+ 1|注释/);
  assert.match(stripped, /正文有/);
  assert.match(stripped, /!\[图\]/);
});

test('MDX descriptions ignore ESM and expressions', () => {
  const source = ["import Card from '../Card.astro';", '', '# 标题', '', '正文 {1 + 42}。'].join('\n');
  const text = extractDescription(source, 200, 'mdx');
  assert.match(text, /标题/);
  assert.match(text, /正文/);
  assert.doesNotMatch(text, /import|export|1 \+ 42|Card/);
});

test('MDX reading time ignores ESM and expressions', () => {
  const source = ["import Card from '../Card.astro';", '', '中'.repeat(900)].join('\n');
  assert.equal(estimateReadingTime(source, 'mdx'), 3);
  assert.equal(estimateReadingTime('{1 + 1}', 'mdx'), 1);
});
