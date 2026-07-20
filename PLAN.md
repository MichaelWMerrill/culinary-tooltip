# Claude Code Prompt — Empirical BBQ: Pitmaster Command Center
## Context

This repo is empiricalbbq.com — physics-based BBQ calculators (Astro static
output, pre-compiled Tailwind, deployed on Cloudflare Workers static-assets).
Revenue model: Google SEO → AdSense + Amazon affiliate. Credibility model:
science-backed, versioned data matrices, golden-value regression tests.

Read before writing any code:
- `README.md` (architecture, deploy model, security posture)
- `TODO.md` (roadmap — this plan implements items #4, #5, #11 and more)
- `src/utils/brisketEngine.js`, `stallEngine.js`, `fuelEngine.js`
- `src/utils/__tests__/` and `scripts/gen-golden.mjs`
- One tool page end-to-end (`src/pages/brisket-calculator.astro`) to
  understand the current inline-script wiring pattern
- `src/utils/shareLink.js` (URL-param validation pattern)

## Non-negotiable constraints

1. **Brisket outputs are byte-for-byte frozen.** The existing golden tests
   must pass unmodified through every phase. If a refactor changes any brisket
   number, the refactor is wrong. Never regenerate brisket golden specs.
2. **Existing URLs are frozen.** `/brisket-calculator`, `/stall-predictor`,
   `/fuel-estimator`, `/cook-scheduler` keep their routes, titles, canonicals,
   and FAQPage schema. New pages are additive.
3. **Static output stays static.** `output: 'static'` in `astro.config.mjs`
   is unchanged. No SSR, no server islands. The Worker only serves
   `/api/contact`.
4. **Ad slots must not shift layout.** Any dynamically rendered input panel
   reserves fixed dimensions (CLS ≈ 0). AdSlot.astro placement conventions
   (dev placeholder vs prod `<ins>`) are reused, never reimplemented.
5. **New engine constants must be sourced.** Every constant in a new protein
   block gets a citation comment (USDA yield data, published food-science
   sources, or explicitly marked `// calibration estimate — see METHODOLOGY`).
   Do not invent precise-looking numbers without marking them as estimates.
6. **shareLink pattern is law.** Every new URL param is clamped (numbers) or
   whitelisted (enums) in `shareLink.js`, matching the existing pattern.
7. **Run `npm run test` and `npm run build` after every phase.** A phase is
   not complete until both pass.
8. Follow existing code style: pure engine functions over exported `DATA`
   objects, JSDoc comments, HTML-entity copy strings, Tailwind smoke-* tokens.

## Commit discipline

One commit per phase, message format: `feat(phase-N): <summary>`.
Refactor-only phases: `refactor(phase-N): <summary>`. Do not combine phases.

---

## Phase 1 — Protein registry (foundation, no behavior change)

Create `src/utils/proteinRegistry.js`:

- Export `PROTEINS`, an object keyed by protein id. First entry:
  `beef_brisket`, whose data is **moved** (not copied) from
  `brisketEngine.js` — the brisket engine then imports from the registry.
- Each protein block declares:
  - `meta`: `{ id, name, slug, version }`
  - `yield`: the loss matrices AND an `axes` array describing its inputs.
    Each axis: `{ id, label, type: 'enum'|'slider'|'toggle', options|range,
    copy }`. Brisket's axes: grade (enum), trim (enum), wrap (enum),
    weight (slider 4–30), price (slider).
  - `thermal`: stall-engine constants (thermal diffusivity, stall thresholds
    per cook temp, geometry: `{ shape: 'cylinder'|'slab', beta, exponent,
    weight_bounds }`, finish temp, start temp, `stalls: true|false`).
  - `serving`: `{ lbPerGuestCooked }` (brisket: existing 0.5 constant).
- `brisketEngine.js` and `stallEngine.js` re-export what pages currently
  import so **no page file changes in this phase**.
- Remove the `TODO(roadmap)` comment in `stallEngine.js` — this phase is
  that roadmap item's foundation.

**Acceptance:** all existing tests pass unmodified; `npm run build` output
for the four tool pages is functionally identical.

## Phase 2 — Shared calculator components (refactor, no behavior change)

Extract the inline calculator UI + script from each tool page into shared
components:

- `src/components/calc/YieldCalculator.astro` (from brisket-calculator)
- `src/components/calc/StallPredictor.astro`
- `src/components/calc/FuelEstimator.astro`
- `src/components/calc/CookScheduler.astro`

Rules:
- Components take a `protein` prop (default `beef_brisket`) and render the
  input panel **from the registry's `axes` array** — no hand-coded inputs.
- Preserve the existing grid (`lg:col-span-5` inputs / `lg:col-span-7`
  results), AdSlot positions, and all element behavior.
- Script wiring keys off axis ids from the registry, not hard-coded element
  ids, so UI and engine cannot drift.
- Each existing page becomes a thin wrapper: meta/H1/intro/FAQ schema +
  component. Target ≤ ~80 lines per page file.
- Add one DOM-level smoke test per component (Vitest + happy-dom or
  equivalent already-compatible approach): render, set each axis, assert the
  engine was called with the right parameter names and a result lands in the
  results panel.

**Acceptance:** golden tests pass; new smoke tests pass; visual layout of
all four pages unchanged; Lighthouse CLS on brisket-calculator ≈ 0.

## Phase 3 — Pork shoulder (first new protein, validates the registry)

- Add `pork_shoulder` block: axes = cut (enum: bone_in/boneless), wrap
  (enum: none/paper/foil), weight (slider 4–12), price. Thermal: stalls
  true, shorter plateau than brisket, finish ~200–205°F, cylinder-ish
  geometry. Serving: pulled-pork lb/guest. Source every constant per
  constraint #5.
- New pages (thin wrappers): `/pork-shoulder-calculator`,
  `/pork-shoulder-stall`, extend cook-scheduler with a protein selector.
- Protein selector component: tabs above the calculator; **clicking a tab
  navigates to the sibling protein URL** (real navigation, not client-side
  state) so canonical pages stay indexable and share links stay unambiguous.
- `shareLink.js`: add whitelisted `protein` param.
- Golden tests: extend `scripts/gen-golden.mjs` to emit per-protein spec
  files; generate pork goldens; brisket spec files must show **zero diff**.
- SEO per new page: unique title/description/H1/intro, FAQPage schema (4–6
  pork-specific Q&As), add to `scripts/generate-sitemap.mjs` output and
  `llms.txt`.

**Acceptance:** all tests pass (brisket specs unchanged); sitemap includes
new URLs; share link round-trips protein + all axes.

## Phase 4 — Ribs (forces geometry model) and Turkey (forces no-stall path)

Ribs:
- Axes: cut (spare/st_louis/baby_back), membrane (toggle), wrap method,
  racks (slider) — note unit is racks, servings in bones/person.
- Thermal: `shape: 'slab'` — implement the geometry shape factor in
  `stallEngine.js` so slab thin-dimension heat transfer replaces the
  W^(-1/3) packer scaling; stall nearly absent.
- Page set + 3-2-1 scheduler variant of CookScheduler.

Turkey:
- Axes: preparation (whole/spatchcock), brined (toggle), weight.
- Thermal: `stalls: false` — the curve sampler must handle a monotonic
  climb with no plateau; finish 160°F breast. Add a food-safety note in the
  results copy (165°F instant vs time-at-temp), sourced.
- Page set.

**Acceptance:** curve sampler golden tests cover slab geometry and no-stall
paths; all prior specs unchanged.

## Phase 5 — New calculators (SEO surface)

1. **Reverse party planner** (`/party-planner`): guests + protein →
   recommended raw purchase weight + budget. Pure inversion of yield engine +
   serving constants; protein selector included. (TODO #5, generalized.)
2. **Rest & hold calculator** (`/rest-calculator`): Newtonian cooling model —
   internal temp decay vs time in a faux cambro / oven hold; inputs: protein,
   pull temp, cooler quality (enum), target serve time. New small engine
   `src/utils/restEngine.js` with golden tests and sourced constants.
3. **Blog post stub per new tool** in the existing blog format, interlinking
   tool ↔ post.

**Acceptance:** each tool has engine tests, FAQPage schema, sitemap entry,
share links.

## Phase 6 — Command center homepage + nav

- Homepage: replace the current tool list with a protein × tool matrix grid
  ("Pitmaster Command Center") — every cell links to a canonical page;
  this is the internal-linking lattice. Keep existing hero/AdSense placement
  conventions.
- Nav: group by tool with protein sub-links (or protein-first — inspect
  current Nav.astro responsive pattern and choose the one that degrades
  best on mobile; document the choice in the commit message).
- 404 page: add links into the matrix.

## Phase 7 — Credibility & monetization polish

1. **Methodology page** (`/methodology`): the equations, the sources for
   every constants block (pull the citation comments from the registry —
   consider generating this section from the registry so it can't drift),
   engine versions, and the golden-test/versioning story in plain language.
   Link from every calculator footer. This is the site's most linkable asset.
2. **Engine version badge**: small "Model v{version}" line in each results
   panel, reading from registry meta.
3. **Ranges over false precision**: where the stall/scheduler outputs a
   single time, present a range (e.g., ±5% band) — adjust copy, keep the
   underlying point estimate in the share link.
4. **State-aware affiliate modules** (TODO #11, upgraded): a
   `GearModule.astro` component that maps calculator state → 1–3 relevant
   products (paper wrap selected → peach paper; offset smoker → charcoal
   baskets; ribs → rib racks; turkey → injector). Product data lives in one
   `src/data/gear.js` file (id, name, ASIN/URL, matching rules). Reuse the
   existing Amazon Associates disclosure pattern on every module. Never
   inject affiliate links into results copy — module is a visually distinct
   block.

## Deferred — do NOT implement, just leave TODO.md entries

- Astro 7 upgrade (planned, separately tested — per README)
- Live Cook Mode PWA (keep online-first when built; offline caching
  suppresses ad impressions)
- Community calibration loop
- Email capture / ESP integration
- CSP enforce-mode flip (manual, after production report review)
- Turnstile production site key (manual, dashboard)
- GSC sitemap resubmission (manual, post-deploy)

Update `TODO.md` at the end: check off completed items, add the deferred
list above with the notes given.

---

## Final verification (run after Phase 7)

1. `npm run test` — all specs pass; brisket/stall/fuel golden files have
   zero diff vs `main`.
2. `npm run build` — succeeds; `dist/sitemap.xml` contains every new page.
3. Grep check: no page file exceeds ~120 lines; no engine file imports from
   a page or component; every registry constant has a source comment or
   estimate marker.
4. Manual spot-list for the human: URLs to click, share-link to round-trip,
   and the deferred manual tasks (Turnstile key, GSC, CSP).
