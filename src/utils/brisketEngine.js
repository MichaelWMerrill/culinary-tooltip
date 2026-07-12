/*
 * Brisket trim, shrinkage & yield engine.
 * USDA grade multipliers, trim-style loss constants, wrap evaporation
 * percentages, and serving-size conversion metrics — extracted verbatim from
 * the legacy inline calculator so results are byte-for-byte identical.
 */

/* Empirical data matrix (decimal percentages = fraction of weight) */
export const DATA = {
  meta: {
    version: '2026.1',
    unit_basis: 'decimal_percentage',
    description: 'True Brisket Cost & Yield Mapping Engine Data Matrix',
  },
  defaults: {
    currency: 'USD',
    mass_unit: 'lb',
    market_prices: { PRIME: 5.49, CHOICE: 4.29, SELECT: 3.49 },
  },
  matrix: {
    PRIME: { trim: { commercial: 0.28, competition: 0.42 }, cook: { naked: 0.4, paper: 0.35, foil: 0.31 } },
    CHOICE: { trim: { commercial: 0.24, competition: 0.36 }, cook: { naked: 0.39, paper: 0.34, foil: 0.3 } },
    SELECT: { trim: { commercial: 0.19, competition: 0.3 }, cook: { naked: 0.38, paper: 0.33, foil: 0.29 } },
  },
};

/** lb cooked per person threshold used by the serving estimator. */
export const THRESHOLD_PER_GUEST = 0.5;

export const TRIM_COPY = {
  commercial: 'Light retail trim &mdash; more fat cap left on.',
  competition: 'Aggressive competition trim &mdash; squared &amp; defatted.',
};

export const WRAP_COPY = {
  naked: 'No wrap &mdash; deepest bark, highest moisture loss.',
  paper: 'Balanced bark and moisture retention.',
  foil: 'Texas crutch &mdash; fastest cook, least shrinkage.',
};

/**
 * Core brisket calculation. Pure: takes a state snapshot, returns derived
 * weights, yield, and cost metrics.
 */
export function calcBrisket(state) {
  const m = DATA.matrix[state.grade];
  const trimPct = m.trim[state.trim]; // fraction lost to trimming
  const cookPct = m.cook[state.wrap]; // fraction lost during cook

  const raw = state.weight;
  const trimWt = raw * trimPct; // fat/meat trim removed
  const trimmedWt = raw - trimWt; // post-trim, pre-cook
  const cookLoss = trimmedWt * cookPct; // rendered & evaporated
  const cookedWt = trimmedWt - cookLoss; // final sliced weight

  const totalYield = raw > 0 ? cookedWt / raw : 0;
  const rawCost = raw * state.price;
  const trueCost = cookedWt > 0 ? rawCost / cookedWt : 0;
  const markup = state.price > 0 ? trueCost / state.price - 1 : 0;

  return { trimPct, cookPct, raw, trimWt, trimmedWt, cookLoss, cookedWt, totalYield, rawCost, trueCost, markup };
}
