export interface PageSlice<T> {
  page: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

export function totalPagesFor(count: number, perPage: number): number {
  return Math.max(1, Math.ceil(count / perPage));
}

export function slicePage<T>(items: T[], page: number, perPage: number): PageSlice<T> | null {
  const totalPages = totalPagesFor(items.length, perPage);
  if (page < 1 || page > totalPages) return null;
  const start = (page - 1) * perPage;
  return {
    page,
    totalPages,
    totalItems: items.length,
    items: items.slice(start, start + perPage),
  };
}

/** 第一页不带 /page/1，返回规范化路径。 */
export function pageHref(base: string, page: number): string {
  if (page <= 1) return base;
  return `${base.replace(/\/$/, '')}/page/${page}`;
}

export type PagerItem = number | 'gap';

/**
 * 页码按钮组合（N = 总页数，n = 当前页）：
 * - N ≤ 4：显示全部页码，不使用省略号；
 * - n = 1：1、2、…、N；
 * - 2 ≤ n ≤ N−2：n−1、n、n+1、…、N；
 * - n = N−1：1、…、n−1、n、N；
 * - n = N：1、…、n−1、n。
 *
 * `'gap'` 由组件渲染成省略号，其余为具体页码。
 */
export function pagerItems(page: number, totalPages: number): PagerItem[] {
  const current = Math.min(Math.max(1, page), Math.max(1, totalPages));
  if (totalPages <= 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (current === 1) return [1, 2, 'gap', totalPages];
  if (current <= totalPages - 2) return [current - 1, current, current + 1, 'gap', totalPages];
  if (current === totalPages - 1) return [1, 'gap', current - 1, current, totalPages];
  return [1, 'gap', current - 1, current];
}
