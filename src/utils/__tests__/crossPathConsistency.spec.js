/*
 * Cross-path consistency: the STALL PREDICTOR and the COOK SCHEDULER must return
 * the same cook duration for identical inputs.
 *
 *   predictor entry point  → computeModel(state, protein).totalTime
 *   scheduler entry point  → cookDuration(protein, state).totalTime
 *
 * These are the two functions each page actually calls. For stall proteins
 * cookDuration delegates to computeModel, so they agree exactly. RIBS run two
 * different models — the scheduler uses fixed method_321 blocks while the
 * predictor uses computeModel — so ribs diverge, and that is declared a KNOWN
 * FAILURE below rather than skipped, so the day ribs is unified this test turns
 * red and tells us the declaration is stale.
 *
 * This is the assertion no golden ever made: goldens exercise computeModel
 * directly and never touch the scheduler's model selection, which is how the
 * ribs divergence survived six PRs unnoticed.
 */
import { describe, test, expect } from 'vitest';
import { computeModel, cookDuration } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const WRAPS = ['none', 'peach_butcher_paper', 'aluminum_foil'];
const CLIMATES = ['arid', 'moderate', 'humid'];

// Representative per-protein inputs; pit temp / wrap / climate are swept — they
// are exactly the axes method_321 ignores, i.e. where ribs diverges most.
const BASE = {
  beef_brisket: { weight: 12 },
  pork_shoulder: { weight: 8 },
  turkey: { weight: 16, preparation: 'whole' },
  pork_ribs: { cut: 'spare', racks: 3, weight: 3 },
};

function cells(id) {
  const protein = PROTEINS[id];
  const temps = Object.keys(protein.thermal.cook_temperatures);
  const out = [];
  for (const pitTemp of temps)
    for (const wrap of WRAPS)
      for (const climate of CLIMATES)
        out.push({ ...BASE[id], pitTemp, pit: 'offset_smoker', wrap, wrapTemp: 160, climate });
  return { protein, out };
}

function assertConsistent(id) {
  const { protein, out } = cells(id);
  for (const state of out) {
    const predictor = computeModel(state, protein).totalTime;
    const scheduler = cookDuration(protein, state).totalTime;
    // Same pure computeModel call under the hood → exact equality (no float drift).
    expect(scheduler, `${id} @ ${state.pitTemp}°F / ${state.wrap} / ${state.climate}`).toBe(predictor);
  }
}

describe('cross-path consistency: scheduler cookDuration === predictor computeModel', () => {
  for (const id of ['beef_brisket', 'pork_shoulder', 'turkey']) {
    test(`${id} agrees across pitTemp × wrap × climate`, () => assertConsistent(id));
  }

  // KNOWN FAILURE — do not skip. Ribs run two models: scheduler uses method_321
  // fixed blocks, predictor uses computeModel. Remove this test.fails when ribs
  // is unified onto computeModel (at which point this test would start passing
  // and Vitest flags the stale declaration).
  test.fails('pork_ribs — KNOWN divergence (method_321 vs computeModel); delete when ribs unified', () => {
    assertConsistent('pork_ribs');
  });
});
