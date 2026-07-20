// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const ribs = PROTEINS.pork_ribs;
const stallStates = [
  {
    "cut": "spare",
    "racks": 3,
    "pitTemp": "250",
    "pit": "offset_smoker",
    "wrap": "peach_butcher_paper",
    "wrapTemp": 160,
    "climate": "moderate"
  },
  {
    "cut": "baby_back",
    "racks": 2,
    "pitTemp": "225",
    "pit": "pellet_cooker",
    "wrap": "none",
    "wrapTemp": 160,
    "climate": "arid"
  },
  {
    "cut": "st_louis",
    "racks": 4,
    "pitTemp": "275",
    "pit": "ceramic_kamado",
    "wrap": "aluminum_foil",
    "wrapTemp": 165,
    "climate": "humid"
  }
];
const stallGolden = [
  {
    "t1": 4.244223363286265,
    "stallDuration": 0.0758620224476581,
    "t3": 1.400908185615583,
    "totalTime": 5.7209935713495055,
    "finishTemp": 203
  },
  {
    "t1": 3.5499659377341777,
    "stallDuration": 0.12465233881163082,
    "t3": 2.0630655695754694,
    "totalTime": 5.7376838461212785,
    "finishTemp": 203
  },
  {
    "t1": 4.411786372007365,
    "stallDuration": 0,
    "t3": 0.7198156600030251,
    "totalTime": 5.13160203201039,
    "finishTemp": 203
  }
];

describe('pork_ribs slab geometry — phase durations to 6 decimals', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i}: ${s.cut} / ${s.wrap}`, () => {
      const m = computeModel(s, ribs);
      expect(m.t1).toBeCloseTo(stallGolden[i].t1, 6);
      expect(m.stallDuration).toBeCloseTo(stallGolden[i].stallDuration, 6);
      expect(m.t3).toBeCloseTo(stallGolden[i].t3, 6);
      expect(m.totalTime).toBeCloseTo(stallGolden[i].totalTime, 6);
    });
  });
});

describe('pork_ribs slab geometry — rack count does NOT change cook time', () => {
  it('same cut/pit, 2 racks vs 8 racks → identical total time', () => {
    const base = { cut: 'spare', pitTemp: '250', pit: 'offset_smoker', wrap: 'none', wrapTemp: 160, climate: 'moderate' };
    const t2 = computeModel({ ...base, racks: 2 }, ribs).totalTime;
    const t8 = computeModel({ ...base, racks: 8 }, ribs).totalTime;
    expect(t8).toBeCloseTo(t2, 10);
  });
  it('thinner cuts cook faster: baby_back < st_louis < spare', () => {
    const base = { pitTemp: '250', pit: 'offset_smoker', wrap: 'none', wrapTemp: 160, climate: 'moderate', racks: 3 };
    const bb = computeModel({ ...base, cut: 'baby_back' }, ribs).totalTime;
    const sl = computeModel({ ...base, cut: 'st_louis' }, ribs).totalTime;
    const sp = computeModel({ ...base, cut: 'spare' }, ribs).totalTime;
    expect(bb).toBeLessThan(sl);
    expect(sl).toBeLessThan(sp);
  });
});

describe('pork_ribs buildPath — monotonic, ends at finish temp', () => {
  stallStates.forEach((s, i) => {
    it(`state ${i} path`, () => {
      const pts = buildPath(computeModel(s, ribs));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      expect(pts[pts.length - 1].temp).toBeCloseTo(stallGolden[i].finishTemp, 6);
    });
  });
});
