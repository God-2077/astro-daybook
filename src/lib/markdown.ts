import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { MarkdownHeading } from 'astro';

import { filterHeadings, rehypePlugins, remarkPlugins, SHIKI_CONFIG } from './markdown-pipeline';

/**
 * 详情页正文的 Markdown 管线。
 *
 * 目标：详情页正文与索引页摘要共用同一套 Markdown 渲染规则，保证标题、代码块、表格、
 * 图片、脚注等元素在各类正文里表现一致。
 * 插件本体与 MDX 共用 `markdown-pipeline.ts`，这里只负责运行时 processor 的生命周期。
 */

let processorPromise: ReturnType<typeof createMarkdownProcessor> | undefined;

function getProcessor() {
  processorPromise ??= createMarkdownProcessor({
    remarkPlugins,
    rehypePlugins,
    shikiConfig: SHIKI_CONFIG,
  });
  return processorPromise;
}

export interface RenderedMarkdown {
  html: string;
  headings: MarkdownHeading[];
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const processor = await getProcessor();
  const result = await processor.render(markdown);
  return {
    html: result.code,
    headings: filterHeadings(result.metadata.headings),
  };
}
