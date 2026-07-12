/*
 * Thermodynamic stall engine.
 * Geometric mass-scaling formulas (W^(-1/3) rule), pit thermal modifiers, and
 * climate relative-humidity coefficient arrays — plus the phase model and
 * curve sampler — extracted verbatim from the legacy inline predictor.
 */

/* Empirical physics data matrix */
export const DATA = {
  simulation_metadata: {
    engine_version: '1.0.0',
    target_proteins: ['beef_brisket', 'pork_shoulder'],
    base_thermal_diffusivity_alpha: 0.0014,
    latent_heat_vaporization_Lv: 2260000,
  },
  pit_profiles: {
    pellet_cooker: { name: 'Pellet Cooker', convective_coefficient_hc: 1.45, radiative_multiplier_epsilon: 0.3, base_relative_humidity: 0.15, description: 'High forced-draft airflow accelerates mass transfer and evaporative cooling.' },
    offset_smoker: { name: 'Offset Smoker', convective_coefficient_hc: 1.15, radiative_multiplier_epsilon: 0.65, base_relative_humidity: 0.25, description: 'High natural draft velocity balanced by radiant energy from heavy steel walls.' },
    ceramic_kamado: { name: 'Ceramic Kamado', convective_coefficient_hc: 0.65, radiative_multiplier_epsilon: 0.9, base_relative_humidity: 0.45, description: 'Low air exchange volume suppresses evaporation; high thermal mass maximizes radiant flux.' },
    charcoal_kettle: { name: 'Charcoal Kettle', convective_coefficient_hc: 1.25, radiative_multiplier_epsilon: 0.4, base_relative_humidity: 0.2, description: 'Thin-walled steel construction with strong natural convective airflow drives brisk evaporative cooling and modest radiant retention.' },
  },
  cook_temperatures: {
    225: { target_fahrenheit: 225, base_hourly_climb_rate_initial: 25.0, stall_threshold_fahrenheit: 155.0 },
    250: { target_fahrenheit: 250, base_hourly_climb_rate_initial: 32.0, stall_threshold_fahrenheit: 162.0 },
    275: { target_fahrenheit: 275, base_hourly_climb_rate_initial: 40.0, stall_threshold_fahrenheit: 170.0 },
  },
  mass_geometry_scaling: {
    geometric_constant_beta: 0.42,
    exponent: -0.333,
    weight_bounds_lbs: { min: 4.0, max: 18.0 },
  },
  wrapping_boundary_conditions: {
    none: { name: 'Naked / No Wrap', permeability_psi: 1.0, stall_duration_multiplier: 1.0, post_stall_climb_modifier: 0.85 },
    peach_butcher_paper: { name: 'Peach Butcher Paper', permeability_psi: 0.35, stall_duration_multiplier: 0.45, post_stall_climb_modifier: 1.2 },
    aluminum_foil: { name: 'Aluminum Foil (The Texas Crutch)', permeability_psi: 0.0, stall_duration_multiplier: 0.0, post_stall_climb_modifier: 1.65 },
  },
};

export const START_TEMP = 40; // °F, fridge-cold meat
export const FINISH_TEMP = 203; // °F, probe-tender target
export const REF_WEIGHT = 10; // lb, normalization reference
export const REF_PIT_POWER = 1.13; // offset smoker baseline

export const WRAP_COPY = {
  none: 'Naked cook — full evaporative stall, slower finish, deepest bark.',
  peach_butcher_paper: 'Semi-permeable: trims the stall while preserving bark.',
  aluminum_foil: 'The Texas Crutch — halts evaporation, powers through the stall.',
};

// Regional climate modifiers applied on top of the base curve.
//   stallTempMult     — shifts the stall onset temperature (arid lower, humid higher)
//   stallDurationMult — scales plateau length (humid extends it)
//   postClimbMult     — scales post-wrap climb rate (arid accelerates)
export const CLIMATE = {
  arid: { stallTempMult: 0.935, stallDurationMult: 1.0, postClimbMult: 1.2 },
  moderate: { stallTempMult: 1.0, stallDurationMult: 1.0, postClimbMult: 1.0 },
  humid: { stallTempMult: 1.045, stallDurationMult: 1.15, postClimbMult: 1.0 },
};

export const CLIMATE_COPY = {
  arid: 'Arid desert air — intense evaporative cooling drops the stall onset (~145°F) but races ~20% faster to the finish once wrapped.',
  moderate: 'Standard baseline stall behavior.',
  humid: 'Humid coastal air — suppressed evaporation lifts the stall onset (~162°F) and stretches the plateau ~15% longer.',
};

