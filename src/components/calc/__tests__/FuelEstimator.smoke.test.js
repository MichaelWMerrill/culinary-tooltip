// @vitest-environment happy-dom
/*
 * DOM smoke test: render FuelEstimator, drive its controls, and assert the
 * fuel engine `estimate` was called with the right parameter names and a result
 * landed in the results panel. (This tool has no protein-specific axes.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FuelEstimator from '../FuelEstimator.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/fuelEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, estimate: vi.fn(actual.estimate) };
});

import { estimate } from '../../../utils/fuelEngine.js';
import { initFuelEstimator } from '../fuelEstimator.controller.js';

const mount = () => mountComponent(FuelEstimator);

describe('FuelEstimator smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders controls, drives them, calls estimate with the right params, lands a result', async () => {
    await mount();

    for (const id of ['fuelToggle', 'duration', 'insulation', 'ambient', 'windToggle', 'bagCost', 'bagWeight']) {
      expect(document.getElementById(id), `#${id} present`).toBeTruthy();
    }

    initFuelEstimator();

    expect(estimate).toHaveBeenCalled();
    const firstArg = estimate.mock.calls.at(-1)[0];
    for (const key of ['fuel', 'duration', 'insulation', 'ambientTemp', 'wind', 'bagCost', 'bagWeight']) {
      expect(firstArg, `arg has ${key}`).toHaveProperty(key);
    }

    const duration = document.getElementById('duration');
    duration.value = '18';
    duration.dispatchEvent(new Event('input'));

    document.querySelector('.fuel-opt[data-fuel="charcoal_briquettes"]').click();
    document.querySelector('.wind-opt[data-wind="high_wind_15mph"]').click();

    // The comparison panel re-calls estimate for all three fuels each render, so
    // the selected fuel is asserted via the control's pressed state; duration and
    // wind (unchanged across comparison calls) are asserted via the engine args.
    const last = estimate.mock.calls.at(-1)[0];
    expect(last.duration).toBe(18);
    expect(last.wind).toBe('high_wind_15mph');
    expect(document.querySelector('.fuel-opt[data-fuel="charcoal_briquettes"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.wind-opt[data-wind="high_wind_15mph"]').getAttribute('aria-pressed')).toBe('true');

    // A result landed in the results panel.
    expect(Number(document.getElementById('fuelLbs').textContent)).toBeGreaterThan(0);
  });
});
