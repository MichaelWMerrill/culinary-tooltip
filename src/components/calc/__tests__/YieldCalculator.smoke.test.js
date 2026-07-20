// @vitest-environment happy-dom
/*
 * DOM smoke test: render YieldCalculator from the registry axes, drive each
 * axis, and assert the engine was called with the right parameter names and a
 * result landed in the results panel. The engine is spy-wrapped (real math
 * preserved) so we can inspect the call arguments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import YieldCalculator from '../YieldCalculator.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/brisketEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, calcYield: vi.fn(actual.calcYield) };
});

import { calcYield } from '../../../utils/brisketEngine.js';
import { initYieldCalculator } from '../yieldCalculator.controller.js';

const mount = () => mountComponent(YieldCalculator);

describe('YieldCalculator smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders inputs from axes, drives them, calls calcBrisket with axis params, lands a result', async () => {
    await mount();

    // Input panel was rendered from protein.yield.axes.
    for (const id of ['weight', 'price', 'grade', 'trimToggle', 'wrapToggle']) {
      expect(document.getElementById(id), `#${id} present`).toBeTruthy();
    }

    initYieldCalculator();

    // Engine invoked with the axis parameter names (calcYield is called with the
    // protein as the first arg and the state as the second).
    expect(calcYield).toHaveBeenCalled();
    const firstArg = calcYield.mock.calls.at(-1)[1];
    for (const key of ['weight', 'price', 'grade', 'trim', 'wrap']) {
      expect(firstArg, `arg has ${key}`).toHaveProperty(key);
    }

    // Drive each axis and confirm the state flows into the engine call.
    const weight = document.getElementById('weight');
    weight.value = '20';
    weight.dispatchEvent(new Event('input'));

    const grade = document.getElementById('grade');
    grade.value = 'PRIME';
    grade.dispatchEvent(new Event('change'));

    document.querySelector('.trim-opt[data-value="competition"]').click();
    document.querySelector('.wrap-opt[data-value="foil"]').click();

    const last = calcYield.mock.calls.at(-1)[1];
    expect(last.weight).toBe(20);
    expect(last.grade).toBe('PRIME');
    expect(last.trim).toBe('competition');
    expect(last.wrap).toBe('foil');

    // A result landed in the results panel.
    expect(document.getElementById('trueCost').textContent).not.toBe('0.00');
    expect(Number(document.getElementById('yieldPct').textContent)).toBeGreaterThan(0);
  });
});
