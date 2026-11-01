import type { AstroIntegration } from 'astro';
import { removeDraftCustomPages, validateCustomPages } from '../lib/content/custom-pages';

/**
 * Daybook 的构建钩子。
 *
 * 目前承担：
 * - 构建前检查自定义页面是否声明了 PageLayout；
 * - 构建后清理生产环境不应出现的草稿自定义页面。
 *
 * 内容集合内部的 permalink / 导航 / 日期校验由 `src/lib/content/entries.ts`
 * 在首次加载内容时执行（任何页面、RSS、sitemap 都会经过它）。
 */
export default function daybook(): AstroIntegration {
  return {
    name: 'daybook',
    hooks: {
      'astro:build:start': async () => {
        await validateCustomPages();
      },
      'astro:build:done': async ({ dir }) => {
        await removeDraftCustomPages(dir);
      },
    },
  };
}
