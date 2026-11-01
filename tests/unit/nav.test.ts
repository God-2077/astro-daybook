import assert from 'node:assert/strict';
import test from 'node:test';

import { isNavLinkActive, navLabelFor } from '../../src/lib/nav';
import type { NavItem } from '../../src/types/config';

const nav: NavItem[] = [
  { title: '日记', link: '/' },
  {
    title: '文章',
    items: [
      { title: '全部文章', link: '/posts' },
      { title: '归档', link: '/archives' },
    ],
  },
  { title: '友链', link: '/friends' },
];

test('navLabelFor returns a top-level link title', () => {
  assert.equal(navLabelFor(nav, '/'), '日记');
  assert.equal(navLabelFor(nav, '/friends'), '友链');
});

test('navLabelFor returns the group title for a child link', () => {
  assert.equal(navLabelFor(nav, '/posts'), '文章');
  assert.equal(navLabelFor(nav, '/archives'), '文章');
});

test('navLabelFor prefers a top-level link over a group with the same href', () => {
  const mixed: NavItem[] = [
    { title: '文章', items: [{ title: '全部文章', link: '/posts' }] },
    { title: '文章首页', link: '/posts' },
  ];
  assert.equal(navLabelFor(mixed, '/posts'), '文章首页');
});

test('navLabelFor returns undefined for an unknown href', () => {
  assert.equal(navLabelFor(nav, '/missing'), undefined);
  assert.equal(navLabelFor([], '/'), undefined);
});

test('isNavLinkActive matches sections, post details and trailing slashes', () => {
  assert.equal(isNavLinkActive('/posts', '/posts'), true);
  assert.equal(isNavLinkActive('/posts', '/posts/2'), true);
  assert.equal(isNavLinkActive('/posts', '/post/hello'), true);
  assert.equal(isNavLinkActive('/posts', '/posts-extra'), false);
  assert.equal(isNavLinkActive('/posts', '/posts/2/'), true);

  assert.equal(isNavLinkActive('/', '/'), true);
  assert.equal(isNavLinkActive('/', '/about'), false);
  assert.equal(isNavLinkActive('/about', '/about/'), true);
  assert.equal(isNavLinkActive('/about', '/about/team'), true);
  assert.equal(isNavLinkActive('/about', '/friends'), false);

  assert.equal(isNavLinkActive('https://example.com', 'https://example.com'), false);
});
