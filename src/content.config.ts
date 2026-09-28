import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared taxonomy: blog posts and recipes tag against the same pillar and
// protein vocabularies, so relatedContent.js can match across both collections.
const PILLARS = ['science', 'myth-bust', 'how-to', 'planning-safety', 'tool-spotlight'] as const;
const PROTEIN_TAGS = ['beef_brisket', 'pork_shoulder', 'pork_ribs', 'turkey', 'general'] as const;

// Calculator pages a recipe may deep-link into (see relatedContent.js).
const RECIPE_CALCULATORS = ['brisket-calculator', 'pork-shoulder-calculator', 'turkey-calculator'] as const;

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
    pillar: z.enum(PILLARS),
    protein: z.array(z.enum(PROTEIN_TAGS)).min(1),
  }),
});

// A citation a recipe's claims can point to. Tier is deliberately A|B only —
// there is no tier for a lead you don't want cited (destination-bbq-style
// aggregators): such a source simply can't be entered here, so a recipe can
// never point a claim at one.
const recipeSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  tier: z.enum(['A', 'B']),
  checked: z.coerce.date(),
  note: z.string().optional(),
});

// Recipes: weight-scaled ingredient ratios plus steps that each explain why.
// Cook time is never authored here; the layout computes it from the protein's
// registry model (cookDuration) and fails the build if `modelVersion` drifts.
const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    // Optional override for the <title> tag / search snippet, when the H1 (a
    // plain recipe name) isn't the phrasing worth ranking for. Falls back to
    // `title` — see RecipeLayout's `Empirical BBQ | ${seoTitle ?? title}`,
    // the same "Empirical BBQ | <page>" pattern every other page uses.
    seoTitle: z.string().optional(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    pillar: z.enum(PILLARS),
    protein: z.array(z.enum(PROTEIN_TAGS)).min(1),
    calculator: z.enum(RECIPE_CALCULATORS),
    modelProtein: z.enum(['beef_brisket', 'pork_shoulder', 'turkey']),
    modelVersion: z.string(),
    // Values use the yield calculator's vocabulary (cut, wrap: naked|paper|foil)
    // so the deep link can pass them straight through as ?c= and ?wr=.
    defaults: z.object({
      weight: z.number(),
      cut: z.string(),
      wrap: z.enum(['naked', 'paper', 'foil']),
      pitTemp: z.union([z.literal(225), z.literal(250), z.literal(275)]),
      pit: z.enum(['offset_smoker', 'pellet_cooker', 'ceramic_kamado', 'charcoal_kettle']),
      climate: z.enum(['arid', 'moderate', 'humid']),
      wrapTemp: z.number(),
    }),
    // Optional Recipe JSON-LD fields, straight from frontmatter (the layout
    // never hardcodes a value for these; it only reads what's authored here).
    recipeCategory: z.string().optional(),
    recipeCuisine: z.string().optional(),
    keywords: z.string().optional(),
    // This recipe's citation list. See recipeSourceSchema above; validated
    // against at build time by src/utils/recipeSources.js.
    sources: z.array(recipeSourceSchema).default([]),
    // Each ratio is a fraction of raw weight as purchased. `review` stays
    // 'pending' until the science editor signs off on the number. `sourceIds`
    // points into `sources[]` above; `modelBasis` marks a number that comes
    // from the registry/engine instead of a citation.
    ratios: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          pct: z.number().positive().max(0.05),
          review: z.enum(['pending', 'approved']),
          sourceIds: z.array(z.string()).default([]),
          modelBasis: z.boolean().default(false),
        }),
      )
      .min(1),
    // Hand-written guidance that is not model output (e.g. a dry-brine hold).
    guidance: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          review: z.enum(['pending', 'approved']),
          sourceIds: z.array(z.string()).default([]),
          modelBasis: z.boolean().default(false),
        }),
      )
      .default([]),
    steps: z
      .array(
        z.object({
          text: z.string(),
          why: z.string(),
          timing: z.enum(['model', 'none']).default('none'),
          sourceIds: z.array(z.string()).default([]),
        }),
      )
      .min(1),
  }),
});

export const collections = { blog, recipes };
