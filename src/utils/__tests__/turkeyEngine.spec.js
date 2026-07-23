// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcYield } from '../brisketEngine.js';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const turkey = PROTEINS.turkey;
const PREPS = [
  "whole",
  "spatchcock"
];
const BRINE = [
  "no",
  "yes"
];
const yieldGolden = {
  "whole|no": {
    "trimPct": 0.05,
    "cookPct": 0.28,
    "raw": 14,
    "trimWt": 0.7000000000000001,
    "trimmedWt": 13.3,
    "cookLoss": 3.7240000000000006,
    "cookedWt": 9.576,
    "totalYield": 0.684,
    "rawCost": 20.86,
    "trueCost": 2.178362573099415,
    "markup": 0.46198830409356706
  },
  "whole|yes": {
    "trimPct": 0.05,
    "cookPct": 0.2,
    "raw": 14,
    "trimWt": 0.7000000000000001,
    "trimmedWt": 13.3,
    "cookLoss": 2.66,
    "cookedWt": 10.64,
    "totalYield": 0.76,
    "rawCost": 20.86,
    "trueCost": 1.9605263157894735,
    "markup": 0.3157894736842104
  },
  "spatchcock|no": {
    "trimPct": 0.07,
    "cookPct": 0.28,
    "raw": 14,
    "trimWt": 0.9800000000000001,
    "trimmedWt": 13.02,
    "cookLoss": 3.6456000000000004,
    "cookedWt": 9.3744,
    "totalYield": 0.6696,
    "rawCost": 20.86,
    "trueCost": 2.2252090800477897,
    "markup": 0.49342891278375145
  },
  "spatchcock|yes": {
    "trimPct": 0.07,
    "cookPct": 0.2,
    "raw": 14,
    "trimWt": 0.9800000000000001,
    "trimmedWt": 13.02,
    "cookLoss": 2.604,
    "cookedWt": 10.416,
    "totalYield": 0.744,
    "rawCost": 20.86,
    "trueCost": 2.0026881720430105,
    "markup": 0.34408602150537626
  }
};

describe('turkey yield — preparation × brined at 14 lb / $1.49', () => {
  for (const preparation of PREPS)
    for (const brined of BRINE) {
      const key = `${preparation}|${brined}`;
      it(key, () => {
        expect(calcYield(turkey, { weight: 14, price: 1.49, preparation, brined })).toEqual(yieldGolden[key]);
      });
    }
  it('brined retains more weight than unbrined (higher cooked yield)', () => {
    const dry = calcYield(turkey, { weight: 14, price: 1.49, preparation: 'whole', brined: 'no' });
    const wet = calcYield(turkey, { weight: 14, price: 1.49, preparation: 'whole', brined: 'yes' });
    expect(wet.cookedWt).toBeGreaterThan(dry.cookedWt);
  });
});

const stallStates = [
  {
    "preparation": "whole",
    "weight": 14,
    "pitTemp": "275",
    "pit": "offset_smoker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "preparation": "spatchcock",
    "weight": 12,
    "pitTemp": "250",
    "pit": "pellet_cooker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "preparation": "whole",
    "weight": 20,
    "pitTemp": "225",
    "pit": "ceramic_kamado",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "humid"
  },
  {
    "preparation": "whole",
    "weight": 16,
    "pitTemp": "325",
    "pit": "offset_smoker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "preparation": "whole",
    "weight": 12,
    "pitTemp": "300",
    "pit": "charcoal_kettle",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "moderate"
  }
];
const stallGolden = [
  {
    "t1": 5.27955616433919,
    "stallDuration": 0,
    "t3": 0,
    "totalTime": 5.27955616433919,
    "noStall": true,
    "finishTemp": 160
  },
  {
    "t1": 4.2687521982796595,
    "stallDuration": 0,
    "t3": 0,
    "totalTime": 4.2687521982796595,
    "noStall": true,
    "finishTemp": 160
  },
  {
    "t1": 12.695918010635179,
    "stallDuration": 0,
    "t3": 0,
    "totalTime": 12.695918010635179,
    "noStall": true,
    "finishTemp": 160
  },
  {
    "t1": 3.7329474872603314,
    "stallDuration": 0,
    "t3": 0,
    "totalTime": 3.7329474872603314,
    "noStall": true,
    "finishTemp": 160
  },
  {
    "t1": 4.060294662523577,
    "stallDuration": 0,
    "t3": 0,
    "totalTime": 4.060294662523577,
    "noStall": true,
    "finishTemp": 160
  }
];

describe('turkey no-stall path — monotonic climb, no plateau', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i}: ${s.preparation} / ${s.weight}lb / ${s.pitTemp}`, () => {
      const m = computeModel(s, turkey);
      expect(m.noStall).toBe(true);
      expect(m.stallDuration).toBe(0);
      expect(m.t1).toBeCloseTo(stallGolden[i].t1, 6);
      expect(m.totalTime).toBeCloseTo(stallGolden[i].totalTime, 6);
    });
  });
  it('spatchcock cooks faster than a whole bird of the same weight', () => {
    const base = { weight: 14, pitTemp: '275', pit: 'offset_smoker', wrap: 'none', wrapTemp: 160, climate: 'moderate' };
    const whole = computeModel({ ...base, preparation: 'whole' }, turkey).totalTime;
    const spatch = computeModel({ ...base, preparation: 'spatchcock' }, turkey).totalTime;
    expect(spatch).toBeLessThan(whole);
  });
});

describe('turkey buildPath — monotonic in time AND temp, ends at 160°F', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i} path`, () => {
      const pts = buildPath(computeModel(s, turkey));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) {
        expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
        expect(pts[k].temp).toBeGreaterThanOrEqual(pts[k - 1].temp - 1e-9);
      }
      expect(pts[pts.length - 1].temp).toBeCloseTo(stallGolden[i].finishTemp, 6);
    });
  });
});
