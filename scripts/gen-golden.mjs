/*
 * One-off generator: executes the current engines and writes golden-value
 * regression specs into src/utils/__tests__/. Run once (or after an INTENTIONAL
 * engine change) with `node scripts/gen-golden.mjs`, then commit the specs.
 * The committed specs contain hard-coded expected values (no engine re-derivation),
 * so any accidental change to engine constants fails the tests.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { calcBrisket, calcYield } from '../src/utils/brisketEngine.js';
import { computeModel, buildPath, FINISH_TEMP } from '../src/utils/stallEngine.js';
import { ambientMultiplier, estimate } from '../src/utils/fuelEngine.js';
import { restCurve } from '../src/utils/restEngine.js';
import { PROTEINS } from '../src/utils/proteinRegistry.js';

mkdirSync('src/utils/__tests__', { recursive: true });
const J = (v) => JSON.stringify(v, null, 2);

/* ---------------- brisket ---------------- */
const GRADES = ['PRIME', 'CHOICE', 'SELECT'];
const TRIMS = ['commercial', 'competition'];
const WRAPS = ['naked', 'paper', 'foil'];
const brisketGolden = {};
for (const grade of GRADES)
  for (const trim of TRIMS)
    for (const wrap of WRAPS)
      brisketGolden[`${grade}|${trim}|${wrap}`] = calcBrisket({ weight: 12.5, price: 4.29, grade, trim, wrap });
brisketGolden['zeroWeight'] = calcBrisket({ weight: 0, price: 4.29, grade: 'CHOICE', trim: 'commercial', wrap: 'paper' });
brisketGolden['zeroPrice'] = calcBrisket({ weight: 12.5, price: 0, grade: 'CHOICE', trim: 'commercial', wrap: 'paper' });

