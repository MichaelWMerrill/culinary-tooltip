// @vitest-environment happy-dom
/*
 * DOM smoke tests for the Phase 4 proteins on the generic components:
 *  - ribs StallPredictor renders cut+racks (slab), calls computeModel(state, ribs)
 *  - turkey StallPredictor hides the stall-only controls, shows the food-safety
 *    note, and calls computeModel(state, turkey) (no-stall)
 *  - turkey YieldCalculator renders preparation+brined and calls calcYield(turkey…)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import YieldCalculator from '../YieldCalculator.astro';
import StallPredictor from '../StallPredictor.astro';
import CookScheduler from '../CookScheduler.astro';
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
import { initStallPredictor } from '../stallPredictor.controller.js';
import { initYieldCalculator } from '../yieldCalculator.controller.js';
import { initCookScheduler } from '../cookScheduler.controller.js';

const ribs = PROTEINS.pork_ribs;
const turkey = PROTEINS.turkey;

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Ribs StallPredictor (slab)', () => {
  it('renders cut + racks (no weight), drives cut, calls computeModel(state, ribs)', async () => {
    await mountComponent(StallPredictor, { protein: ribs });

    expect(document.getElementById('cutToggle'), '#cutToggle present').toBeTruthy();
    expect(document.getElementById('racks'), '#racks present').toBeTruthy();
    expect(document.getElementById('weight'), '#weight absent for ribs').toBeNull();
    // Ribs still stall (barely), so wrap controls are shown.
    expect(document.getElementById('wrapToggle')).toBeTruthy();

    initStallPredictor(ribs);

    expect(computeModel).toHaveBeenCalled();
    expect(computeModel.mock.calls.at(-1)[1]).toBe(ribs);
    expect(computeModel.mock.calls.at(-1)[0]).toHaveProperty('cut');

    document.querySelector('.cut-opt[data-value="baby_back"]').click();
    expect(computeModel.mock.calls.at(-1)[0].cut).toBe('baby_back');
    expect(document.getElementById('totalTime').textContent).not.toBe('—');
  });
});

describe('Turkey StallPredictor (no-stall)', () => {
  it('hides stall-only controls, shows the food-safety note, computes a no-stall curve', async () => {
    await mountComponent(StallPredictor, { protein: turkey });

    expect(document.getElementById('preparationToggle'), '#preparationToggle present').toBeTruthy();
    // Wrap / wrap-temp / climate are stall-only and hidden for poultry.
    expect(document.getElementById('wrapToggle'), '#wrapToggle hidden for turkey').toBeNull();
    expect(document.getElementById('climateToggle'), '#climateToggle hidden for turkey').toBeNull();
    // Food-safety note is present.
    expect(document.body.textContent).toContain('Food-safety note');
    expect(document.body.textContent).toContain('165');

    initStallPredictor(turkey);

    expect(computeModel.mock.calls.at(-1)[1]).toBe(turkey);
    expect(computeModel.mock.calls.at(-1)[0]).toHaveProperty('preparation');
    expect(document.getElementById('totalTime').textContent).not.toBe('—');
    expect(document.getElementById('stallTime').textContent).toBe('None');

    document.querySelector('.preparation-opt[data-value="spatchcock"]').click();
    expect(computeModel.mock.calls.at(-1)[0].preparation).toBe('spatchcock');
  });
});

describe('Turkey YieldCalculator', () => {
  it('renders preparation + brined, drives them, calls calcYield(turkey, …)', async () => {
    await mountComponent(YieldCalculator, { protein: turkey });

    expect(document.getElementById('preparationToggle')).toBeTruthy();
    expect(document.getElementById('brinedToggle')).toBeTruthy();
    expect(document.getElementById('weight').getAttribute('max')).toBe('24');

    initYieldCalculator(turkey);

    expect(calcYield.mock.calls.at(-1)[0]).toBe(turkey);
    const arg = calcYield.mock.calls.at(-1)[1];
    for (const key of ['weight', 'price', 'preparation', 'brined']) expect(arg).toHaveProperty(key);

    document.querySelector('.preparation-opt[data-value="spatchcock"]').click();
    document.querySelector('.brined-opt[data-value="yes"]').click();
    const last = calcYield.mock.calls.at(-1)[1];
    expect(last.preparation).toBe('spatchcock');
    expect(last.brined).toBe('yes');
    expect(document.getElementById('trueCost').textContent).not.toBe('0.00');
  });
});

describe('Ribs 3-2-1 CookScheduler', () => {
  it('shows cut+racks, hides weight + stall-only, and lays out a 3-2-1/2-2-1 timeline', async () => {
    await mountComponent(CookScheduler);
    initCookScheduler(ribs);

    expect(document.querySelector('[data-thermal-axis="weight"]').hidden).toBe(true);
    expect(document.querySelector('[data-thermal-axis="cut"]').hidden).toBe(false);
    expect(document.querySelector('[data-thermal-axis="racks"]').hidden).toBe(false);
    // Wrap/wrap-temp/climate are stall-only and hidden for the fixed-method ribs.
    document.querySelectorAll('[data-stall-only]').forEach((c) => expect(c.hidden).toBe(true));

    // init() seeds a default serve time, so a schedule computes immediately.
    // Spare (default) uses 3-2-1 = 6 h and six milestones.
    expect(document.getElementById('fireUpBig').textContent).not.toBe('Pick a serving time');
    expect(document.getElementById('timeline').children.length).toBe(6);
    expect(document.getElementById('totalSub').textContent).toContain('6h');

    // Baby back uses the shorter 2-2-1 = 5 h.
    document.querySelector('.cut-opt[data-value="baby_back"]').click();
    expect(document.getElementById('totalSub').textContent).toContain('5h');
  });
});
