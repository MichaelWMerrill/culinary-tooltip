// @vitest-environment happy-dom
/*
 * DOM smoke test: render CookScheduler (weight input from thermal.axes), drive
 * the axes, and assert cookDuration (the scheduler's model entry point) was
 * called with the right parameter names and a schedule landed in the results panel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookScheduler from '../CookScheduler.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/stallEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, cookDuration: vi.fn(actual.cookDuration), buildPath: vi.fn(actual.buildPath) };
});

import { cookDuration } from '../../../utils/stallEngine.js';
import { initCookScheduler } from '../cookScheduler.controller.js';

const mount = () => mountComponent(CookScheduler);

describe('CookScheduler smoke', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders controls, drives them, calls cookDuration with axis params, lands a schedule', async () => {
    await mount();

    for (const id of ['serveAt', 'weight', 'wrapToggle', 'climateToggle', 'rest', 'timeline', 'fireUpBig']) {
      expect(document.getElementById(id), `#${id} present`).toBeTruthy();
    }

    initCookScheduler();

    // init seeds a default serve time, so a schedule computes immediately.
    // cookDuration(protein, state) — the state (2nd arg) carries the axis params.
    expect(cookDuration).toHaveBeenCalled();
    const firstState = cookDuration.mock.calls.at(-1)[1];
    for (const key of ['weight', 'pitTemp', 'pit', 'wrap', 'wrapTemp', 'climate']) {
      expect(firstState, `arg has ${key}`).toHaveProperty(key);
    }

    const weight = document.getElementById('weight');
    weight.value = '18';
    weight.dispatchEvent(new Event('input'));

    document.querySelector('.wrap-opt[data-wrap="aluminum_foil"]').click();
    document.querySelector('.temp-opt[data-temp="250"]').click();

    const rest = document.getElementById('rest');
    rest.value = '2';
    rest.dispatchEvent(new Event('input'));

    const last = cookDuration.mock.calls.at(-1)[1];
    expect(last.weight).toBe(18);
    expect(last.wrap).toBe('aluminum_foil');
    expect(last.pitTemp).toBe('250');

    // A schedule landed: the fire-up headline is no longer the empty prompt and
    // the timeline has milestone entries.
    expect(document.getElementById('fireUpBig').textContent).not.toBe('Pick a serving time');
    expect(document.getElementById('timeline').children.length).toBeGreaterThan(0);
  });
});
