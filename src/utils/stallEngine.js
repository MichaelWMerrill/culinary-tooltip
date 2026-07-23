/*
 * Thermodynamic stall engine.
 * Geometric mass-scaling formulas (W^(-1/3) rule), pit thermal modifiers, and
 * climate relative-humidity coefficient arrays — plus the phase model and
 * curve sampler — extracted verbatim from the legacy inline predictor.
 *
 * Protein-specific thermal constants (diffusivity, per-cook-temp stall
 * thresholds, mass geometry, start/finish temps) now live in the shared
 * protein registry (src/utils/proteinRegistry.js) and are spread in below.
 * The equipment/environment profiles (pit, wrap, climate) stay here because
 * they are not protein-specific.
 */
import { PROTEINS } from './proteinRegistry.js';

const brisketThermal = PROTEINS.beef_brisket.thermal;

/* Empirical physics data matrix */
export const DATA = {
  simulation_metadata: {
    engine_version: '1.0.0',
    target_proteins: ['beef_brisket'],
    base_thermal_diffusivity_alpha: brisketThermal.base_thermal_diffusivity_alpha,
    latent_heat_vaporization_Lv: brisketThermal.latent_heat_vaporization_Lv,
  },
  pit_profiles: {
    pellet_cooker: { name: 'Pellet Cooker', convective_coefficient_hc: 1.45, radiative_multiplier_epsilon: 0.3, base_relative_humidity: 0.15, description: 'High forced-draft airflow accelerates mass transfer and evaporative cooling.' },
    offset_smoker: { name: 'Offset Smoker', convective_coefficient_hc: 1.15, radiative_multiplier_epsilon: 0.65, base_relative_humidity: 0.25, description: 'High natural draft velocity balanced by radiant energy from heavy steel walls.' },
    ceramic_kamado: { name: 'Ceramic Kamado', convective_coefficient_hc: 0.65, radiative_multiplier_epsilon: 0.9, base_relative_humidity: 0.45, description: 'Low air exchange volume suppresses evaporation; high thermal mass maximizes radiant flux.' },
    charcoal_kettle: { name: 'Charcoal Kettle', convective_coefficient_hc: 1.25, radiative_multiplier_epsilon: 0.4, base_relative_humidity: 0.2, description: 'Thin-walled steel construction with strong natural convective airflow drives brisk evaporative cooling and modest radiant retention.' },
  },
  cook_temperatures: brisketThermal.cook_temperatures,
  mass_geometry_scaling: {
    geometric_constant_beta: brisketThermal.geometry.beta,
    exponent: brisketThermal.geometry.exponent,
    weight_bounds_lbs: brisketThermal.geometry.weight_bounds,
  },
  wrapping_boundary_conditions: {
    none: { name: 'Naked / No Wrap', permeability_psi: 1.0, stall_duration_multiplier: 1.0, post_stall_climb_modifier: 0.85 },
    peach_butcher_paper: { name: 'Peach Butcher Paper', permeability_psi: 0.35, stall_duration_multiplier: 0.45, post_stall_climb_modifier: 1.2 },
    aluminum_foil: { name: 'Aluminum Foil (The Texas Crutch)', permeability_psi: 0.0, stall_duration_multiplier: 0.0, post_stall_climb_modifier: 1.65 },
  },
};

export const START_TEMP = brisketThermal.start_temp; // °F, fridge-cold meat
export const FINISH_TEMP = brisketThermal.finish_temp; // °F, probe-tender target
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

/**
 * Convert inputs into phase durations & a temperature path. Pure.
 * `protein` supplies the protein-specific thermal block (per-cook-temp stall
 * thresholds, geometry, start/finish temps, base stall length). Pit, wrap, and
 * climate profiles are equipment/environment and stay module-level. Defaults to
 * beef_brisket so existing callers are unchanged.
 */
