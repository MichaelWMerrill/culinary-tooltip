// @vitest-environment happy-dom
/*
 * DOM smoke test: render StallPredictor (weight input from thermal.axes), drive
 * the axes, and assert computeModel was called with the right parameter names
 * and a result landed in the results panel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StallPredictor from '../StallPredictor.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/stallEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, computeModel: vi.fn(actual.computeModel), buildPath: vi.fn(actual.buildPath) };
});

import { computeModel } from '../../../utils/stallEngine.js';
import { initStallPredictor } from '../stallPredictor.controller.js';

const mount = () => mountComponent(StallPredictor);

describe('StallPredictor smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders controls, drives them, calls computeModel with axis params, lands a result', async () => {
    await mount();

    for (const id of ['weight', 'pit', 'wrapToggle', 'climateToggle', 'pitTempToggle', 'chart']) {
      expect(document.getElementById(id), `#${id} present`).toBeTruthy();
    }

    initStallPredictor();

    expect(computeModel).toHaveBeenCalled();
    const firstArg = computeModel.mock.calls.at(-1)[0];
    for (const key of ['weight', 'pitTemp', 'pit', 'wrap', 'wrapTemp', 'climate']) {
      expect(firstArg, `arg has ${key}`).toHaveProperty(key);
    }

    const weight = document.getElementById('weight');
    weight.value = '16';
    weight.dispatchEvent(new Event('input'));

    const pit = document.getElementById('pit');
    pit.value = 'ceramic_kamado';
    pit.dispatchEvent(new Event('change'));

    document.querySelector('.wrap-opt[data-wrap="aluminum_foil"]').click();
    document.querySelector('.climate-opt[data-climate="humid"]').click();
    document.querySelector('.temp-opt[data-temp="275"]').click();

    const last = computeModel.mock.calls.at(-1)[0];
    expect(last.weight).toBe(16);
    expect(last.pit).toBe('ceramic_kamado');
    expect(last.wrap).toBe('aluminum_foil');
    expect(last.climate).toBe('humid');
    expect(last.pitTemp).toBe('275');

    // A result landed in the results panel.
    expect(document.getElementById('totalTime').textContent).not.toBe('—');
    expect(document.getElementById('chart').children.length).toBeGreaterThan(0);
  });
});
