/*
 * Rest & hold engine — Newton's law of cooling for a rested/held cut.
 *
 * A pulled cut cools toward its surroundings exponentially:
 *     T(t) = T_amb + (T_pull − T_amb) · e^(−k·t)
 * where k (per hour) captures how fast heat escapes the hold and T_amb is the
 * environment the meat settles toward. The 140°F line is the food-safety floor
 * for hot holding (USDA); above it the meat can be held safely, below it the
 * clock starts. All hold constants are calibration estimates (see METHODOLOGY);
 * real holds vary with mass, wrap, and how pre-warmed the vessel is.
 */

export const HOLD_PROFILES = {
  // Warming oven / drawer actively held near 150°F: the meat settles there and
  // stays safe indefinitely.
  oven_hold: { name: 'Warm oven / holding cabinet (~150°F)', amb: 150, k: 0.1 },
  // Faux cambro: foil + towels in a pre-warmed cooler. Very slow decay.
  faux_cambro: { name: 'Faux cambro (foil + towels in a cooler)', amb: 70, k: 0.1 },
  // Empty cooler, no towels — some air gap, moderate decay.
  bare_cooler: { name: 'Bare cooler (no towels)', amb: 70, k: 0.2 },
  // Loosely tented on the counter — cools fastest.
  counter: { name: 'Loosely tented on the counter', amb: 70, k: 0.55 },
};

export const SAFE_TEMP = 140; // °F — hot-holding food-safety floor (USDA)

/** Temperature (°F) after `hours` in the given hold, from a pull temperature. */
export function tempAfter(pullTemp, holdKey, hours) {
  const h = HOLD_PROFILES[holdKey];
  return h.amb + (pullTemp - h.amb) * Math.exp(-h.k * hours);
}

/**
 * Model a rest/hold. Returns the cooling curve, the safe-hold window (hours the
 * meat stays at or above 140°F, Infinity when the hold itself is ≥140°F), and
 * the temperature reached at the requested serve time. Pure.
 */
export function restCurve(state) {
  const h = HOLD_PROFILES[state.hold];
  const T0 = state.pullTemp;
  const { amb, k } = h;

  // Hours until the curve crosses 140°F.
  let safeHours;
  if (amb >= SAFE_TEMP) safeHours = Infinity; // held at/above the floor forever
  else if (T0 <= SAFE_TEMP) safeHours = 0; // already at/below the floor
  else safeHours = -Math.log((SAFE_TEMP - amb) / (T0 - amb)) / k;

  const tempAtServe = tempAfter(T0, state.hold, state.holdHours);
  const safeAtServe = tempAtServe >= SAFE_TEMP;

  // Sample the curve out to a little past whichever is later: the serve time or
  // the safe window (bounded so an infinite hold still plots a finite window).
  const window = isFinite(safeHours) ? safeHours * 1.25 : state.holdHours;
  const tMax = Math.max(state.holdHours, window, 1);
  const N = 80;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * tMax;
    pts.push({ t, temp: tempAfter(T0, state.hold, t) });
  }

  return { pts, safeHours, tempAtServe, safeAtServe, amb, k };
}
