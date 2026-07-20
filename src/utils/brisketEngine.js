/*
 * Brisket trim, shrinkage & yield engine.
 * The USDA grade multipliers, trim-style loss constants, wrap evaporation
 * percentages, and serving-size conversion metrics now live in the shared
 * protein registry (src/utils/proteinRegistry.js). This module re-exports them
 * in the legacy shape pages and golden tests import, so results stay
 * byte-for-byte identical.
 */
import { PROTEINS } from './proteinRegistry.js';

const brisket = PROTEINS.beef_brisket;

/* Empirical data matrix (decimal percentages = fraction of weight) */
export const DATA = {
  meta: {
    version: brisket.meta.version,
    unit_basis: 'decimal_percentage',
    description: 'True Brisket Cost & Yield Mapping Engine Data Matrix',
  },
  defaults: brisket.yield.defaults,
  matrix: brisket.yield.matrix,
};

/** lb cooked per person threshold used by the serving estimator. */
export const THRESHOLD_PER_GUEST = brisket.serving.lbPerGuestCooked;

export const TRIM_COPY = brisket.yield.copy.trim;

export const WRAP_COPY = brisket.yield.copy.wrap;

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
