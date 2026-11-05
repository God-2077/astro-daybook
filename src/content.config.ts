import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { contentGlobBase } from './lib/content/paths';
import { dailySchema, pageSchema, postSchema, specSchema } from './lib/content/schema';

export const collections = {
  dailyCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: contentGlobBase('daily') }),
    schema: dailySchema,
  }),
  postsCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: contentGlobBase('post') }),
    schema: postSchema,
  }),
  specCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: contentGlobBase('spec') }),
    schema: specSchema,
  }),
  pagesCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: contentGlobBase('pages') }),
    schema: pageSchema,
  }),
};