writeFileSync(
  'src/utils/__tests__/brisketEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcBrisket } from '../brisketEngine.js';

const GRADES = ${J(GRADES)};
const TRIMS = ${J(TRIMS)};
const WRAPS = ${J(WRAPS)};

// Golden outputs captured from the engine at 12.5 lb / $4.29.
const golden = ${J(brisketGolden)};

describe('calcBrisket — all grade × trim × wrap at 12.5 lb / $4.29', () => {
  for (const grade of GRADES)
    for (const trim of TRIMS)
      for (const wrap of WRAPS) {
        const key = \`\${grade}|\${trim}|\${wrap}\`;
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
`
);

/* ---------------- stall ---------------- */
const stallStates = [
  { weight: 12, pitTemp: '225', pit: 'offset_smoker', wrap: 'peach_butcher_paper', wrapTemp: 160, climate: 'moderate' },
  { weight: 10, pitTemp: '250', pit: 'pellet_cooker', wrap: 'none', wrapTemp: 160, climate: 'arid' },
  { weight: 16, pitTemp: '275', pit: 'ceramic_kamado', wrap: 'aluminum_foil', wrapTemp: 165, climate: 'humid' },
  { weight: 8, pitTemp: '225', pit: 'charcoal_kettle', wrap: 'peach_butcher_paper', wrapTemp: 155, climate: 'moderate' },
  { weight: 14, pitTemp: '250', pit: 'offset_smoker', wrap: 'aluminum_foil', wrapTemp: 160, climate: 'arid' },
  { weight: 18, pitTemp: '275', pit: 'pellet_cooker', wrap: 'none', wrapTemp: 160, climate: 'humid' },
];
const stallGolden = stallStates.map((s) => {
  const m = computeModel(s);
  return { t1: m.t1, stallDuration: m.stallDuration, t3: m.t3, totalTime: m.totalTime };
});

writeFileSync(
  'src/utils/__tests__/stallEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { computeModel, buildPath, FINISH_TEMP } from '../stallEngine.js';

// 6 states covering every pit type, wrap type, and climate.
const states = ${J(stallStates)};
const golden = ${J(stallGolden)};

describe('computeModel — phase durations to 6 decimals', () => {
  states.forEach((s, i) => {
    it(\`state \${i}: \${s.pit} / \${s.wrap} / \${s.climate}\`, () => {
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
    it(\`state \${i} path\`, () => {
      const pts = buildPath(computeModel(s));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) {
        expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      }
      expect(pts[pts.length - 1].temp).toBeCloseTo(FINISH_TEMP, 6);
    });
  });
});
`
);

/* ---------------- fuel ---------------- */
const AMBIENT_POINTS = [20, 30, 40, 55, 70, 80, 90, 100, 110, 120, 125];
const ambientGolden = AMBIENT_POINTS.map((t) => ambientMultiplier(t));

const FUELS = ['wood_pellets', 'charcoal_briquettes', 'hardwood_splits'];
const INSULATIONS = ['single_wall_steel', 'insulated_blanket', 'ceramic_double_wall'];
const WINDS = ['calm_0_5mph', 'breezy_5_15mph', 'high_wind_15mph'];
const baseState = { duration: 12, ambientTemp: 70, bagCost: 18, bagWeight: 20 };
const estimateGolden = {};
for (const fuel of FUELS)
  for (const ins of INSULATIONS)
    for (const wind of WINDS)
      estimateGolden[`${fuel}|${ins}|${wind}`] = estimate({ ...baseState, fuel, wind, insulation: ins }, ins);
const zeroBag = estimate(
  { fuel: 'wood_pellets', duration: 12, ambientTemp: 70, wind: 'calm_0_5mph', bagCost: 18, bagWeight: 0, insulation: 'single_wall_steel' },
  'single_wall_steel'
);

writeFileSync(
  'src/utils/__tests__/fuelEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { ambientMultiplier, estimate } from '../fuelEngine.js';

const AMBIENT_POINTS = ${J(AMBIENT_POINTS)};
const ambientGolden = ${J(ambientGolden)};

const FUELS = ${J(FUELS)};
const INSULATIONS = ${J(INSULATIONS)};
const WINDS = ${J(WINDS)};
const baseState = ${J(baseState)};
const estimateGolden = ${J(estimateGolden)};
const zeroBagGolden = ${J(zeroBag)};

describe('ambientMultiplier — anchors and midpoints', () => {
  AMBIENT_POINTS.forEach((t, i) => {
    it(\`\${t}°F\`, () => {
      expect(ambientMultiplier(t)).toBeCloseTo(ambientGolden[i], 6);
    });
  });
});

describe('estimate — all fuel × insulation × wind at a fixed state', () => {
  for (const fuel of FUELS)
    for (const ins of INSULATIONS)
      for (const wind of WINDS) {
        const key = \`\${fuel}|\${ins}|\${wind}\`;
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
`
);

/* ---------------- pork shoulder (per-protein yield + stall) ---------------- */
const pork = PROTEINS.pork_shoulder;
const PORK_CUTS = ['bone_in', 'boneless'];
const PORK_WRAPS = ['naked', 'paper', 'foil'];
const porkYieldGolden = {};
for (const cut of PORK_CUTS)
  for (const wrap of PORK_WRAPS)
    porkYieldGolden[`${cut}|${wrap}`] = calcYield(pork, { weight: 8, price: 1.99, cut, wrap });
porkYieldGolden['zeroWeight'] = calcYield(pork, { weight: 0, price: 1.99, cut: 'bone_in', wrap: 'paper' });
porkYieldGolden['zeroPrice'] = calcYield(pork, { weight: 8, price: 0, cut: 'boneless', wrap: 'paper' });

const porkStallStates = [
  { weight: 8, pitTemp: '250', pit: 'offset_smoker', wrap: 'peach_butcher_paper', wrapTemp: 160, climate: 'moderate' },
  { weight: 6, pitTemp: '225', pit: 'pellet_cooker', wrap: 'none', wrapTemp: 160, climate: 'arid' },
  { weight: 10, pitTemp: '275', pit: 'ceramic_kamado', wrap: 'aluminum_foil', wrapTemp: 165, climate: 'humid' },
  { weight: 12, pitTemp: '250', pit: 'charcoal_kettle', wrap: 'peach_butcher_paper', wrapTemp: 155, climate: 'moderate' },
];
const porkStallGolden = porkStallStates.map((s) => {
  const m = computeModel(s, pork);
  return { t1: m.t1, stallDuration: m.stallDuration, t3: m.t3, totalTime: m.totalTime, finishTemp: m.finishTemp };
});

writeFileSync(
  'src/utils/__tests__/porkShoulderEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcYield } from '../brisketEngine.js';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const pork = PROTEINS.pork_shoulder;
const CUTS = ${J(PORK_CUTS)};
const WRAPS = ${J(PORK_WRAPS)};

// Yield golden captured at 8 lb / $1.99.
const yieldGolden = ${J(porkYieldGolden)};

describe('pork_shoulder yield — all cut × wrap at 8 lb / $1.99', () => {
  for (const cut of CUTS)
    for (const wrap of WRAPS) {
      const key = \`\${cut}|\${wrap}\`;
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

const stallStates = ${J(porkStallStates)};
const stallGolden = ${J(porkStallGolden)};

describe('pork_shoulder stall — phase durations to 6 decimals', () => {
  stallStates.forEach((s, i) => {
    it(\`state \${i}: \${s.pit} / \${s.wrap} / \${s.climate}\`, () => {
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
    it(\`state \${i} path\`, () => {
      const pts = buildPath(computeModel(s, pork));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) {
        expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      }
      expect(pts[pts.length - 1].temp).toBeCloseTo(stallGolden[i].finishTemp, 6);
    });
  });
});
`
);

/* ---------------- ribs (slab geometry, near-zero stall) ---------------- */
const ribs = PROTEINS.pork_ribs;
const ribsStallStates = [
  { cut: 'spare', racks: 3, pitTemp: '250', pit: 'offset_smoker', wrap: 'peach_butcher_paper', wrapTemp: 160, climate: 'moderate' },
  { cut: 'baby_back', racks: 2, pitTemp: '225', pit: 'pellet_cooker', wrap: 'none', wrapTemp: 160, climate: 'arid' },
  { cut: 'st_louis', racks: 4, pitTemp: '275', pit: 'ceramic_kamado', wrap: 'aluminum_foil', wrapTemp: 165, climate: 'humid' },
];
const ribsStallGolden = ribsStallStates.map((s) => {
  const m = computeModel(s, ribs);
  return { t1: m.t1, stallDuration: m.stallDuration, t3: m.t3, totalTime: m.totalTime, finishTemp: m.finishTemp };
});

writeFileSync(
  'src/utils/__tests__/ribsEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const ribs = PROTEINS.pork_ribs;
const stallStates = ${J(ribsStallStates)};
const stallGolden = ${J(ribsStallGolden)};

describe('pork_ribs slab geometry — phase durations to 6 decimals', () => {
  stallStates.forEach((s, i) => {
    it(\`state \${i}: \${s.cut} / \${s.wrap}\`, () => {
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
    it(\`state \${i} path\`, () => {
      const pts = buildPath(computeModel(s, ribs));
      expect(pts.length).toBeGreaterThan(0);
      for (let k = 1; k < pts.length; k++) expect(pts[k].t).toBeGreaterThanOrEqual(pts[k - 1].t);
      expect(pts[pts.length - 1].temp).toBeCloseTo(stallGolden[i].finishTemp, 6);
    });
  });
});
`
);

/* ---------------- turkey (no-stall yield + monotonic climb) ---------------- */
const turkey = PROTEINS.turkey;
const TURKEY_PREPS = ['whole', 'spatchcock'];
const TURKEY_BRINE = ['no', 'yes'];
const turkeyYieldGolden = {};
for (const preparation of TURKEY_PREPS)
  for (const brined of TURKEY_BRINE)
    turkeyYieldGolden[`${preparation}|${brined}`] = calcYield(turkey, { weight: 14, price: 1.49, preparation, brined });

const turkeyStallStates = [
  { preparation: 'whole', weight: 14, pitTemp: '275', pit: 'offset_smoker', wrap: 'none', wrapTemp: 160, climate: 'moderate' },
  { preparation: 'spatchcock', weight: 12, pitTemp: '250', pit: 'pellet_cooker', wrap: 'none', wrapTemp: 160, climate: 'moderate' },
  { preparation: 'whole', weight: 20, pitTemp: '225', pit: 'ceramic_kamado', wrap: 'none', wrapTemp: 160, climate: 'humid' },
];
const turkeyStallGolden = turkeyStallStates.map((s) => {
  const m = computeModel(s, turkey);
  return { t1: m.t1, stallDuration: m.stallDuration, t3: m.t3, totalTime: m.totalTime, noStall: m.noStall, finishTemp: m.finishTemp };
});

writeFileSync(
  'src/utils/__tests__/turkeyEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { calcYield } from '../brisketEngine.js';
import { computeModel, buildPath } from '../stallEngine.js';
import { PROTEINS } from '../proteinRegistry.js';

const turkey = PROTEINS.turkey;
const PREPS = ${J(TURKEY_PREPS)};
const BRINE = ${J(TURKEY_BRINE)};
const yieldGolden = ${J(turkeyYieldGolden)};

describe('turkey yield — preparation × brined at 14 lb / $1.49', () => {
  for (const preparation of PREPS)
    for (const brined of BRINE) {
      const key = \`\${preparation}|\${brined}\`;
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

const stallStates = ${J(turkeyStallStates)};
const stallGolden = ${J(turkeyStallGolden)};

describe('turkey no-stall path — monotonic climb, no plateau', () => {
  stallStates.forEach((s, i) => {
    it(\`state \${i}: \${s.preparation} / \${s.weight}lb / \${s.pitTemp}\`, () => {
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
    it(\`state \${i} path\`, () => {
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
`
);

/* ---------------- rest & hold (Newtonian cooling) ---------------- */
const REST_HOLDS = ['oven_hold', 'faux_cambro', 'bare_cooler', 'counter'];
const restStates = REST_HOLDS.map((hold) => ({ pullTemp: 203, hold, holdHours: 2 }));
const restGolden = restStates.map((s) => {
  const r = restCurve(s);
  return { safeHours: r.safeHours, tempAtServe: r.tempAtServe, safeAtServe: r.safeAtServe };
});

writeFileSync(
  'src/utils/__tests__/restEngine.spec.js',
  `// AUTO-GENERATED golden regression test (scripts/gen-golden.mjs). Do not hand-edit values.
import { describe, it, expect } from 'vitest';
import { restCurve, tempAfter, SAFE_TEMP } from '../restEngine.js';

const states = ${J(restStates)};
const golden = ${J(restGolden)};

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
`
);

console.log('Wrote 7 spec files to src/utils/__tests__/');
console.log('brisket combos:', Object.keys(brisketGolden).length);
console.log('stall states:', stallGolden.length);
console.log('fuel estimate combos:', Object.keys(estimateGolden).length, '| ambient points:', ambientGolden.length);
console.log('pork yield combos:', Object.keys(porkYieldGolden).length, '| pork stall states:', porkStallGolden.length);
