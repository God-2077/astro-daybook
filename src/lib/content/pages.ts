import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { ContentError } from '../errors';
import { FIXED_ROUTES, getAllEntries, RESERVED_PREFIXES } from './entries';

export type PageEntry = CollectionEntry<'pagesCollection'>;

/**
 * 独立页面的 URL 是集合 id（相对 src/content/pages 的文件名，含子目录）。
 *
 * 不把 index 重写为父路径：content/pages/notes/index.mdx 对应 /notes/index。
 */
export function pageUrl(id: string): string {
  return `/${id.replace(/^\/+|\/+$/g, '')}`;
}

let pagesPromise: Promise<PageEntry[]> | undefined;

/**
 * 读取页面集合并校验 URL。
 *
 * 这里同时读取一次 getAllEntries()，把内容详情 URL 纳入冲突检查：
 * 页面路由是根级 rest 路由，不能与 /daily/**、/post/** 或固定路由重叠。
 */
export function getPageEntries(): Promise<PageEntry[]> {
  pagesPromise ??= loadPages();
  return pagesPromise;
}

async function loadPages(): Promise<PageEntry[]> {
  const pages = await getCollection('pagesCollection');
  const contentUrls = new Set((await getAllEntries()).map((entry) => entry.url));

  for (const page of pages) {
    const id = page.id.replace(/^\/+|\/+$/g, '');
    const file = page.filePath ?? page.id;

    if (!id) {
      throw new ContentError(file, '独立页面 id 不能为空');
    }
    if (/[?#\\]/.test(id)) {
      throw new ContentError(file, `独立页面 id 不能包含 ?、# 或反斜杠：${page.id}`);
    }
    if (id.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new ContentError(file, `独立页面 id 含非法路径段：${page.id}`);
    }

    const url = pageUrl(id);
    if (FIXED_ROUTES.has(url)) {
      throw new ContentError(file, `独立页面 URL ${url} 与固定路由冲突；请修改文件名`);
    }
    const reserved = RESERVED_PREFIXES.find((prefix) => url.startsWith(prefix));
    if (reserved) {
      throw new ContentError(file, `独立页面 URL ${url} 与保留路由前缀 ${reserved} 冲突；请修改文件名`);
    }
    if (contentUrls.has(url)) {
      throw new ContentError(file, `独立页面 URL ${url} 与内容详情 URL 冲突；请修改文件名`);
    }
  }

  return pages;
}
