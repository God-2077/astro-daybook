import { z } from 'astro/zod';
import type { HideFrom } from '../../types/content';

const HIDE_FROM = ['home', 'rss', 'archive', 'search', 'tag', 'category', 'sitemap'] as const satisfies readonly HideFrom[];

/**
 * 注意：这里故意不使用 `z.coerce.date()`。
 *
 * Astro 的 YAML frontmatter 解析把无时区的 `2023-01-01 10:00:00` 当成 UTC，
 * 这与站点配置时区的语义不一致；因此 schema 只做「结构上是否为日期字符串」
 * 的校验，真正的时区解析在 `src/lib/content/date.ts` 中基于原始 frontmatter
 * 文本执行。任何直接调用 `getCollection()` 的代码都拿不到正确的 Date。
 */
const dateValue = z
  .union([z.string(), z.date()])
  .transform((value) => (typeof value === 'string' ? value : value.toISOString()));

const base = {
  date: dateValue,
  updated: dateValue.optional(),
  description: z.string().optional(),
  slug: z.string().optional(),
  permalink: z.string().optional(),
  draft: z.boolean().default(false),
  pin: z.boolean().default(false),
  password: z.string().min(1, 'password 不能为空').optional(),
  hideFrom: z.array(z.enum(HIDE_FROM)).optional(),
  comments: z.boolean().default(true),
};

export const dailySchema = z
  .object({
    ...base,
    title: z.string().trim().optional(),
    category: z.string().trim().optional(),
    /** 只影响首页条目：为 true 时该篇在首页不显示标题。 */
    hideHomeTitle: z.boolean().default(false),
  })
  .strict();

export const postSchema = z
  .object({
    ...base,
    title: z.string().trim().min(1, 'title 不能为空'),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
  })
  .strict();

/**
 * 独立页面（`src/content/pages`）。
 *
 * 页面 URL 由集合 id 决定，因此不接收 slug/permalink；独立页只由
 * `src/pages/[...page].astro` 渲染并显式包一层 PageLayout，所以不需要 layout。
 */
export const pageSchema = z
  .object({
    title: z.string().trim().min(1, 'title 不能为空'),
    date: dateValue.optional(),
    updated: dateValue.optional(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    hideFrom: z.array(z.enum(HIDE_FROM)).default([]),
    comments: z.boolean().default(true),
  })
  .strict();

/**
 * 关于页正文（`src/content/spec/about.mdx`）。
 *
 * 只承接正文，页面不读任何 frontmatter；因此用宽松的空对象，
 * 写了 frontmatter 也不会报错，但不会被使用。
 */
export const specSchema = z.object({});

export type DailyFrontmatter = z.infer<typeof dailySchema>;
export type PostFrontmatter = z.infer<typeof postSchema>;
export type PageFrontmatter = z.infer<typeof pageSchema>;
