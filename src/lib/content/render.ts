import { getCollection, render } from 'astro:content';
import type { MarkdownHeading } from 'astro';

import type { AnyEntry } from '../../types/content';
import { ContentError } from '../errors';
import { renderMarkdown } from '../markdown';
import { filterHeadings } from '../markdown-pipeline';

type RenderResult = Awaited<ReturnType<typeof render>>;

export type RenderedEntry =
  | { format: 'md'; html: string; headings: MarkdownHeading[] }
  | { format: 'mdx'; Content: RenderResult['Content']; headings: MarkdownHeading[] };

async function renderMdxEntry(entry: AnyEntry): Promise<RenderedEntry> {
  if (entry.collection === 'daily') {
    const source = (await getCollection('dailyCollection')).find((item: { id: string }) => item.id === entry.id);
    if (!source) throw new ContentError(entry.filePath, '找不到对应的 dailyCollection 源条目');
    const result = await render(source);
    return { format: 'mdx', Content: result.Content, headings: filterHeadings(result.headings) };
  }

  const source = (await getCollection('postsCollection')).find((item: { id: string }) => item.id === entry.id);
  if (!source) throw new ContentError(entry.filePath, '找不到对应的 postsCollection 源条目');
  const result = await render(source);
  return { format: 'mdx', Content: result.Content, headings: filterHeadings(result.headings) };
}

/**
 * 统一渲染入口：`.md` 走运行时的 Markdown processor，`.mdx` 走 Astro 的
 * `render(entry)` 得到 Content 组件（保留组件 import 与 React hydration）。
 */
export async function renderEntry(entry: AnyEntry): Promise<RenderedEntry> {
  if (entry.format === 'mdx') return renderMdxEntry(entry);

  const result = await renderMarkdown(entry.body);
  return { format: 'md', html: result.html, headings: result.headings };
}
