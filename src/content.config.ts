import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { dailySchema, pageSchema, postSchema, specSchema } from './lib/content/schema';

export const collections = {
  dailyCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/daily' }),
    schema: dailySchema,
  }),
  postsCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/post' }),
    schema: postSchema,
  }),
  specCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/spec' }),
    schema: specSchema,
  }),
  pagesCollection: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
    schema: pageSchema,
  }),
};