export function computeModel(state, protein = PROTEINS.beef_brisket) {
  const thermal = protein.thermal;
  const pit = DATA.pit_profiles[state.pit];
  const ct = thermal.cook_temperatures[state.pitTemp];
  const wrap = DATA.wrapping_boundary_conditions[state.wrap];
  const geo = thermal.geometry; // { shape, beta, exponent, weight_bounds }
  const cl = CLIMATE[state.climate];
  const startTemp = thermal.start_temp;
  const finishTemp = thermal.finish_temp;

  // Mass scaling. A compact cut (cylinder) climbs slower with mass: rate ∝
  // W^exponent (-1/3 packer rule). A thin slab (ribs) is governed by its thin
  // dimension, so total mass/rack count barely changes the time — base = 1.
  // Optional per-state rate_modifiers scale the rate for cut- or prep-specific
  // effects (e.g. spatchcock poultry, thinner rib cuts). Brisket/pork define
  // neither, so their scaling is unchanged.
  const base = geo.shape === 'slab' ? 1 : Math.pow(state.weight / REF_WEIGHT, geo.exponent);
  const rateMod = thermal.rate_modifiers
    ? Object.entries(thermal.rate_modifiers).reduce((acc, [field, map]) => acc * (map[state[field]] ?? 1), 1)
    : 1;
  const massRateScale = base * rateMod; // <1 slows the climb, >1 speeds it
  // Stall duration scales with mass on a *separate* exponent: core heating is
  // conduction-limited (steep) while stall length is surface-evaporation-limited
  // (much shallower), so one exponent cannot serve both. `stall_exponent` is the
  // stall-duration mass exponent; when a protein omits it we fall back to the
  // legacy coupling (massDurScale = 1/massRateScale) so untouched proteins
  // (ribs, turkey) are byte-for-byte unchanged.
  const massDurScale =
    geo.stall_exponent != null ? Math.pow(state.weight / REF_WEIGHT, geo.stall_exponent) : 1 / massRateScale;

  // Combined pit "drive": convective airflow + radiant flux.
  const pitPower = 0.7 * pit.convective_coefficient_hc + 0.5 * pit.radiative_multiplier_epsilon;
  const pitFactor = pitPower / REF_PIT_POWER;

  // ---- No-stall proteins (e.g. poultry): a single monotonic climb, no
  // evaporative plateau. The stall/plateau fields collapse onto the finish. ----
  if (thermal.stalls === false) {
    const climb = ct.base_hourly_climb_rate_initial * pitFactor * massRateScale; // °F/hr
    const totalTime = ((finishTemp - startTemp) / climb) * 1.25; // natural easing toward finish
    return {
      noStall: true,
      t1: totalTime,
      stallDuration: 0,
      t3: 0,
      totalTime,
      stallStart: finishTemp,
      stallEndTemp: finishTemp,
      climb1: climb,
      climb3: climb,
      postMod: 1,
      startTemp,
      finishTemp,
    };
  }

  // Climate shifts where the stall lands on the temperature scale.
  const stallStart = ct.stall_threshold_fahrenheit * cl.stallTempMult;

  // ---- Phase 1: initial climb 40°F -> stall threshold ----
  const climb1 = ct.base_hourly_climb_rate_initial * pitFactor * massRateScale; // °F/hr avg-ish
  const t1 = ((stallStart - startTemp) / climb1) * 1.15; // mild easing correction

  // ---- Phase 2: the stall ----
  // Evaporative potential: drier pit + more airflow => longer stall.
  const evapFactor = (1 - pit.base_relative_humidity) * (pit.convective_coefficient_hc / REF_PIT_POWER);
  const nakedStall = thermal.stall_hours_base * massDurScale * evapFactor; // hours if never wrapped

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
  const t3 = ((finishTemp - stallEndTemp) / climb3) * 1.1;

  const totalTime = t1 + stallDuration + t3;

  return { t1, stallDuration, t3, totalTime, stallStart, stallEndTemp, climb1, climb3, postMod: effPostMod, startTemp, finishTemp };
}

/** Sample a smooth temperature path: array of {t (hours), temp (°F)}. Pure. */
export function buildPath(m) {
  const pts = [];
  const N1 = 60,
    N2 = 40,
    N3 = 60;
  // Start/finish come from the model (protein-specific); fall back to the
  // brisket module constants for any legacy model object without them.
  const startTemp = m.startTemp ?? START_TEMP;
  const finishTemp = m.finishTemp ?? FINISH_TEMP;

  // No-stall proteins: one monotonic climb, fast early and easing toward the
  // finish (concave), ending exactly at finishTemp. No plateau.
  if (m.noStall) {
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      pts.push({ t: f * m.totalTime, temp: startTemp + (finishTemp - startTemp) * Math.pow(f, 0.8) });
    }
    return pts;
  }

  // Phase 1: exponential approach (fast then easing into the stall)
  for (let i = 0; i <= N1; i++) {
    const f = i / N1;
    const t = f * m.t1;
    const temp = m.stallStart - (m.stallStart - startTemp) * Math.exp(-2.6 * f);
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
    const temp = m.stallEndTemp + (finishTemp - m.stallEndTemp) * Math.pow(f, p);
    pts.push({ t, temp });
  }
  return pts;
}
