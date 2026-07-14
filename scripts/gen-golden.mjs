/*
 * One-off generator: executes the current engines and writes golden-value
 * regression specs into src/utils/__tests__/. Run once (or after an INTENTIONAL
 * engine change) with `node scripts/gen-golden.mjs`, then commit the specs.
 * The committed specs contain hard-coded expected values (no engine re-derivation),
 * so any accidental change to engine constants fails the tests.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { calcBrisket } from '../src/utils/brisketEngine.js';
import { computeModel, buildPath, FINISH_TEMP } from '../src/utils/stallEngine.js';
import { ambientMultiplier, estimate } from '../src/utils/fuelEngine.js';

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

console.log('Wrote 3 spec files to src/utils/__tests__/');
console.log('brisket combos:', Object.keys(brisketGolden).length);
console.log('stall states:', stallGolden.length);
console.log('fuel estimate combos:', Object.keys(estimateGolden).length, '| ambient points:', ambientGolden.length);
