// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { ambientMultiplier, estimate } from '../fuelEngine.js';

const AMBIENT_POINTS = [
  20,
  30,
  40,
  55,
  70,
  80,
  90,
  100,
  110,
  120,
  125
];
const ambientGolden = [
  1.75,
  1.55,
  1.35,
  1.175,
  1,
  0.9,
  0.8,
  0.7250000000000001,
  0.65,
  0.65,
  0.65
];

const FUELS = [
  "wood_pellets",
  "charcoal_briquettes",
  "hardwood_splits"
];
const INSULATIONS = [
  "single_wall_steel",
  "insulated_blanket",
  "ceramic_double_wall"
];
const WINDS = [
  "calm_0_5mph",
  "breezy_5_15mph",
  "high_wind_15mph"
];
const baseState = {
  "duration": 12,
  "ambientTemp": 70,
  "bagCost": 18,
  "bagWeight": 20
};
const estimateGolden = {
  "wood_pellets|single_wall_steel|calm_0_5mph": {
    "lbs": 14.399999999999999,
    "cost": 12.959999999999999,
    "bags": 0.72,
    "costPerLb": 0.9,
    "effRate": 1.2
  },
  "wood_pellets|single_wall_steel|breezy_5_15mph": {
    "lbs": 18,
    "cost": 16.2,
    "bags": 0.9,
    "costPerLb": 0.9,
    "effRate": 1.5
  },
  "wood_pellets|single_wall_steel|high_wind_15mph": {
    "lbs": 23.04,
    "cost": 20.736,
    "bags": 1.152,
    "costPerLb": 0.9,
    "effRate": 1.92
  },
  "wood_pellets|insulated_blanket|calm_0_5mph": {
    "lbs": 9.257142857142856,
    "cost": 8.331428571428571,
    "bags": 0.4628571428571428,
    "costPerLb": 0.9,
    "effRate": 0.7714285714285714
  },
  "wood_pellets|insulated_blanket|breezy_5_15mph": {
    "lbs": 11.571428571428573,
    "cost": 10.414285714285716,
    "bags": 0.5785714285714286,
    "costPerLb": 0.9,
    "effRate": 0.9642857142857144
  },
  "wood_pellets|insulated_blanket|high_wind_15mph": {
    "lbs": 14.811428571428571,
    "cost": 13.330285714285715,
    "bags": 0.7405714285714285,
    "costPerLb": 0.9,
    "effRate": 1.2342857142857142
  },
  "wood_pellets|ceramic_double_wall|calm_0_5mph": {
    "lbs": 7.623529411764705,
    "cost": 6.861176470588235,
    "bags": 0.3811764705882353,
    "costPerLb": 0.9,
    "effRate": 0.6352941176470588
  },
  "wood_pellets|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 9.529411764705882,
    "cost": 8.576470588235294,
    "bags": 0.4764705882352941,
    "costPerLb": 0.9,
    "effRate": 0.7941176470588235
  },
  "wood_pellets|ceramic_double_wall|high_wind_15mph": {
    "lbs": 12.197647058823529,
    "cost": 10.977882352941176,
    "bags": 0.6098823529411764,
    "costPerLb": 0.9,
    "effRate": 1.016470588235294
  },
  "charcoal_briquettes|single_wall_steel|calm_0_5mph": {
    "lbs": 18,
    "cost": 16.2,
    "bags": 0.9,
    "costPerLb": 0.9,
    "effRate": 1.5
  },
  "charcoal_briquettes|single_wall_steel|breezy_5_15mph": {
    "lbs": 22.5,
    "cost": 20.25,
    "bags": 1.125,
    "costPerLb": 0.9,
    "effRate": 1.875
  },
  "charcoal_briquettes|single_wall_steel|high_wind_15mph": {
    "lbs": 28.8,
    "cost": 25.92,
    "bags": 1.44,
    "costPerLb": 0.9,
    "effRate": 2.4
  },
  "charcoal_briquettes|insulated_blanket|calm_0_5mph": {
    "lbs": 11.571428571428573,
    "cost": 10.414285714285716,
    "bags": 0.5785714285714286,
    "costPerLb": 0.9,
    "effRate": 0.9642857142857144
  },
  "charcoal_briquettes|insulated_blanket|breezy_5_15mph": {
    "lbs": 14.464285714285715,
    "cost": 13.017857142857144,
    "bags": 0.7232142857142858,
    "costPerLb": 0.9,
    "effRate": 1.205357142857143
  },
  "charcoal_briquettes|insulated_blanket|high_wind_15mph": {
    "lbs": 18.514285714285716,
    "cost": 16.662857142857145,
    "bags": 0.9257142857142858,
    "costPerLb": 0.9,
    "effRate": 1.542857142857143
  },
  "charcoal_briquettes|ceramic_double_wall|calm_0_5mph": {
    "lbs": 9.529411764705882,
    "cost": 8.576470588235294,
    "bags": 0.4764705882352941,
    "costPerLb": 0.9,
    "effRate": 0.7941176470588235
  },
  "charcoal_briquettes|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 11.911764705882353,
    "cost": 10.720588235294118,
    "bags": 0.5955882352941176,
    "costPerLb": 0.9,
    "effRate": 0.9926470588235294
  },
  "charcoal_briquettes|ceramic_double_wall|high_wind_15mph": {
    "lbs": 15.247058823529413,
    "cost": 13.72235294117647,
    "bags": 0.7623529411764707,
    "costPerLb": 0.9,
    "effRate": 1.2705882352941178
  },
  "hardwood_splits|single_wall_steel|calm_0_5mph": {
    "lbs": 42,
    "cost": 37.800000000000004,
    "bags": 2.1,
    "costPerLb": 0.9,
    "effRate": 3.5
  },
  "hardwood_splits|single_wall_steel|breezy_5_15mph": {
    "lbs": 52.5,
    "cost": 47.25,
    "bags": 2.625,
    "costPerLb": 0.9,
    "effRate": 4.375
  },
  "hardwood_splits|single_wall_steel|high_wind_15mph": {
    "lbs": 67.2,
    "cost": 60.480000000000004,
    "bags": 3.3600000000000003,
    "costPerLb": 0.9,
    "effRate": 5.6000000000000005
  },
  "hardwood_splits|insulated_blanket|calm_0_5mph": {
    "lbs": 27.000000000000004,
    "cost": 24.300000000000004,
    "bags": 1.35,
    "costPerLb": 0.9,
    "effRate": 2.2500000000000004
  },
  "hardwood_splits|insulated_blanket|breezy_5_15mph": {
    "lbs": 33.75,
    "cost": 30.375,
    "bags": 1.6875,
    "costPerLb": 0.9,
    "effRate": 2.8125
  },
  "hardwood_splits|insulated_blanket|high_wind_15mph": {
    "lbs": 43.2,
    "cost": 38.88,
    "bags": 2.16,
    "costPerLb": 0.9,
    "effRate": 3.6
  },
  "hardwood_splits|ceramic_double_wall|calm_0_5mph": {
    "lbs": 22.235294117647058,
    "cost": 20.011764705882353,
    "bags": 1.111764705882353,
    "costPerLb": 0.9,
    "effRate": 1.852941176470588
  },
  "hardwood_splits|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 27.794117647058822,
    "cost": 25.014705882352942,
    "bags": 1.3897058823529411,
    "costPerLb": 0.9,
    "effRate": 2.316176470588235
  },
  "hardwood_splits|ceramic_double_wall|high_wind_15mph": {
    "lbs": 35.576470588235296,
    "cost": 32.01882352941177,
    "bags": 1.7788235294117647,
    "costPerLb": 0.9,
    "effRate": 2.9647058823529413
  }
};
const zeroBagGolden = {
  "lbs": 14.399999999999999,
  "cost": 0,
  "bags": 0,
  "costPerLb": 0,
  "effRate": 1.2
};

