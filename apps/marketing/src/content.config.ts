import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(20).max(75),
    description: z.string().min(140).max(160),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default('The Dynamic QR Code Labs Team'),
    category: z.enum([
      'Guides',
      'Tutorials',
      'Marketing',
      'Restaurants',
      'Analytics',
      'Industry',
      'Comparisons',
    ]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
