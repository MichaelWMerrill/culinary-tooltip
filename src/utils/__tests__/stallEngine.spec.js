// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { computeModel, buildPath, FINISH_TEMP } from '../stallEngine.js';

// 6 states covering every pit type, wrap type, and climate.
const states = [
  {
    "weight": 12,
    "pitTemp": "225",
    "pit": "offset_smoker",
    "wrap": "peach_butcher_paper",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "weight": 10,
    "pitTemp": "250",
    "pit": "pellet_cooker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "arid"
  },
  {
    "weight": 16,
    "pitTemp": "275",
    "pit": "ceramic_kamado",
    "wrap": "aluminum_foil",
    "wrapTemp": 165,
    "climate": "humid"
  },
  {
    "weight": 8,
    "pitTemp": "225",
    "pit": "charcoal_kettle",
    "wrap": "peach_butcher_paper",
    "wrapTemp": 155,
    "climate": "moderate"
  },
  {
    "weight": 14,
    "pitTemp": "250",
    "pit": "offset_smoker",
    "wrap": "aluminum_foil",
    "wrapTemp": 160,
    "climate": "arid"
  },
  {
    "weight": 18,
    "pitTemp": "275",
    "pit": "pellet_cooker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "humid"
  }
];
const golden = [
  {
    "t1": 10.08315562763144,
    "stallDuration": 1.6525158458996165,
    "t3": 2.7772303570044707,
    "totalTime": 14.512901830535526
  },
  {
    "t1": 6.092076592934962,
    "stallDuration": 3.2721238938053094,
    "t3": 2.1284524769779893,
    "totalTime": 11.49265296371826
  },
  {
    "t1": 12.829632109767115,
    "stallDuration": 0,
    "t3": 1.3697044025020264,
    "totalTime": 14.199336512269142
  },
  {
    "t1": 6.859943339064068,
    "stallDuration": 1.1091346948652794,
    "t3": 2.018637063079207,
    "totalTime": 9.987715097008554
  },
  {
    "t1": 9.011730989321961,
    "stallDuration": 1.820666226054984,
    "t3": 1.6569858774722994,
    "totalTime": 12.489383092849245
  },
  {
    "t1": 11.30898201946679,
    "stallDuration": 4.576498493523702,
    "t3": 1.4191607678297258,
    "totalTime": 17.304641280820217
  }
];

describe('computeModel — phase durations to 6 decimals', () => {
  states.forEach((s, i) => {
    it(`state ${i}: ${s.pit} / ${s.wrap} / ${s.climate}`, () => {
      const m = computeModel(s);
      expect(m.t1).toBeCloseTo(golden[i].t1, 6);
      expect(m.stallDuration).toBeCloseTo(golden[i].stallDuration, 6);
      expect(m.t3).toBeCloseTo(golden[i].t3, 6);
      expect(m.totalTime).toBeCloseTo(golden[i].totalTime, 6);
    });
  });
});

describe('buildPath — time monotonic, ends at FINISH_TEMP', () => {
  states.forEach((s, i) => {
    it(`state ${i} path`, () => {
      const pts = buildPath(computeModel(s));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) {
        expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      }
      expect(pts[pts.length - 1].temp).toBeCloseTo(FINISH_TEMP, 6);
    });
  });
});
