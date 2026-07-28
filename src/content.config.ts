import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Astro 5 Content Layer: load Markdown blog posts from src/content/blog/ with
// a validated frontmatter schema (replaces the deprecated Astro.glob approach).
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    // Set when a published post is materially revised: drives `dateModified` in
    // the Article schema and <lastmod> in the sitemap, so a rewrite is a real
    // recrawl signal rather than a silent edit.
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
