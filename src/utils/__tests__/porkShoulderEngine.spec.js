// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcYield } from '../brisketEngine.js';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const pork = PROTEINS.pork_shoulder;
const CUTS = [
  "bone_in",
  "boneless"
];
const WRAPS = [
  "naked",
  "paper",
  "foil"
];

// Yield golden captured at 8 lb / $1.99.
const yieldGolden = {
  "bone_in|naked": {
    "trimPct": 0.12,
    "cookPct": 0.42,
    "raw": 8,
    "trimWt": 0.96,
    "trimmedWt": 7.04,
    "cookLoss": 2.9568,
    "cookedWt": 4.0832,
    "totalYield": 0.5104,
    "rawCost": 15.92,
    "trueCost": 3.898902821316615,
    "markup": 0.9592476489028214
  },
  "bone_in|paper": {
    "trimPct": 0.12,
    "cookPct": 0.38,
    "raw": 8,
    "trimWt": 0.96,
    "trimmedWt": 7.04,
    "cookLoss": 2.6752000000000002,
    "cookedWt": 4.3648,
    "totalYield": 0.5456,
    "rawCost": 15.92,
    "trueCost": 3.647360703812317,
    "markup": 0.8328445747800588
  },
  "bone_in|foil": {
    "trimPct": 0.12,
    "cookPct": 0.34,
    "raw": 8,
    "trimWt": 0.96,
    "trimmedWt": 7.04,
    "cookLoss": 2.3936,
    "cookedWt": 4.6464,
    "totalYield": 0.5808,
    "rawCost": 15.92,
    "trueCost": 3.4263085399449036,
    "markup": 0.721763085399449
  },
  "boneless|naked": {
    "trimPct": 0.06,
    "cookPct": 0.42,
    "raw": 8,
    "trimWt": 0.48,
    "trimmedWt": 7.52,
    "cookLoss": 3.1584,
    "cookedWt": 4.361599999999999,
    "totalYield": 0.5451999999999999,
    "rawCost": 15.92,
    "trueCost": 3.650036683785767,
    "markup": 0.8341892883345563
  },
  "boneless|paper": {
    "trimPct": 0.06,
    "cookPct": 0.38,
    "raw": 8,
    "trimWt": 0.48,
    "trimmedWt": 7.52,
    "cookLoss": 2.8575999999999997,
    "cookedWt": 4.6624,
    "totalYield": 0.5828,
    "rawCost": 15.92,
    "trueCost": 3.4145504461221687,
    "markup": 0.7158544955387782
  },
  "boneless|foil": {
    "trimPct": 0.06,
    "cookPct": 0.34,
    "raw": 8,
    "trimWt": 0.48,
    "trimmedWt": 7.52,
    "cookLoss": 2.5568,
    "cookedWt": 4.9632,
    "totalYield": 0.6204,
    "rawCost": 15.92,
    "trueCost": 3.2076079948420375,
    "markup": 0.6118633139909737
  },
  "zeroWeight": {
    "trimPct": 0.12,
    "cookPct": 0.38,
    "raw": 0,
    "trimWt": 0,
    "trimmedWt": 0,
    "cookLoss": 0,
    "cookedWt": 0,
    "totalYield": 0,
    "rawCost": 0,
    "trueCost": 0,
    "markup": -1
  },
  "zeroPrice": {
    "trimPct": 0.06,
    "cookPct": 0.38,
    "raw": 8,
    "trimWt": 0.48,
    "trimmedWt": 7.52,
    "cookLoss": 2.8575999999999997,
    "cookedWt": 4.6624,
    "totalYield": 0.5828,
    "rawCost": 0,
    "trueCost": 0,
    "markup": 0
  }
};

describe('pork_shoulder yield — all cut × wrap at 8 lb / $1.99', () => {
  for (const cut of CUTS)
    for (const wrap of WRAPS) {
      const key = `${cut}|${wrap}`;
      it(key, () => {
        expect(calcYield(pork, { weight: 8, price: 1.99, cut, wrap })).toEqual(yieldGolden[key]);
      });
    }

  it('zero weight → zero cooked weight, guarded cost/markup', () => {
    expect(calcYield(pork, { weight: 0, price: 1.99, cut: 'bone_in', wrap: 'paper' })).toEqual(yieldGolden.zeroWeight);
  });
  it('zero price → zero cost', () => {
    expect(calcYield(pork, { weight: 8, price: 0, cut: 'boneless', wrap: 'paper' })).toEqual(yieldGolden.zeroPrice);
  });
});

const stallStates = [
  {
    "weight": 8,
    "pitTemp": "250",
    "pit": "offset_smoker",
    "wrap": "peach_butcher_paper",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "weight": 6,
    "pitTemp": "225",
    "pit": "pellet_cooker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "arid"
  },
  {
    "weight": 10,
    "pitTemp": "275",
    "pit": "ceramic_kamado",
    "wrap": "aluminum_foil",
    "wrapTemp": 165,
    "climate": "humid"
  },
  {
    "weight": 12,
    "pitTemp": "250",
    "pit": "charcoal_kettle",
    "wrap": "peach_butcher_paper",
    "wrapTemp": 155,
    "climate": "moderate"
  }
];
const stallGolden = [
  {
    "t1": 4.448520172769846,
    "stallDuration": 0.41453909220589813,
    "t3": 0.9907959461118535,
    "totalTime": 5.853855211087597,
    "finishTemp": 202
  },
  {
    "t1": 4.223768850129191,
    "stallDuration": 1.1961239962680428,
    "t3": 1.7754554760678387,
    "totalTime": 7.1953483224650725,
    "finishTemp": 202
  },
  {
    "t1": 5.280375981389937,
    "stallDuration": 0,
    "t3": 0.487618493748183,
    "totalTime": 5.76799447513812,
    "finishTemp": 202
  },
  {
    "t1": 5.352096469312078,
    "stallDuration": 0.5501039679068342,
    "t3": 1.168911153778919,
    "totalTime": 7.071111590997831,
    "finishTemp": 202
  }
];

describe('pork_shoulder stall — phase durations to 6 decimals', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i}: ${s.pit} / ${s.wrap} / ${s.climate}`, () => {
      const m = computeModel(s, pork);
      expect(m.t1).toBeCloseTo(stallGolden[i].t1, 6);
      expect(m.stallDuration).toBeCloseTo(stallGolden[i].stallDuration, 6);
      expect(m.t3).toBeCloseTo(stallGolden[i].t3, 6);
      expect(m.totalTime).toBeCloseTo(stallGolden[i].totalTime, 6);
    });
  });
});

describe('pork_shoulder buildPath — time monotonic, ends at pork finish temp', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i} path`, () => {
      const pts = buildPath(computeModel(s, pork));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) {
        expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      }
      expect(pts[pts.length - 1].temp).toBeCloseTo(stallGolden[i].finishTemp, 6);
    });
  });
});