describe('ambientMultiplier — anchors and midpoints', () => {
  AMBIENT_POINTS.forEach((t, i) => {
    it(`${t}°F`, () => {
      expect(ambientMultiplier(t)).toBeCloseTo(ambientGolden[i], 6);
    });
  });
});

describe('estimate — all fuel × insulation × wind at a fixed state', () => {
  for (const fuel of FUELS)
    for (const ins of INSULATIONS)
      for (const wind of WINDS) {
        const key = `${fuel}|${ins}|${wind}`;
        it(key, () => {
          const r = estimate({ ...baseState, fuel, wind, insulation: ins }, ins);
          const g = estimateGolden[key];
          expect(r.lbs).toBeCloseTo(g.lbs, 6);
          expect(r.cost).toBeCloseTo(g.cost, 6);
          expect(r.bags).toBeCloseTo(g.bags, 6);
          expect(r.costPerLb).toBeCloseTo(g.costPerLb, 6);
          expect(r.effRate).toBeCloseTo(g.effRate, 6);
        });
      }

  it('zero bagWeight → zero cost/bags/costPerLb', () => {
    const r = estimate(
      { fuel: 'wood_pellets', duration: 12, ambientTemp: 70, wind: 'calm_0_5mph', bagCost: 18, bagWeight: 0, insulation: 'single_wall_steel' },
      'single_wall_steel'
    );
    expect(r).toEqual(zeroBagGolden);
  });
});
