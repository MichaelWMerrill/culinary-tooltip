import { describe, it, expect } from 'vitest';
import { DATA, cookDuration } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';
import { YIELD_WRAP_TO_STALL, recipeCookHours, isoDuration, formatDuration, ingredientGrams } from '../recipeModel.js';

// The yield calculator says naked | paper | foil; the stall engine says
// none | peach_butcher_paper | aluminum_foil. Recipes store the former and
// translate for cookDuration(), so a rename on either side must fail here.
describe('recipe wrap mapping (yield vocabulary -> stall engine)', () => {
  it('pins each yield wrap to its stall-engine key', () => {
    expect(YIELD_WRAP_TO_STALL).toEqual({
      naked: 'none',
      paper: 'peach_butcher_paper',
      foil: 'aluminum_foil',
    });
  });

  it('covers every pork shoulder yield wrap option', () => {
    const wrapAxis = PROTEINS.pork_shoulder.yield.axes.find((a) => a.id === 'wrap');
    expect(Object.keys(YIELD_WRAP_TO_STALL).sort()).toEqual(wrapAxis.options.map((o) => o.value).sort());
  });

  it('maps onto existing stall-engine wrap conditions, one to one', () => {
    const stallKeys = Object.keys(DATA.wrapping_boundary_conditions);
    const targets = Object.values(YIELD_WRAP_TO_STALL);
    for (const t of targets) expect(stallKeys).toContain(t);
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe('recipe cook time is cookDuration(), unmodified', () => {
  const defaults = { cut: 'bone_in', wrap: 'paper', pitTemp: 250, pit: 'offset_smoker', climate: 'moderate', wrapTemp: 160 };

  it('equals cookDuration() for the same state', () => {
    const pork = PROTEINS.pork_shoulder;
    const direct = cookDuration(pork, { weight: 8, pitTemp: 250, pit: 'offset_smoker', wrap: 'peach_butcher_paper', climate: 'moderate', wrapTemp: 160 });
    expect(recipeCookHours(pork, defaults, 8)).toBe(direct.totalTime);
  });

  it('formats ISO 8601 and visible durations from the same rounding', () => {
    expect(isoDuration(9.07)).toBe('PT9H5M');
    expect(formatDuration(9.07)).toBe('9 hr 5 min');
    expect(isoDuration(8.99)).toBe('PT9H');
    expect(formatDuration(8.99)).toBe('9 hr');
  });
});

describe('ingredient scaling', () => {
  it('is a fraction of raw weight in grams', () => {
    expect(ingredientGrams(0.01, 1)).toBe(5); // 4.54 g
    expect(ingredientGrams(0.0075, 8)).toBe(27); // 27.2 g
  });
});
