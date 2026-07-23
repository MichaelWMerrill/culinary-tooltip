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
    "t1": 6.224881348661453,
    "stallDuration": 3.5993362831858406,
    "t3": 2.003912637848287,
    "totalTime": 11.828130269695581
  },
  {
    "t1": 12.908856136598224,
    "stallDuration": 0,
    "t3": 1.3237774304260204,
    "totalTime": 14.232633567024244
  },
  {
    "t1": 6.859943339064068,
    "stallDuration": 1.1091346948652794,
    "t3": 2.018637063079207,
    "totalTime": 9.987715097008554
  },
  {
    "t1": 9.208183006044418,
    "stallDuration": 1.432200513110074,
    "t3": 1.6379397279011572,
    "totalTime": 12.27832324705565
  },
  {
    "t1": 11.378815907709049,
    "stallDuration": 3.5816075166707235,
    "t3": 1.3405753181453415,
    "totalTime": 16.300998742525113
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
