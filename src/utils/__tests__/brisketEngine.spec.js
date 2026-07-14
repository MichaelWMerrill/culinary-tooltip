// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcBrisket } from '../brisketEngine.js';

const GRADES = [
  "PRIME",
  "CHOICE",
  "SELECT"
];
const TRIMS = [
  "commercial",
  "competition"
];
const WRAPS = [
  "naked",
  "paper",
  "foil"
];

// Golden outputs captured from the engine at 12.5 lb / $4.29.
const golden = {
  "PRIME|commercial|naked": {
    "trimPct": 0.28,
    "cookPct": 0.4,
    "raw": 12.5,
    "trimWt": 3.5000000000000004,
    "trimmedWt": 9,
    "cookLoss": 3.6,
    "cookedWt": 5.4,
    "totalYield": 0.43200000000000005,
    "rawCost": 53.625,
    "trueCost": 9.930555555555555,
    "markup": 1.3148148148148149
  },
  "PRIME|commercial|paper": {
    "trimPct": 0.28,
    "cookPct": 0.35,
    "raw": 12.5,
    "trimWt": 3.5000000000000004,
    "trimmedWt": 9,
    "cookLoss": 3.15,
    "cookedWt": 5.85,
    "totalYield": 0.46799999999999997,
    "rawCost": 53.625,
    "trueCost": 9.166666666666668,
    "markup": 1.1367521367521372
  },
  "PRIME|commercial|foil": {
    "trimPct": 0.28,
    "cookPct": 0.31,
    "raw": 12.5,
    "trimWt": 3.5000000000000004,
    "trimmedWt": 9,
    "cookLoss": 2.79,
    "cookedWt": 6.21,
    "totalYield": 0.4968,
    "rawCost": 53.625,
    "trueCost": 8.635265700483092,
    "markup": 1.0128824476650564
  },
  "PRIME|competition|naked": {
    "trimPct": 0.42,
    "cookPct": 0.4,
    "raw": 12.5,
    "trimWt": 5.25,
    "trimmedWt": 7.25,
    "cookLoss": 2.9000000000000004,
    "cookedWt": 4.35,
    "totalYield": 0.348,
    "rawCost": 53.625,
    "trueCost": 12.327586206896553,
    "markup": 1.8735632183908049
  },
  "PRIME|competition|paper": {
    "trimPct": 0.42,
    "cookPct": 0.35,
    "raw": 12.5,
    "trimWt": 5.25,
    "trimmedWt": 7.25,
    "cookLoss": 2.5374999999999996,
    "cookedWt": 4.7125,
    "totalYield": 0.377,
    "rawCost": 53.625,
    "trueCost": 11.379310344827585,
    "markup": 1.6525198938992038
  },
  "PRIME|competition|foil": {
    "trimPct": 0.42,
    "cookPct": 0.31,
    "raw": 12.5,
    "trimWt": 5.25,
    "trimmedWt": 7.25,
    "cookLoss": 2.2475,
    "cookedWt": 5.0024999999999995,
    "totalYield": 0.40019999999999994,
    "rawCost": 53.625,
    "trueCost": 10.719640179910046,
    "markup": 1.4987506246876565
  },
  "CHOICE|commercial|naked": {
    "trimPct": 0.24,
    "cookPct": 0.39,
    "raw": 12.5,
    "trimWt": 3,
    "trimmedWt": 9.5,
    "cookLoss": 3.705,
    "cookedWt": 5.795,
    "totalYield": 0.4636,
    "rawCost": 53.625,
    "trueCost": 9.253666954270923,
    "markup": 1.1570319240724762
  },
  "CHOICE|commercial|paper": {
    "trimPct": 0.24,
    "cookPct": 0.34,
    "raw": 12.5,
    "trimWt": 3,
    "trimmedWt": 9.5,
    "cookLoss": 3.2300000000000004,
    "cookedWt": 6.27,
    "totalYield": 0.5015999999999999,
    "rawCost": 53.625,
    "trueCost": 8.552631578947368,
    "markup": 0.9936204146730461
  },
  "CHOICE|commercial|foil": {
    "trimPct": 0.24,
    "cookPct": 0.3,
    "raw": 12.5,
    "trimWt": 3,
    "trimmedWt": 9.5,
    "cookLoss": 2.85,
    "cookedWt": 6.65,
    "totalYield": 0.532,
    "rawCost": 53.625,
    "trueCost": 8.06390977443609,
    "markup": 0.8796992481203005
  },
  "CHOICE|competition|naked": {
    "trimPct": 0.36,
    "cookPct": 0.39,
    "raw": 12.5,
    "trimWt": 4.5,
    "trimmedWt": 8,
    "cookLoss": 3.12,
    "cookedWt": 4.88,
    "totalYield": 0.39039999999999997,
    "rawCost": 53.625,
    "trueCost": 10.988729508196721,
    "markup": 1.5614754098360657
  },
  "CHOICE|competition|paper": {
    "trimPct": 0.36,
    "cookPct": 0.34,
    "raw": 12.5,
    "trimWt": 4.5,
    "trimmedWt": 8,
    "cookLoss": 2.72,
    "cookedWt": 5.279999999999999,
    "totalYield": 0.42239999999999994,
    "rawCost": 53.625,
    "trueCost": 10.156250000000002,
    "markup": 1.3674242424242427
  },
  "CHOICE|competition|foil": {
    "trimPct": 0.36,
    "cookPct": 0.3,
    "raw": 12.5,
    "trimWt": 4.5,
    "trimmedWt": 8,
    "cookLoss": 2.4,
    "cookedWt": 5.6,
    "totalYield": 0.44799999999999995,
    "rawCost": 53.625,
    "trueCost": 9.575892857142858,
    "markup": 1.2321428571428572
  },
  "SELECT|commercial|naked": {
    "trimPct": 0.19,
    "cookPct": 0.38,
    "raw": 12.5,
    "trimWt": 2.375,
    "trimmedWt": 10.125,
    "cookLoss": 3.8475,
    "cookedWt": 6.2775,
    "totalYield": 0.5022,
    "rawCost": 53.625,
    "trueCost": 8.542413381123058,
    "markup": 0.9912385503783352
  },
  "SELECT|commercial|paper": {
    "trimPct": 0.19,
    "cookPct": 0.33,
    "raw": 12.5,
    "trimWt": 2.375,
    "trimmedWt": 10.125,
    "cookLoss": 3.34125,
    "cookedWt": 6.7837499999999995,
    "totalYield": 0.5427,
    "rawCost": 53.625,
    "trueCost": 7.904919845218354,
    "markup": 0.8426386585590568
  },
  "SELECT|commercial|foil": {
    "trimPct": 0.19,
    "cookPct": 0.29,
    "raw": 12.5,
    "trimWt": 2.375,
    "trimmedWt": 10.125,
    "cookLoss": 2.93625,
    "cookedWt": 7.188750000000001,
    "totalYield": 0.5751000000000001,
    "rawCost": 53.625,
    "trueCost": 7.459572248304642,
    "markup": 0.738828029907842
  },
  "SELECT|competition|naked": {
    "trimPct": 0.3,
    "cookPct": 0.38,
    "raw": 12.5,
    "trimWt": 3.75,
    "trimmedWt": 8.75,
    "cookLoss": 3.325,
    "cookedWt": 5.425,
    "totalYield": 0.434,
    "rawCost": 53.625,
    "trueCost": 9.88479262672811,
    "markup": 1.3041474654377878
  },
  "SELECT|competition|paper": {
    "trimPct": 0.3,
    "cookPct": 0.33,
    "raw": 12.5,
    "trimWt": 3.75,
    "trimmedWt": 8.75,
    "cookLoss": 2.8875,
    "cookedWt": 5.8625,
    "totalYield": 0.469,
    "rawCost": 53.625,
    "trueCost": 9.147121535181236,
    "markup": 1.1321961620469083
  },
  "SELECT|competition|foil": {
    "trimPct": 0.3,
    "cookPct": 0.29,
    "raw": 12.5,
    "trimWt": 3.75,
    "trimmedWt": 8.75,
    "cookLoss": 2.5374999999999996,
    "cookedWt": 6.2125,
    "totalYield": 0.49700000000000005,
    "rawCost": 53.625,
    "trueCost": 8.6317907444668,
    "markup": 1.0120724346076457
  },
  "zeroWeight": {
    "trimPct": 0.24,
    "cookPct": 0.34,
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
    "trimPct": 0.24,
    "cookPct": 0.34,
    "raw": 12.5,
    "trimWt": 3,
    "trimmedWt": 9.5,
    "cookLoss": 3.2300000000000004,
    "cookedWt": 6.27,
    "totalYield": 0.5015999999999999,
    "rawCost": 0,
    "trueCost": 0,
    "markup": 0
  }
};

describe('calcBrisket — all grade × trim × wrap at 12.5 lb / $4.29', () => {
  for (const grade of GRADES)
    for (const trim of TRIMS)
      for (const wrap of WRAPS) {
        const key = `${grade}|${trim}|${wrap}`;
        it(key, () => {
          expect(calcBrisket({ weight: 12.5, price: 4.29, grade, trim, wrap })).toEqual(golden[key]);
        });
      }

  it('zero weight → zero cooked weight, guarded cost/markup', () => {
    expect(calcBrisket({ weight: 0, price: 4.29, grade: 'CHOICE', trim: 'commercial', wrap: 'paper' })).toEqual(
      golden.zeroWeight
    );
  });
  it('zero price → zero cost', () => {
    expect(calcBrisket({ weight: 12.5, price: 0, grade: 'CHOICE', trim: 'commercial', wrap: 'paper' })).toEqual(
      golden.zeroPrice
    );
  });
});
