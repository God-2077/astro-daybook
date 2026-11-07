import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import type { AstroIntegration, AstroUserConfig } from 'astro';
import { defineConfig, envField } from 'astro/config';
import { type ContentSiteContext, loadSiteContext, type SiteContext } from './scripts/site-context';
import { siteConfig as themeSiteConfig } from './src/config/site';
import { rehypePlugins, remarkPlugins, SHIKI_CONFIG } from './src/lib/markdown-pipeline';

const root = fileURLToPath(new URL('.', import.meta.url));
const context = await loadSiteContext(root, themeSiteConfig);
const src = fileURLToPath(new URL('./src', import.meta.url));

function normalizeModuleId(id: string): string {
  const clean = id.split('?')[0];
  if (clean.startsWith('file://')) {
    return path.normalize(fileURLToPath(clean)).replace(/\\/g, '/');
  }
  return path.normalize(clean).replace(/\\/g, '/');
}

/**
 * 内容模式下覆盖主题里的两个真实配置文件。
 *
 * 保留 src/config/site.ts / links.ts 作为主题默认配置，页面和 Node 测试仍然
 * 可以直接 import 它们；只有本次 Astro 构建把解析后的内容仓库配置注入进来。
 */
function contentConfigPlugin(siteContext: ContentSiteContext) {
  // 页面与 Node 测试导入的是主题里的 src/config/site.ts / links.ts；
  // 内容模式下由这个插件在加载时替换成内容仓库的配置。
  const modules = new Map<string, string>([
    [
      normalizeModuleId(path.join(root, 'src', 'config', 'site.ts')),
      `export const siteConfig = ${JSON.stringify(siteContext.siteConfig)};`,
    ],
    [
      normalizeModuleId(path.join(root, 'src', 'config', 'links.ts')),
      `export const linksConfig = ${JSON.stringify(siteContext.linksConfig)};`,
    ],
  ]);
  const watchFiles = [siteContext.siteConfigFile, siteContext.linksConfigFile];
  const watch = (pluginContext: { addWatchFile(file: string): void }) => {
    for (const file of watchFiles) pluginContext.addWatchFile(file);
  };

  return {
    name: 'daybook:content-config',
    enforce: 'pre' as const,
    buildStart(this: { addWatchFile(file: string): void }) {
      watch(this);
    },
    load(this: { addWatchFile(file: string): void }, id: string) {
      const source = modules.get(normalizeModuleId(id));
      if (source === undefined) return null;
      watch(this);
      return source;
    },
    configureServer(server: { watcher: { add(file: string | string[]): void } }) {
      // 内容仓库可能位于主题项目根之外；显式加入 watcher，配置变化才能触发
      // Astro dev 的自动重启（见下方 contentConfigWatchIntegration）。
      server.watcher.add(watchFiles);
    },
  };
}

/**
 * 把内容仓库配置加入 Astro 的 watchFiles。
 *
 * Astro 7 的 dev 重启逻辑会检查 settings.watchFiles；命中后重新执行
 * astro.config.ts，从而重新读取 content/config/{site,links}.ts。
 * 只监听配置，不监听 Markdown，避免每次写文章都重启整个 dev server。
 */
function contentConfigWatchIntegration(siteContext: SiteContext): AstroIntegration {
  return {
    name: 'daybook:content-config-watch',
    hooks: {
      'astro:config:setup': ({ addWatchFile }) => {
        if (siteContext.mode !== 'content') return;
        addWatchFile(siteContext.siteConfigFile);
        addWatchFile(siteContext.linksConfigFile);
      },
    },
  };
}

const markdown: NonNullable<AstroUserConfig['markdown']> = {
  processor: unified({
    remarkPlugins,
    rehypePlugins,
  }),
  shikiConfig: SHIKI_CONFIG,
};

// 内容模式使用独立缓存目录：Astro 会据此切换内容层缓存，避免与主题模式的集合条目混在一起。
const contentCacheDir = context.mode === 'content' ? path.join(root, 'node_modules', '.astro-content') : undefined;

export default defineConfig({
  ...(contentCacheDir ? { cacheDir: contentCacheDir } : {}),
  site: context.siteConfig.url,
  publicDir: context.publicDir,
  output: 'static',
  trailingSlash: 'never',
  env: {
    schema: {
      // lightGallery 授权 key：客户端要用，写在 .env 里即可（见 docs/configuration.md 的「图片放大」）。
      PUBLIC_LIGHTGALLERY_LICENSE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '0000-0000-000-0000',
      }),
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  build: {
    format: 'directory',
  },
  markdown,
  integrations: [react(), mdx(), contentConfigWatchIntegration(context)],
  vite: {
    resolve: {
      alias: {
        '@': src,
      },
    },
    ...(context.mode === 'content'
      ? {
          server: {
            fs: {
              allow: [path.resolve(root), context.contentRoot],
            },
          },
          plugins: [contentConfigPlugin(context)],
        }
      : {}),
  },
});
