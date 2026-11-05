import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  contentBase,
  contentGlobBase,
  relativePathForCollection,
  resolveCollectionBase,
  resolveContentRoot,
} from '../../src/lib/content/paths';

const root = path.resolve(process.cwd(), 'theme-under-test');

test('theme mode resolves to src/content', () => {
  assert.equal(resolveContentRoot(root, undefined), path.join(root, 'src', 'content'));
  for (const value of ['', '0', 'false', 'FALSE', 'off', 'no']) {
    assert.equal(resolveContentRoot(root, value), path.join(root, 'src', 'content'));
  }
});

test('content mode resolves relative to the theme root', () => {
  assert.equal(resolveContentRoot(root, 'content'), path.join(root, 'content'));
  assert.equal(resolveContentRoot(root, '../shared-content'), path.join(path.dirname(root), 'shared-content'));
  assert.equal(resolveCollectionBase(root, 'content', 'post'), path.join(root, 'content', 'post'));
});

test('content root cannot be the theme root', () => {
  assert.throws(() => resolveContentRoot(root, '.'), /不能是主题仓库根目录/);
});

test('collection names are validated', () => {
  assert.throws(() => resolveCollectionBase(root, 'content', 'unknown' as never), /未知内容集合：unknown/);
});

test('relative database paths use the current content root', () => {
  const previous = process.env.CONTENT_REPO;
  try {
    process.env.CONTENT_REPO = '.tmp-content';
    assert.equal(contentBase('daily'), '.tmp-content/daily');
    assert.equal(contentGlobBase('daily'), '.tmp-content/daily');

    process.env.CONTENT_REPO = '../outside';
    assert.equal(contentBase('post'), '../outside/post');
    assert.equal(contentGlobBase('post'), '../outside/post');

    process.env.CONTENT_REPO = 'theme-under-test';
    assert.equal(contentBase('spec'), 'theme-under-test/spec');
  } finally {
    if (previous === undefined) delete process.env.CONTENT_REPO;
    else process.env.CONTENT_REPO = previous;
  }
});

test('file paths are reduced to collection-relative posix paths', () => {
  assert.equal(relativePathForCollection('content\\post\\2026\\hello.md', 'content/post'), '2026/hello.md');
  assert.equal(relativePathForCollection('src/content/daily/2026/01-01.md', './src/content/daily'), '2026/01-01.md');
  assert.equal(relativePathForCollection('elsewhere/file.md', 'src/content/post'), 'file.md');
});

test('cross-drive content roots are rejected on Windows', () => {
  if (process.platform !== 'win32') return;
  assert.throws(() => resolveContentRoot('C:\\theme', 'D:\\content'), /同一盘符/);
});