/** Convert inputs into phase durations & a temperature path. Pure. */
export function computeModel(state) {
  const pit = DATA.pit_profiles[state.pit];
  const ct = DATA.cook_temperatures[state.pitTemp];
  const wrap = DATA.wrapping_boundary_conditions[state.wrap];
  const geo = DATA.mass_geometry_scaling;
  const cl = CLIMATE[state.climate];

  // Mass scaling: larger mass climbs slower / stalls longer. rate ∝ W^exponent (-0.333); duration ∝ 1/rate.
  const massRateScale = Math.pow(state.weight / REF_WEIGHT, geo.exponent); // <1 for big meat
  const massDurScale = 1 / massRateScale; // >1 for big meat

  // Combined pit "drive": convective airflow + radiant flux.
  const pitPower = 0.7 * pit.convective_coefficient_hc + 0.5 * pit.radiative_multiplier_epsilon;
  const pitFactor = pitPower / REF_PIT_POWER;

  // Climate shifts where the stall lands on the temperature scale.
  const stallStart = ct.stall_threshold_fahrenheit * cl.stallTempMult;

  // ---- Phase 1: initial climb 40°F -> stall threshold ----
  const climb1 = ct.base_hourly_climb_rate_initial * pitFactor * massRateScale; // °F/hr avg-ish
  const t1 = ((stallStart - START_TEMP) / climb1) * 1.15; // mild easing correction

  // ---- Phase 2: the stall ----
  // Evaporative potential: drier pit + more airflow => longer stall.
  const evapFactor = (1 - pit.base_relative_humidity) * (pit.convective_coefficient_hc / REF_PIT_POWER);
  const nakedStall = 1.9 * massDurScale * evapFactor; // hours if never wrapped

  let stallDuration;
  if (state.wrap === 'none') {
    stallDuration = nakedStall;
  } else {
    // Fraction of the stall band ridden out *before* the wrap goes on.
    const stallBand = 12; // °F width of the plateau region
    const wrapProgress = Math.min(1, Math.max(0, (state.wrapTemp - stallStart) / stallBand));
    const nakedPortion = nakedStall * wrapProgress;
    const wrappedPortion = nakedStall * (1 - wrapProgress) * wrap.stall_duration_multiplier;
    stallDuration = nakedPortion + wrappedPortion;
  }
  // Humid air suppresses evaporation and extends the plateau.
  stallDuration *= cl.stallDurationMult;

  // Plateau rises only slightly; scales with how long the stall lasts.
  const plateauRise = Math.min(10, stallDuration * 5);
  const stallEndTemp = stallStart + plateauRise;

  // ---- Phase 3: secondary climb -> finish ----
  // Climate can accelerate the post-wrap climb (arid surface dries fast).
  const effPostMod = wrap.post_stall_climb_modifier * cl.postClimbMult;
  const climb3 = climb1 * effPostMod;
  const t3 = ((FINISH_TEMP - stallEndTemp) / climb3) * 1.1;

  const totalTime = t1 + stallDuration + t3;

  return { t1, stallDuration, t3, totalTime, stallStart, stallEndTemp, climb1, climb3, postMod: effPostMod };
}

/** Sample a smooth temperature path: array of {t (hours), temp (°F)}. Pure. */
export function buildPath(m) {
  const pts = [];
  const N1 = 60,
    N2 = 40,
    N3 = 60;

  // Phase 1: exponential approach (fast then easing into the stall)
  for (let i = 0; i <= N1; i++) {
    const f = i / N1;
    const t = f * m.t1;
    const temp = m.stallStart - (m.stallStart - START_TEMP) * Math.exp(-2.6 * f);
    pts.push({ t, temp });
  }
  // Phase 2: near-flat plateau, gently rising
  for (let i = 1; i <= N2; i++) {
    const f = i / N2;
    const t = m.t1 + f * m.stallDuration;
    const temp = m.stallStart + (m.stallEndTemp - m.stallStart) * f;
    pts.push({ t, temp });
  }
  // Phase 3: accelerating climb to finish (steeper when wrapped)
  const p = 1 / m.postMod; // <1 => fast early rise (foil), >1 => gentle
  for (let i = 1; i <= N3; i++) {
    const f = i / N3;
    const t = m.t1 + m.stallDuration + f * m.t3;
    const temp = m.stallEndTemp + (FINISH_TEMP - m.stallEndTemp) * Math.pow(f, p);
    pts.push({ t, temp });
  }
  return pts;
}
