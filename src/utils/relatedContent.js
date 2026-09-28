/*
 * Cross-links calculator pages and blog posts using each post's `protein`
 * frontmatter (src/content/config.ts) — the taxonomy already in place from
 * PRs #59-60. No new data modeling: this only reads that field.
 *
 * Scope is the 4 pages literally named "*-calculator" that double as true
 * single-purpose calculators: brisket-calculator, pork-shoulder-calculator,
 * and turkey-calculator (protein-specific, via YieldCalculator.astro), plus
 * rest-calculator (protein-agnostic — protein is a client-side input there,
 * not a page identity, so it matches on the `general` tag instead).
 * brisket-size-calculator is excluded: it's a raw-weight sizing tool with no
 * existing blog-link precedent, not a yield calculator.
 */

export const PROTEIN_CALCULATOR_URLS = {
  beef_brisket: '/brisket-calculator',
  pork_shoulder: '/pork-shoulder-calculator',
  turkey: '/turkey-calculator',
};

const CALCULATOR_LABELS = {
  '/brisket-calculator': 'Brisket Yield & Cost Calculator',
  '/pork-shoulder-calculator': 'Pork Shoulder Yield & Cost Calculator',
  '/turkey-calculator': 'Turkey Yield & Cost Calculator',
  '/rest-calculator': 'Rest & Hold Calculator',
};

// Posts whose protein doesn't map to one of the three protein-specific
// calculators above (pork_ribs, general, or multi-protein posts where no
// listed protein matches) land here instead of going unlinked.
const FALLBACK_CALCULATOR_URL = '/rest-calculator';

/*
 * Posts GSC's "Discovered - currently not indexed" report flagged as of the
 * 2026-09-13 export (18 URLs, all blog posts; see PR #70). Point-in-time
 * snapshot: re-pull the GSC export periodically and update this set, or its
 * value decays as pages get indexed (drop them) or newly stuck (add them).
 */
const NEEDS_CRAWL_SIGNAL = new Set([
  'climate-stall-paradox',
  'cook-scheduler-confidence-band',
  'danger-zone-guideline-vs-real-cook',
  'faux-cambro-holding',
  'party-planner-appetite-asymmetry',
  'physics-of-the-stall',
  'poor-mans-burnt-ends',
  'pork-shoulder-bone-in-yield-gap',
  'ribs-no-party-planner',
  'ribs-two-clocks',
  'science-of-smoke',
  'stall-exponent-universality',
  'turkey-brine-vs-spatchcock-yield',
  'turkey-danger-zone-clock',
  'turkey-hold-window-gap',
  'turkey-scheduler-dead-controls',
  'wood-splits-btu-vs-burn-rate',
  'wrap-timing-not-just-what',
]);

/*
 * Of the above, these already had a calculator link before this PR (the old
 * single hardcoded "Read more" line) and are still unindexed regardless —
 * losing that link would be a regression, not neutral, so they outrank
 * every other unindexed post for a slot. Everything else in
 * NEEDS_CRAWL_SIGNAL is a pure addition: capped out by the beef_brisket
 * protein's 7 unindexed posts competing for 4 slots is a worse outcome than
 * before only for these two.
 */
const REGRESSES_IF_DROPPED = new Set(['science-of-smoke', 'faux-cambro-holding']);

/** 2-4 posts tagged with `proteinId`: previously-linked-and-still-unindexed first, then unindexed, then most recent. */
export function pickRelatedPosts(posts, proteinId, { limit = 4 } = {}) {
  const rank = (post) => (REGRESSES_IF_DROPPED.has(post.id) ? 0 : NEEDS_CRAWL_SIGNAL.has(post.id) ? 1 : 2);
  return posts
    .filter((post) => post.data.protein.includes(proteinId))
    .sort((a, b) => rank(a) - rank(b) || new Date(b.data.pubDate) - new Date(a.data.pubDate))
    .slice(0, limit);
}

/** The one calculator a blog post should link back to, from its first matching protein. */
export function pickRelatedCalculator(protein) {
  for (const id of protein) {
    const href = PROTEIN_CALCULATOR_URLS[id];
    if (href) return { href, label: CALCULATOR_LABELS[href] };
  }
  return { href: FALLBACK_CALCULATOR_URL, label: CALCULATOR_LABELS[FALLBACK_CALCULATOR_URL] };
}

/**
 * The most recent recipe sharing a protein tag with a blog post, or null if
 * none exist yet. Takes the `recipes` collection so callers control the
 * fetch (matches pickRelatedPosts's shape), and reads only `id`, `data.title`
 * `data.protein` and `data.pubDate` — nothing about a recipe's ratios,
 * defaults, or model version.
 */
export function pickRelatedRecipe(recipes, protein) {
  const matches = recipes
    .filter((recipe) => recipe.data.protein.some((id) => protein.includes(id)))
    .sort((a, b) => new Date(b.data.pubDate) - new Date(a.data.pubDate));
  if (!matches.length) return null;
  const recipe = matches[0];
  return { href: `/recipes/${recipe.id}`, title: recipe.data.title };
}
