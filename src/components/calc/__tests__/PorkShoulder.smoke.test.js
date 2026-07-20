// @vitest-environment happy-dom
/*
 * DOM smoke test for the second protein: the same generic YieldCalculator and
 * StallPredictor components, rendered with protein=pork_shoulder, must render
 * pork's axes (cut instead of grade+trim), drive them, and call the engines with
 * pork parameters — proving the registry-driven components are protein-generic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import YieldCalculator from '../YieldCalculator.astro';
import StallPredictor from '../StallPredictor.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/brisketEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, calcYield: vi.fn(actual.calcYield) };
});
vi.mock('../../../utils/stallEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, computeModel: vi.fn(actual.computeModel), buildPath: vi.fn(actual.buildPath) };
});

import { calcYield } from '../../../utils/brisketEngine.js';
import { computeModel } from '../../../utils/stallEngine.js';
import { PROTEINS } from '../../../utils/proteinRegistry.js';
import { initYieldCalculator } from '../yieldCalculator.controller.js';
import { initStallPredictor } from '../stallPredictor.controller.js';

const pork = PROTEINS.pork_shoulder;

describe('Pork shoulder YieldCalculator smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders pork axes (cut, not grade/trim), drives them, calls calcYield(pork, …), lands a result', async () => {
    await mountComponent(YieldCalculator, { protein: pork });

    // Pork-specific inputs are present; brisket-only ones are absent.
    expect(document.getElementById('cutToggle'), '#cutToggle present').toBeTruthy();
    expect(document.getElementById('grade'), '#grade absent for pork').toBeNull();
    expect(document.getElementById('trimToggle'), '#trimToggle absent for pork').toBeNull();
    // Weight slider uses pork bounds (4–12).
    expect(document.getElementById('weight').getAttribute('max')).toBe('12');

    initYieldCalculator(pork);

    expect(calcYield).toHaveBeenCalled();
    expect(calcYield.mock.calls.at(-1)[0]).toBe(pork); // protein is the first arg
    const arg = calcYield.mock.calls.at(-1)[1];
    for (const key of ['weight', 'price', 'cut', 'wrap']) expect(arg, `arg has ${key}`).toHaveProperty(key);

    document.querySelector('.cut-opt[data-value="boneless"]').click();
    document.querySelector('.wrap-opt[data-value="foil"]').click();

    const last = calcYield.mock.calls.at(-1)[1];
    expect(last.cut).toBe('boneless');
    expect(last.wrap).toBe('foil');
    expect(document.getElementById('trueCost').textContent).not.toBe('0.00');
  });
});

describe('Pork shoulder StallPredictor smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders with pork weight bounds + finish temp, calls computeModel(state, pork)', async () => {
    await mountComponent(StallPredictor, { protein: pork });

    expect(document.getElementById('weight').getAttribute('max')).toBe('12');
    // Placeholder reflects the pork finish temperature.
    expect(document.getElementById('totalTimeSub').textContent).toContain('202');

    initStallPredictor(pork);

    expect(computeModel).toHaveBeenCalled();
    // computeModel is called (state, protein) — the protein is the pork block.
    expect(computeModel.mock.calls.at(-1)[1]).toBe(pork);

    document.querySelector('.wrap-opt[data-wrap="aluminum_foil"]').click();
    expect(document.getElementById('totalTime').textContent).not.toBe('—');
    // The finish line label on the chart uses the pork finish temp.
    expect(document.getElementById('chart').textContent).toContain('202');
  });
});
