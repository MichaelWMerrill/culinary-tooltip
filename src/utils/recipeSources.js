/*
 * Recipe source-citation rules — pure and framework-agnostic (no astro:content
 * import) so they're unit-testable directly, and callable from RecipeLayout.astro
 * at build time. A recipe's `sources[]` is its citation list; `sourceIds` on a
 * ratio, guidance item, or step points into it. `modelBasis: true` on a ratio
 * or guidance item says the number comes from the registry/engine itself
 * (verified elsewhere, e.g. the modelVersion check) rather than a citation.
 */

/** Every ratio/guidance item that carries `review`, in one list. */
function reviewedItems(recipe) {
  return [...(recipe.ratios ?? []), ...(recipe.guidance ?? [])];
}

/** Every sourceId used anywhere in the recipe (ratios, guidance, steps). */
function usedSourceIds(recipe) {
  return [
    ...reviewedItems(recipe).flatMap((item) => item.sourceIds ?? []),
    ...(recipe.steps ?? []).flatMap((step) => step.sourceIds ?? []),
  ];
}

/** sourceIds referenced somewhere that no entry in `sources[]` declares. */
export function unknownSourceIds(recipe) {
  const known = new Set((recipe.sources ?? []).map((s) => s.id));
  return [...new Set(usedSourceIds(recipe))].filter((id) => !known.has(id));
}

/**
 * `review: approved` ratios/guidance with neither a source nor `modelBasis`.
 * These are what a build should refuse to ship: an approved number with
 * nothing backing it. Returns the offending items' ids.
 */
export function unsupportedApprovedClaims(recipe) {
  return reviewedItems(recipe)
    .filter((item) => item.review === 'approved' && !item.modelBasis && (item.sourceIds ?? []).length === 0)
    .map((item) => item.id);
}

/**
 * `review: pending` ratios/guidance with neither a source nor `modelBasis` yet.
 * Not a build failure — pending items are allowed to lack one — but worth a
 * second log line alongside the existing pending-review warning, so a source
 * that's about to be found doesn't get lost.
 */
export function pendingWithoutSource(recipe) {
  return reviewedItems(recipe)
    .filter((item) => item.review === 'pending' && !item.modelBasis && (item.sourceIds ?? []).length === 0)
    .map((item) => item.id);
}
