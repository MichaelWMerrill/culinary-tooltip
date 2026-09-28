/*
 * Recipe helpers — pure, read-only glue between a recipe's frontmatter and the
 * existing engines. Nothing here owns a constant about meat: cook time comes
 * from stallEngine.cookDuration() and pulled yield from the protein's yield
 * matrix, both as published in the registry. The only numbers a recipe adds
 * are its own ingredient ratios (fraction of raw weight as purchased).
 */
import { cookDuration } from './stallEngine.js';

const GRAMS_PER_LB = 453.59237;

/**
 * The yield calculator and the stall engine name the same three wraps
 * differently. Recipes store the yield calculator's vocabulary (so the deep
 * link can pass it through as ?wr=) and translate here for cookDuration().
 */
export const YIELD_WRAP_TO_STALL = {
  naked: 'none',
  paper: 'peach_butcher_paper',
  foil: 'aluminum_foil',
};

/** Hours on the smoker for a recipe's defaults at `weight` (lb), via cookDuration(). */
export function recipeCookHours(protein, defaults, weight) {
  const { totalTime } = cookDuration(protein, {
    weight,
    pitTemp: defaults.pitTemp,
    pit: defaults.pit,
    wrap: YIELD_WRAP_TO_STALL[defaults.wrap],
    climate: defaults.climate,
    wrapTemp: defaults.wrapTemp,
  });
  return totalTime;
}

/** Round hours to whole 5-minute steps, split for display and ISO 8601. */
export function splitHours(hours) {
  const mins = Math.round((hours * 60) / 5) * 5;
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

/** ISO 8601 duration for schema.org (e.g. 9.07 h -> "PT9H5M"). */
export function isoDuration(hours) {
  const { h, m } = splitHours(hours);
  return `PT${h}H${m ? `${m}M` : ''}`;
}

/** Visible duration matching isoDuration() (e.g. "9 hr 5 min"). */
export function formatDuration(hours) {
  const { h, m } = splitHours(hours);
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Grams of an ingredient at `pct` of `weightLb` raw pounds, to the nearest gram. */
export function ingredientGrams(pct, weightLb) {
  return Math.round(pct * weightLb * GRAMS_PER_LB);
}

/**
 * Pulled weight (lb) and servings from the protein's own yield matrix and
 * serving size, i.e. the same math the yield calculator shows.
 */
export function recipeYield(protein, defaults, weight) {
  const loss = protein.yield.matrix[defaults.cut];
  const pulledLb = weight * (1 - loss.trim) * (1 - loss.cook[defaults.wrap]);
  return { pulledLb, servings: Math.floor(pulledLb / protein.serving.lbPerGuestCooked) };
}

/** Deep link into the yield calculator, pre-filled through its existing ?w=&c=&wr= params. */
export function calculatorHref(calculator, protein, defaults, weight) {
  const q = new URLSearchParams({ pr: protein.meta.id, w: String(weight), c: defaults.cut, wr: defaults.wrap });
  return `/${calculator}?${q}`;
}
