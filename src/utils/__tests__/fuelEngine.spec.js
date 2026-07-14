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
    "lbs": 31.999999999999996,
    "cost": 28.799999999999997,
    "bags": 1.5999999999999999,
    "costPerLb": 0.9,
    "effRate": 2.6666666666666665
  },
  "wood_pellets|single_wall_steel|breezy_5_15mph": {
    "lbs": 40,
    "cost": 36,
    "bags": 2,
    "costPerLb": 0.9,
    "effRate": 3.3333333333333335
  },
  "wood_pellets|single_wall_steel|high_wind_15mph": {
    "lbs": 51.199999999999996,
    "cost": 46.08,
    "bags": 2.5599999999999996,
    "costPerLb": 0.9,
    "effRate": 4.266666666666667
  },
  "wood_pellets|insulated_blanket|calm_0_5mph": {
    "lbs": 20.57142857142857,
    "cost": 18.514285714285712,
    "bags": 1.0285714285714285,
    "costPerLb": 0.9,
    "effRate": 1.7142857142857142
  },
  "wood_pellets|insulated_blanket|breezy_5_15mph": {
    "lbs": 25.714285714285715,
    "cost": 23.142857142857146,
    "bags": 1.2857142857142858,
    "costPerLb": 0.9,
    "effRate": 2.142857142857143
  },
  "wood_pellets|insulated_blanket|high_wind_15mph": {
    "lbs": 32.91428571428572,
    "cost": 29.622857142857146,
    "bags": 1.645714285714286,
    "costPerLb": 0.9,
    "effRate": 2.7428571428571433
  },
  "wood_pellets|ceramic_double_wall|calm_0_5mph": {
    "lbs": 16.941176470588236,
    "cost": 15.247058823529413,
    "bags": 0.8470588235294118,
    "costPerLb": 0.9,
    "effRate": 1.411764705882353
  },
  "wood_pellets|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 21.176470588235293,
    "cost": 19.058823529411764,
    "bags": 1.0588235294117647,
    "costPerLb": 0.9,
    "effRate": 1.7647058823529411
  },
  "wood_pellets|ceramic_double_wall|high_wind_15mph": {
    "lbs": 27.105882352941176,
    "cost": 24.395294117647058,
    "bags": 1.3552941176470588,
    "costPerLb": 0.9,
    "effRate": 2.2588235294117647
  },
  "charcoal_briquettes|single_wall_steel|calm_0_5mph": {
    "lbs": 40,
    "cost": 36,
    "bags": 2,
    "costPerLb": 0.9,
    "effRate": 3.3333333333333335
  },
  "charcoal_briquettes|single_wall_steel|breezy_5_15mph": {
    "lbs": 50,
    "cost": 45,
    "bags": 2.5,
    "costPerLb": 0.9,
    "effRate": 4.166666666666667
  },
  "charcoal_briquettes|single_wall_steel|high_wind_15mph": {
    "lbs": 64,
    "cost": 57.6,
    "bags": 3.2,
    "costPerLb": 0.9,
    "effRate": 5.333333333333333
  },
  "charcoal_briquettes|insulated_blanket|calm_0_5mph": {
    "lbs": 25.714285714285715,
    "cost": 23.142857142857146,
    "bags": 1.2857142857142858,
    "costPerLb": 0.9,
    "effRate": 2.142857142857143
  },
  "charcoal_briquettes|insulated_blanket|breezy_5_15mph": {
    "lbs": 32.142857142857146,
    "cost": 28.92857142857143,
    "bags": 1.6071428571428572,
    "costPerLb": 0.9,
    "effRate": 2.678571428571429
  },
  "charcoal_briquettes|insulated_blanket|high_wind_15mph": {
    "lbs": 41.142857142857146,
    "cost": 37.02857142857143,
    "bags": 2.0571428571428574,
    "costPerLb": 0.9,
    "effRate": 3.428571428571429
  },
  "charcoal_briquettes|ceramic_double_wall|calm_0_5mph": {
    "lbs": 21.176470588235293,
    "cost": 19.058823529411764,
    "bags": 1.0588235294117647,
    "costPerLb": 0.9,
    "effRate": 1.7647058823529411
  },
  "charcoal_briquettes|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 26.47058823529412,
    "cost": 23.823529411764707,
    "bags": 1.323529411764706,
    "costPerLb": 0.9,
    "effRate": 2.2058823529411766
  },
  "charcoal_briquettes|ceramic_double_wall|high_wind_15mph": {
    "lbs": 33.88235294117647,
    "cost": 30.494117647058825,
    "bags": 1.6941176470588235,
    "costPerLb": 0.9,
    "effRate": 2.823529411764706
  },
  "hardwood_splits|single_wall_steel|calm_0_5mph": {
    "lbs": 93.33333333333333,
    "cost": 84,
    "bags": 4.666666666666666,
    "costPerLb": 0.9,
    "effRate": 7.777777777777778
  },
  "hardwood_splits|single_wall_steel|breezy_5_15mph": {
    "lbs": 116.66666666666666,
    "cost": 105,
    "bags": 5.833333333333333,
    "costPerLb": 0.9,
    "effRate": 9.722222222222221
  },
  "hardwood_splits|single_wall_steel|high_wind_15mph": {
    "lbs": 149.33333333333334,
    "cost": 134.4,
    "bags": 7.466666666666667,
    "costPerLb": 0.9,
    "effRate": 12.444444444444445
  },
  "hardwood_splits|insulated_blanket|calm_0_5mph": {
    "lbs": 60.00000000000001,
    "cost": 54.00000000000001,
    "bags": 3.0000000000000004,
    "costPerLb": 0.9,
    "effRate": 5.000000000000001
  },
  "hardwood_splits|insulated_blanket|breezy_5_15mph": {
    "lbs": 75,
    "cost": 67.5,
    "bags": 3.75,
    "costPerLb": 0.9,
    "effRate": 6.25
  },
  "hardwood_splits|insulated_blanket|high_wind_15mph": {
    "lbs": 96.00000000000001,
    "cost": 86.40000000000002,
    "bags": 4.800000000000001,
    "costPerLb": 0.9,
    "effRate": 8.000000000000002
  },
  "hardwood_splits|ceramic_double_wall|calm_0_5mph": {
    "lbs": 49.411764705882355,
    "cost": 44.47058823529412,
    "bags": 2.4705882352941178,
    "costPerLb": 0.9,
    "effRate": 4.11764705882353
  },
  "hardwood_splits|ceramic_double_wall|breezy_5_15mph": {
    "lbs": 61.76470588235294,
    "cost": 55.58823529411765,
    "bags": 3.088235294117647,
    "costPerLb": 0.9,
    "effRate": 5.147058823529412
  },
  "hardwood_splits|ceramic_double_wall|high_wind_15mph": {
    "lbs": 79.05882352941177,
    "cost": 71.15294117647059,
    "bags": 3.9529411764705884,
    "costPerLb": 0.9,
    "effRate": 6.588235294117648
  }
};
const zeroBagGolden = {
  "lbs": 31.999999999999996,
  "cost": 0,
  "bags": 0,
  "costPerLb": 0,
  "effRate": 2.6666666666666665
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
