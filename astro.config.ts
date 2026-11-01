import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import type { AstroUserConfig } from 'astro';
import { defineConfig, envField } from 'astro/config';

import { siteConfig } from './src/config/site';
import daybook from './src/integrations/daybook';
import { rehypePlugins, remarkPlugins, SHIKI_CONFIG } from './src/lib/markdown-pipeline';

const src = fileURLToPath(new URL('./src', import.meta.url));

const markdown: NonNullable<AstroUserConfig['markdown']> = {
  processor: unified({
    remarkPlugins,
    rehypePlugins,
  }),
  shikiConfig: SHIKI_CONFIG,
};

export default defineConfig({
  site: siteConfig.url,
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
  integrations: [react(), mdx(), daybook()],
  vite: {
    resolve: {
      alias: {
        '@': src,
      },
    },
  },
});
