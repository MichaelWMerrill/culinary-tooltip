// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { restCurve, tempAfter, SAFE_TEMP } from '../restEngine.js';

const states = [
  {
    "pullTemp": 203,
    "hold": "oven_hold",
    "holdHours": 2
  },
  {
    "pullTemp": 203,
    "hold": "faux_cambro",
    "holdHours": 2
  },
  {
    "pullTemp": 203,
    "hold": "bare_cooler",
    "holdHours": 2
  },
  {
    "pullTemp": 203,
    "hold": "counter",
    "holdHours": 2
  }
];
const golden = [
  {
    "safeHours": null,
    "tempAtServe": 193.39272991313305,
    "safeAtServe": true
  },
  {
    "safeHours": 6.418538861723948,
    "tempAtServe": 178.89119015937158,
    "safeAtServe": true
  },
  {
    "safeHours": 3.209269430861974,
    "tempAtServe": 159.15256612274004,
    "safeAtServe": true
  },
  {
    "safeHours": 1.1670070657679905,
    "tempAtServe": 114.27185413184458,
    "safeAtServe": false
  }
];

describe('restCurve — safe-hold window + temp at serve (203°F pull, 2 h)', () => {
  states.forEach((s, i) => {
    it(s.hold, () => {
      const r = restCurve(s);
      if (golden[i].safeHours === null) {
        expect(r.safeHours).toBe(Infinity);
      } else {
        expect(r.safeHours).toBeCloseTo(golden[i].safeHours, 6);
      }
      expect(r.tempAtServe).toBeCloseTo(golden[i].tempAtServe, 6);
      expect(r.safeAtServe).toBe(golden[i].safeAtServe);
    });
  });
});

describe('restCurve — physical invariants', () => {
  it('cools monotonically and starts at the pull temp', () => {
    const { pts } = restCurve({ pullTemp: 203, hold: 'faux_cambro', holdHours: 4 });
    expect(pts[0].temp).toBeCloseTo(203, 6);
    for (let i = 1; i < pts.length; i++) expect(pts[i].temp).toBeLessThanOrEqual(pts[i - 1].temp + 1e-9);
  });
  it('a ≥140°F hold (warm oven) never crosses the safety floor', () => {
    expect(restCurve({ pullTemp: 203, hold: 'oven_hold', holdHours: 12 }).safeHours).toBe(Infinity);
    expect(tempAfter(203, 'oven_hold', 100)).toBeGreaterThan(SAFE_TEMP);
  });
  it('the counter cools fastest (shortest safe window)', () => {
    const counter = restCurve({ pullTemp: 203, hold: 'counter', holdHours: 1 }).safeHours;
    const cambro = restCurve({ pullTemp: 203, hold: 'faux_cambro', holdHours: 1 }).safeHours;
    expect(counter).toBeLessThan(cambro);
  });
});
