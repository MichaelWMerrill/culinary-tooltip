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
    "t1": 5.621122203344756,
    "stallDuration": 1.0465933690697566,
    "t3": 1.6662797202298074,
    "totalTime": 8.33399529264432
  },
  {
    "t1": 3.8856026019313306,
    "stallDuration": 2.072345132743363,
    "t3": 1.357553595472524,
    "totalTime": 7.315501330147217
  },
  {
    "t1": 5.7785101872835645,
    "stallDuration": 0,
    "t3": 0.6169195480983108,
    "totalTime": 6.395429735381875
  },
  {
    "t1": 5.162435242729153,
    "stallDuration": 0.7024519734146769,
    "t3": 1.5918814447684693,
    "totalTime": 7.4567686609122985
  },
  {
    "t1": 4.480912867657959,
    "stallDuration": 1.1530886098348228,
    "t3": 0.8887250360623069,
    "totalTime": 6.522726513555089
  },
  {
    "t1": 4.668445864513861,
    "stallDuration": 2.8984490458983445,
    "t3": 0.585841873853061,
    "totalTime": 8.152736784265267
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
