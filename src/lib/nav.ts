import type { NavItem } from '../types/config';

/**
 * 按 `href` 从导航配置中取一个紧凑标题。
 *
 * 底部移动端导航只有四个固定入口，不能直接渲染完整导航树，因此：
 * - 一级链接命中时返回链接自身的 `title`；
 * - 分组子项命中时返回分组标题（例如 `/posts` 命中「文章」分组，返回「文章」）；
 * - 都没有命中时返回 `undefined`，由调用方决定回退文案。
 *
 * 一级链接优先于分组，避免同一路径同时出现在两处时取到分组名。
 */
export function navLabelFor(nav: NavItem[], href: string): string | undefined {
  for (const item of nav) {
    if (!('items' in item) && item.link === href) return item.title;
  }

  for (const item of nav) {
    if ('items' in item && item.items.some((link) => link.link === href)) return item.title;
  }

  return undefined;
}

/**
 * 判断一个导航链接是否命中当前路径。
 *
 * - `/` 只精确命中首页；
 * - 其余路径命中自身与子路径；
 * - `/posts` 同时命中 `/post/...`（文章详情页没有 `/posts` 前缀）。
 * - 外链永不命中。
 */
export function isNavLinkActive(link: string, pathname: string): boolean {
  if (/^https?:\/\//i.test(link)) return false;
  const path = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
  if (link === '/') return path === '/';
  return path === link || path.startsWith(`${link}/`) || (link === '/posts' && path.startsWith('/post/'));
}
