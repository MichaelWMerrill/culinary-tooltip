/*
 * Fuel consumption & thermal-efficiency engine.
 * Equipment combustion rates, wind load factors, insulation coefficients, and
 * the linear-interpolation array for ambient temperature scaling — extracted
 * verbatim from the legacy inline estimator.
 */

export const CONFIG = {
  // NOTE: `btu_per_lb` and `loss_coefficient_u` are DISPLAY-ONLY — the fuel
  // description labels in fuelEstimator.controller.js print them ("8,000 BTU/lb",
  // "U-loss 1.5"), but estimate() does NOT use them. The model is base_burn_ideal
  // × duration × ambient × wind × (efficiency ratio); there is no BTU balance or
  // heat-loss term. Do not wire these into the calculation without a real model
  // change (and a version bump) — they are informational, not calibrated inputs.
  fuel_metrics: {
    wood_pellets: { btu_per_lb: 8000, base_burn_ideal: 1.2 },
    charcoal_briquettes: { btu_per_lb: 9500, base_burn_ideal: 1.5 },
    hardwood_splits: { btu_per_lb: 12000, base_burn_ideal: 3.5 },
  },
  insulation_profiles: {
    single_wall_steel: { efficiency_eta: 0.45, loss_coefficient_u: 1.5 },
    insulated_blanket: { efficiency_eta: 0.7, loss_coefficient_u: 0.7 },
    ceramic_double_wall: { efficiency_eta: 0.85, loss_coefficient_u: 0.4 },
  },
  environmental_multipliers: {
    ambient_temp: {
      freezing_20: 1.75,
      crisp_40: 1.35,
      ideal_70: 1.0,
      hot_90: 0.8,
      above_110: 0.65,
    },
  },
  wind_modifiers: {
    calm_0_5mph: 1.0,
    breezy_5_15mph: 1.25,
    high_wind_15mph: 1.6,
  },
};

export const FUEL_LABELS = {
  wood_pellets: 'Pellets',
  charcoal_briquettes: 'Charcoal',
  hardwood_splits: 'Wood Splits',
};

/** Piecewise-linear ambient temperature scaling anchors: [°F, multiplier]. */
export const AMBIENT_ANCHORS = [
  [20, 1.75],
  [40, 1.35],
  [70, 1.0],
  [90, 0.8],
  [110, 0.65],
  [125, 0.65],
];

/** Interpolate the ambient burn multiplier for a given temperature. Pure. */
export function ambientMultiplier(tempF) {
  const et = CONFIG.environmental_multipliers.ambient_temp;
  if (tempF >= 110) return et.above_110;
  const a = AMBIENT_ANCHORS;
  if (tempF <= a[0][0]) return a[0][1];
  for (let i = 1; i < a.length; i++) {
    if (tempF <= a[i][0]) {
      const t0 = a[i - 1][0],
        m0 = a[i - 1][1],
        t1 = a[i][0],
        m1 = a[i][1];
      return m0 + ((m1 - m0) * (tempF - t0)) / (t1 - t0);
    }
  }
  return a[a.length - 1][1];
}

/*
 * Single-wall steel is the real-world baseline cooker: the `base_burn_ideal`
 * rates are calibrated to it at ideal weather (calm, ~70°F) — single-wall
 * charcoal ≈ 1.5 lb/hr and pellets ≈ 1.2 lb/hr at 225–250°F (calibration
 * estimate — see METHODOLOGY). Better insulation reduces burn *from* this
 * baseline; the efficiency ratio sets how much (e.g. an insulated blanket at
 * η 0.70 burns 0.45/0.70 ≈ 0.64× the single-wall fuel, a ~36% saving). This
 * anchoring keeps the insulation what-if percentages intact while giving
 * physically realistic absolute pounds — a plain `/ efficiency_eta` overstated
 * single-wall consumption by ~2.2×.
 */
export const BASELINE_EFFICIENCY = CONFIG.insulation_profiles.single_wall_steel.efficiency_eta;

/**
 * Estimate fuel weight, cost, bags, and effective burn rate for a state and a
 * specific insulation profile (so what-if comparisons can pass alternates). Pure.
 */
export function estimate(state, insulationKey) {
  const fm = CONFIG.fuel_metrics[state.fuel];
  const ins = CONFIG.insulation_profiles[insulationKey];
  const amb = ambientMultiplier(state.ambientTemp);
  const wind = CONFIG.wind_modifiers[state.wind];

  const lbs = fm.base_burn_ideal * state.duration * amb * wind * (BASELINE_EFFICIENCY / ins.efficiency_eta);
  const costPerLb = state.bagWeight > 0 ? state.bagCost / state.bagWeight : 0;
  const cost = lbs * costPerLb;
  const bags = state.bagWeight > 0 ? lbs / state.bagWeight : 0;
  const effRate = state.duration > 0 ? lbs / state.duration : 0;

  return { lbs, cost, bags, costPerLb, effRate };
}
