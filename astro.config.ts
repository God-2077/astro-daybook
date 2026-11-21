import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import type { AstroIntegration, AstroUserConfig } from 'astro';
import { defineConfig, envField } from 'astro/config';
import { type ContentSiteContext, loadSiteContext, type SiteContext } from './scripts/site-context';
import { siteConfig as themeSiteConfig } from './src/config/site';
import { createMarkdownPipeline, SHIKI_CONFIG } from './src/lib/markdown-pipeline';
import { TWIKOO_LOCALE_BASE, twikooLocaleFile } from './src/lib/twikoo-locale';

const root = fileURLToPath(new URL('.', import.meta.url));
const context = await loadSiteContext(root, themeSiteConfig);
const src = fileURLToPath(new URL('./src', import.meta.url));

// Twikoo 2.x 的 package.json exports 只暴露主入口，组件里 `twikoo/dist/twikoo.css?inline`
// 需要绕过 exports 限制；语言分片也位于同一个 dist 目录下。
const requireFromTheme = createRequire(import.meta.url);
const twikooDistDir = path.dirname(requireFromTheme.resolve('twikoo'));
const twikooLocalesDir = path.join(twikooDistDir, 'locales');

// 运行时只使用 comments.twikoo.lang（缺省值由 siteConfig.lang 推导），因此只输出它需要的分片。
const twikooLocaleFiles = [twikooLocaleFile(context.siteConfig.comments.twikoo.lang)].filter(
  (file): file is string => file !== null,
);

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

/**
 * Twikoo 2.x 把非内置语言拆成运行时分片，初始化时从
 * `${localeBaseUrl}/locales/<lang>.js` 动态加载。开发时直接从 node_modules
 * 返回当前语言的分片，构建时只复制到 `dist/js/twikoo/locales/`。内置语言
 * （zh-CN / en）没有分片，不创建目录；也不依赖 publicDir（内容模式下
 * publicDir 位于内容仓库）。
 */
function twikooLocalesIntegration(localeFiles: string[]): AstroIntegration {
  const urlPrefix = `/${TWIKOO_LOCALE_BASE}/locales/`;
  const allowedFiles = new Set(localeFiles);

  return {
    name: 'daybook:twikoo-locales',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const pathname = req.url?.split('?')[0];
          if (!pathname?.startsWith(urlPrefix)) return next();
          const file = path.basename(pathname);
          if (!/^[A-Za-z0-9-]+\.js$/.test(file) || !allowedFiles.has(file)) return next();
          const filePath = path.join(twikooLocalesDir, file);
          if (!fs.existsSync(filePath)) return next();
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.end(fs.readFileSync(filePath));
        });
      },
      'astro:build:done': async ({ dir }) => {
        if (localeFiles.length === 0) return;
        const targetDir = path.join(fileURLToPath(dir), TWIKOO_LOCALE_BASE, 'locales');
        await fs.promises.mkdir(targetDir, { recursive: true });
        for (const file of localeFiles) {
          await fs.promises.copyFile(path.join(twikooLocalesDir, file), path.join(targetDir, file));
        }
      },
    },
  };
}

const pipeline = createMarkdownPipeline(context.siteConfig.lang);

const markdown: NonNullable<AstroUserConfig['markdown']> = {
  processor: unified(pipeline),
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
  integrations: [react(), mdx(), contentConfigWatchIntegration(context), twikooLocalesIntegration(twikooLocaleFiles)],
  vite: {
    resolve: {
      alias: {
        '@': src,
        '@mdx/client': path.join(src, 'lib', 'mdx', 'client.ts'),
        '@mdx': path.join(src, 'lib', 'mdx', 'index.ts'),
        'twikoo/dist': twikooDistDir,
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
