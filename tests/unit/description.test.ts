import assert from 'node:assert/strict';
import test from 'node:test';

import { t } from '../../src/i18n/current';
import { estimateReadingTime, extractDescription, getDescription } from '../../src/lib/content/description';
import type { DailyEntry } from '../../src/types/content';

test('extractDescription strips markdown, links, images and code fences', () => {
  const source = [
    '# 标题',
    '',
    '**粗体**与[链接](https://example.com)，还有 `行内代码`。',
    '',
    '```ts',
    'const hidden = true;',
    '```',
    '',
    '![图](/x.png)',
    '',
    '最后一段。',
  ].join('\n');
  const text = extractDescription(source, 200);
  assert.doesNotMatch(text, /```|const hidden|https:\/\/example\.com|\*\*|!\[/);
  assert.match(text, /粗体与链接/);
  assert.match(text, /最后一段/);
});

test('extractDescription truncates by Unicode characters and appends an ellipsis', () => {
  const text = '一'.repeat(220);
  const result = extractDescription(text, 200);
  assert.equal(Array.from(result).length, 201);
  assert.ok(result.endsWith('…'));
});

test('password content never auto-extracts its body', () => {
  const entry = {
    collection: 'daily',
    id: 'locked',
    filePath: 'locked.md',
    body: '这是绝对不能出现在描述里的正文。',
    slug: 'locked',
    url: '/daily/locked',
    data: {
      title: '加密日记',
      date: new Date('2026-01-01T00:00:00Z'),
      draft: false,
      pin: false,
      hideFrom: [],
      comments: true,
      categories: [],
      tags: [],
      keywords: [],
      password: 'paper2024',
      description: undefined,
    },
  } as unknown as DailyEntry;
  assert.equal(getDescription(entry), t('description.lockedDaily', { diary: '日记' }));
});

test('reading time is at least one minute and ignores code blocks', () => {
  assert.equal(estimateReadingTime('短句。'), 1);
  assert.equal(estimateReadingTime('中'.repeat(900)), 3);
  assert.equal(estimateReadingTime(`\`\`\`\n${'中'.repeat(4000)}\n\`\`\``), 1);
});
