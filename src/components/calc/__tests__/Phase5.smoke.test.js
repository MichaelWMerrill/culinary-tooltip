// @vitest-environment happy-dom
/*
 * DOM smoke tests for the Phase 5 tools:
 *  - RestCalculator: drives the hold controls and lands a cooling curve + verdict
 *  - PartyPlanner: inverts calcYield — switching protein swaps the visible enum
 *    axes and recomputes the raw weight to buy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RestCalculator from '../RestCalculator.astro';
import PartyPlanner from '../PartyPlanner.astro';
import { mountComponent } from './mount.js';

vi.mock('../../../utils/brisketEngine.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, calcYield: vi.fn(actual.calcYield) };
});

import { calcYield } from '../../../utils/brisketEngine.js';
import { initRestCalculator } from '../restCalculator.controller.js';
import { initPartyPlanner } from '../partyPlanner.controller.js';

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  vi.clearAllMocks();
});

describe('RestCalculator', () => {
  it('lands a safe window, serve temp, verdict, and cooling curve; reacts to the hold', async () => {
    await mountComponent(RestCalculator);
    initRestCalculator();

    expect(document.getElementById('safeWindow').textContent).not.toBe('—');
    expect(Number(document.getElementById('serveTemp').textContent)).toBeGreaterThan(0);
    expect(document.getElementById('chart').children.length).toBeGreaterThan(0);
    expect(document.getElementById('verdictText').textContent).not.toBe('—');

    // A warm oven holds indefinitely; the counter cools fast.
    document.querySelector('.hold-opt[data-value="oven_hold"]').click();
    expect(document.getElementById('safeWindow').textContent).toBe('Indefinite');
    document.querySelector('.hold-opt[data-value="counter"]').click();
    expect(document.getElementById('safeWindow').textContent).not.toBe('Indefinite');
  });
});

describe('PartyPlanner (inverts calcYield)', () => {
  it('computes a raw weight + budget and swaps enum axes when protein changes', async () => {
    await mountComponent(PartyPlanner);
    initPartyPlanner();

    // Brisket default: grade/trim/wrap visible, pork/turkey axes hidden.
    expect(document.querySelector('[data-yield-axis="grade"]').hidden).toBe(false);
    expect(document.querySelector('[data-yield-axis="cut"]').hidden).toBe(true);
    expect(document.querySelector('[data-yield-axis="preparation"]').hidden).toBe(true);

    expect(calcYield).toHaveBeenCalled();
    expect(calcYield.mock.calls.at(-1)[0].meta.id).toBe('beef_brisket');
    expect(Number(document.getElementById('rawWeight').textContent)).toBeGreaterThan(0);
    expect(Number(document.getElementById('budget').textContent)).toBeGreaterThan(0);

    // Raw weight must exceed cooked weight (yield < 100%).
    const raw = Number(document.getElementById('rawWeight').textContent);
    const cooked = Number(document.getElementById('cookedWeight').textContent);
    expect(raw).toBeGreaterThan(cooked);

    // Switch to pork shoulder → cut axis shows, grade hides, engine gets pork.
    const sel = document.getElementById('protein');
    sel.value = 'pork_shoulder';
    sel.dispatchEvent(new Event('change'));
    expect(document.querySelector('[data-yield-axis="cut"]').hidden).toBe(false);
    expect(document.querySelector('[data-yield-axis="grade"]').hidden).toBe(true);
    expect(calcYield.mock.calls.at(-1)[0].meta.id).toBe('pork_shoulder');
    expect(document.querySelector('.cut-opt[data-value="boneless"]')).toBeTruthy();
  });
});
