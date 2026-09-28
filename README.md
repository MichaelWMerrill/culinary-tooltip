# Empirical BBQ

Physics-flavored pitmaster calculators for [empiricalbbq.com](https://empiricalbbq.com) —
yield & cost, the thermodynamic stall, cook scheduling, smoker fuel, and rest/hold — across
four proteins (beef brisket, pork shoulder, pork ribs, turkey), plus a party planner, a
brisket size calculator, a methodology page, a science-focused blog, and weight-scaled
recipes whose cook times come from the same models.

Built with [Astro](https://astro.build) (static output) and pre-compiled Tailwind CSS,
deployed as static assets on Cloudflare's **Workers static-assets** model (see
[Contact endpoint](#contact-endpoint) for why a Worker is in the mix at all).

## Development

```bash
npm install
npm run dev      # local dev server (ad slots render as labeled placeholders)
npm run build    # static build to dist/ (also generates dist/sitemap.xml)
npm run preview  # preview the production build
npm run test     # run the engine regression tests (Vitest)
```

`npm run build` runs `astro build` and then `scripts/generate-sitemap.mjs`, which
writes `dist/sitemap.xml` using the site's canonical URL forms — all
extensionless (homepage `/`, tool/util pages `/<name>`, blog index `/blog`,
posts `/blog/<slug>`, recipes `/recipes/<slug>`).

`<lastmod>` reflects when a page's **source** last changed, never the build
date: blog posts and recipes use `updatedDate ?? pubDate` from their frontmatter, other
pages use the last commit date of their `.astro` route. A URL whose date can't
be resolved is emitted without `<lastmod>` rather than with a guessed one —
stamping every URL with "today" on every deploy trains Google to ignore the
field. This needs real git history, so **CI must not use a shallow clone**
(`git clone --depth 1`); the build warns when it detects one.

## Project structure

```
src/
  layouts/
    Layout.astro           Shared <head> (SEO + GA + AdSense), nav, sticky banner, consent
    BlogPostLayout.astro   Blog-post chrome
    RecipeLayout.astro     Recipe page: scaled ingredients, steps with "why", Recipe JSON-LD
  components/
    Nav.astro              Responsive navigation header
    AdSlot.astro           Ad placement: dev mockup vs. production AdSense <ins>
    calc/                  Calculator UI components + their client controllers
                           (StallPredictor, YieldCalculator, FuelEstimator,
                           CookScheduler, RestCalculator, PartyPlanner,
                           ProteinSelector, GearModule, FaqSection,
                           CookLogCapture — see "Cook log capture UI" below)
  pages/                   One .astro route per page (built as *.html, served extensionless):
                           per-protein yield & stall pages, cook-scheduler,
                           fuel-estimator, rest-calculator, party-planner,
                           brisket-size-calculator, methodology, about, contact,
                           privacy, the blog + posts, recipes/[...slug], and rss.xml
  utils/
    proteinRegistry.js     Single source of truth for per-protein data: yield
                           matrices, thermal/stall constants, serving, input axes
    brisketEngine.js       Yield/trim/shrinkage + cost calc (reads the registry)
    stallEngine.js         Mass-scaling, pit, wrap & climate stall model + curve sampler
    fuelEngine.js          Fuel model: base burn rate × ambient/wind/insulation factors
    restEngine.js          Newtonian-cooling rest/hold model
    toolMatrix.js          Homepage protein × tool matrix + tool metadata
    version.js             Site + stall-engine version strings (single source of truth)
    shareLink.js           Validated URL-param (shareable-link) helpers
    analytics.js           Shared PitmasterAnalytics telemetry object
    author.js              Site author identity (name, role, Person schema) —
                           single source for bylines, /about, and JSON-LD
    recipeModel.js         Recipe glue: cook time via cookDuration(), yield from the
                           registry, ingredient grams from ratios × raw weight
    recipeSources.js       Recipe citation rules checked at build time
    relatedContent.js      Cross-links between calculators, blog posts, and recipes
    inlineLinks.js         Restricted [text](/path) link parser for recipe frontmatter
    cookLogClient.js       POST/PATCH client for the cook-log Worker
    cookLogConsent.js      Cook-log opt-in state and anon_client_id
  content/blog/            Markdown blog posts
  content/recipes/         Markdown recipes (frontmatter-heavy; see "Recipes" below)
  content.config.ts        Collection schemas for blog + recipes
  data/gear.js             Affiliate product catalog + state → product matching rules
.claude/agents/            Claude Code subagents (science-editor — see "Recipes" below)
server/contactHandler.ts   Contact-form handler (called by worker.ts)
workers/cook-log-service/  Isolated Worker for anonymized cook logging (own
                           wrangler.jsonc + D1 binding; see "Cook log data
                           layer" below) — not part of the static site build
scripts/                   Build/generator scripts: sitemap, OG images, blog heroes, icons,
                           golden specs, ads.txt check, cook-log-report (ad hoc D1 aggregation)
public/                    Static assets copied verbatim (favicons, recipe images, ads.txt, llms.txt, _headers,
                           sw.js / sw-cache-utils.js / sw-queue-utils.js — see "PWA shell" below)
```

The site builds to `dist/`, which is what Cloudflare serves (see `wrangler.jsonc`). AdSense
slots render as clean dashed placeholders in development and as live
`<ins class="adsbygoogle">` units in production (`import.meta.env.PROD`).

## Contact endpoint

The contact form (`src/pages/contact.astro`) POSTs JSON to `/api/contact`. The request
handler lives in `server/contactHandler.ts`, wired for the live deployment model:

- **Workers static-assets (current deploy):** `worker.ts` is the Worker entry (`main`
  in `wrangler.jsonc`). Static files in `dist/` are served by the
  `ASSETS` binding; the Worker only runs for `/api/contact` and defers everything else
  (including `404.html`) to the assets.

The handler itself is deployment-agnostic: if the project ever moves back to Cloudflare
Pages, add a thin `functions/api/contact.ts` adapter
(`export const onRequestPost = (ctx) => handleContact(ctx.request, ctx.env)`) — no change to
`server/contactHandler.ts` required.

The handler validates the message, verifies a Cloudflare Turnstile token server-side, and
forwards the submission to `contact@empiricalbbq.com` via **Resend** (if `RESEND_API_KEY`
is set) or **MailChannels**.

**Environment variables** (set in the deploy environment — Cloudflare dashboard →
your project → Settings → Variables and Secrets):

| Variable | Required | Purpose |
| --- | --- | --- |
| `TURNSTILE_SECRET_KEY` | **Yes** (runtime) | Cloudflare Turnstile *secret* key, used for server-side verification. |
| `TURNSTILE_SITE_KEY` | Optional (build time) | Public Turnstile *site* key for the widget. Overrides the committed production default; the build fails if it resolves to a Cloudflare test key. |
| `RESEND_API_KEY` | Optional | If present, email is sent via Resend instead of MailChannels. |

**Turnstile site key:** the widget's *site* key (public — it ships in the page HTML) lives in
`src/pages/contact.astro` as `TURNSTILE_SITE_KEY`, which defaults to the committed production
key and is overridable at build time via the `TURNSTILE_SITE_KEY` env var (see table above). A
build-time guard throws if the resolved value is one of Cloudflare's documented **test** keys
(e.g. the "always passes" `1x00000000000000000000AA`), so a test key — which issues tokens that
always pass and would silently disable bot protection — can never ship to production. Create the
widget and both keys at Cloudflare dashboard → **Turnstile**.

> **Deployment note:** this repo deploys on the **Workers static-assets** model (config in
> `wrangler.jsonc`), and the `/api/contact` route is wired via `worker.ts` (`main`) — no
> action needed to serve it.
> `output: 'static'` in `astro.config.mjs` is unchanged; `npm run build` still just produces
> `dist/`, and the Worker is bundled by `wrangler` at deploy time. (The Pages `functions/`
> adapter was removed — see above for how to re-add it if the deploy model ever changes.)
>
> MailChannels now requires account setup (their free Workers integration was retired), so
> **Resend is the recommended path** — set `RESEND_API_KEY` and verify your sending domain.

## PWA shell (Service Worker)

`public/sw.js`, registered from `src/layouts/Layout.astro` after `window` `load` (deferred —
never competes with initial-render resources; a registration failure is swallowed, since this
is a pure enhancement, not required for the site to work).

Deliberately conservative, because this is a content site with blog posts shipping regularly
and revenue riding on AdSense/analytics never being interfered with:

- **Network-only, no interception** for HTML navigations, `/api/contact`, `/api/cook-logs*`,
  and unhashed `public/` files (favicons etc.) — the fetch handler ignores them entirely, so
  they always hit the network exactly as if no Service Worker existed.
- **Cache-first** only for `/_astro/*` — Astro's content-hashed build output (JS/CSS). Their
  filenames change whenever their content does, so caching them aggressively can never serve
  stale code.
- **Versioned cache** (`CACHE_VERSION` in `sw.js` itself — not in the `importScripts()`-loaded
  files, since browsers only detect a "new" Service Worker by byte-diffing the *registered*
  script). `activate` deletes any cache that doesn't match the current version.

The pure matching/versioning logic lives in `public/sw-cache-utils.js`, a classic script
loaded via `importScripts()` so the exact same code the Service Worker runs is also what
`src/utils/__tests__/swCacheUtils.spec.js` exercises (side-effect import + `globalThis`) —
not a re-implementation that could drift.

## Cook log data layer

`workers/cook-log-service/` is a second, fully isolated Cloudflare Worker — separate deploy,
separate `wrangler.jsonc`, separate D1 database, no shared code or routes with
`pitmaster-command-center`. It collects anonymized, opt-in cook data (weight, timeline,
predicted vs. actual cook time) from PWA users. **This is data-layer infrastructure only** —
it does not feed any model recalibration (a manual, human-reviewed step; see the aggregation
script below). The on-device capture UI that calls it is covered separately below.

**Endpoints** (no read/GET endpoint — this is a write-only API; aggregation runs separately):

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/cook-logs` | `POST` | Create a session at cook start. Rejects (400) a missing `consented_at`, an unrecognized enum value, or a `weight_lb` outside the protein's range. Rate limited to `MAX_WRITES_PER_DAY` (20) writes/day per `anon_client_id`. |
| `/api/cook-logs/:id` | `PATCH` | Update a session's progress fields (wrap, stall markers, finish). 404s if `id` doesn't exist or doesn't belong to the requesting `anon_client_id`. |

**Data model**: `cook_sessions` in D1 (see `workers/cook-log-service/migrations/0001_create_cook_sessions.sql`).
No name, email, or precise location is ever collected — `anon_client_id` is a client-generated
`crypto.randomUUID()` stored in the PWA's local storage, never tied to an account or device
identifier. Weight bounds used for validation live in `workers/cook-log-service/server/weightBounds.ts`
— a deliberately kept-honest duplicate of `PROTEINS[...].thermal.geometry.weight_bounds` in
`src/utils/proteinRegistry.js`, not a direct import, because this Worker's Cloudflare Workers
Builds project is scoped to `workers/cook-log-service/` as its Root Directory (a monorepo
sub-project build — see [Workers Builds monorepo docs](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/#monorepos)),
so a build there can't see anything outside that directory. `weightBoundsSync.spec.ts` runs
from a full checkout and fails if the two ever drift apart.

**Deploying**:

- [x] D1 database created (`cook-log-db`) and the migration applied — `wrangler.jsonc`'s
      `database_id` is the real one, not a placeholder.
- [x] The route declared as code — `wrangler.jsonc`'s `routes` block scopes a Route (not a
      Custom Domain) to `empiricalbbq.com/api/cook-logs*`, so `wrangler deploy` provisions it
      automatically. A Route always takes precedence over a Custom Domain for the paths it
      matches, so this coexists with however `pitmaster-command-center` serves the rest of the
      zone without touching it.
- [x] The Worker deployed and **live in production** (2026-09-06). Cloudflare's git-integrated
      Workers Build auto-deploys `cook-log-service` on every push to `main` — no manual
      `wrangler deploy` needed going forward. Getting here took two fixes, both merged:
      - **PR #65**: the first real build failed — `server/validation.ts` imported
        `PROTEINS` from `../../../src/utils/proteinRegistry.js`, which resolves locally but
        not in Cloudflare's monorepo-scoped build (Root Directory = `workers/cook-log-service/`,
        so the build checkout never sees `../../../src/`). Fixed by extracting the weight bounds
        into `server/weightBounds.ts` (see "Data model" above).
      - A separate, pre-existing **Cloudflare Access application ("All Workers")** was found to
        be gating the *entire* `empiricalbbq.com` zone behind a Cloudflare login — not just this
        API. It predated this feature and was unrelated to it; removing it is what let real
        requests (and this Worker's own traffic) reach the site at all.
      - **PR #66**: end-to-end testing on the live site surfaced a real client-side bug —
        every in-progress checkpoint PATCH (wrap/stall/finish/rest, see "Cook log capture UI"
        below) was missing `anon_client_id`, which `validatePatchBody` requires, so every
        checkpoint update was silently rejected with 400 even though starting a cook worked
        fine. Fixed in `cookLogCapture.controller.js`'s `patchActiveCook()`.

      Verified end-to-end in production, not just by tests: create → checkpoint update → D1
      row, driven from a real device on the live site.

**Aggregation**: `scripts/cook-log-report.mjs` is an ad hoc, human-run script (not wired into
CI or any build step, and it never writes back to a model constant or golden test) that shells
out to `wrangler d1 execute` and prints, per `protein_type` + `model_version`: session count,
mean/median predicted vs. actual cook time, and the delta percentage — the numbers to look at
before deciding whether a calculator model needs recalibration.

```bash
node scripts/cook-log-report.mjs           # local D1
node scripts/cook-log-report.mjs --remote  # production D1
```

Vitest coverage for the Worker lives in `workers/cook-log-service/__tests__/`.

## Cook log capture UI

`src/components/calc/CookLogCapture.astro` + `cookLogCapture.controller.js`, mounted once
inside `StallPredictor.astro` — the one component shared by all four protein stall pages
(`/stall-predictor`, `/pork-shoulder-stall`, `/ribs-stall`, `/turkey-stall`), so one panel
covers all of them. Calls the `cook-log-service` Worker above; doesn't modify it.

**Live in production** (2026-09-06) — see "Cook log data layer" above for the deploy fixes
that got it there, including a real bug this surfaced: every checkpoint PATCH was missing
`anon_client_id` and was being silently rejected (fixed in PR #66).

- **Consent**: off by default, shown once. `anon_client_id` (`src/utils/cookLogConsent.js`) is
  a `crypto.randomUUID()` generated only on opt-in and wiped on opt-out — never tied to an
  account or device identifier. A small non-nagging link lets someone who declined turn it
  back on later. **The consent copy is a draft**, pending final wording.
- **Starting a cook**: `protein_type` and `predicted_cook_minutes` are read from the
  calculator's own already-rendered model — `stallPredictor.controller.js` exposes
  `getPredictedCookMinutes()`, which returns the last `render()`'s result rather than
  recomputing it, so the logged prediction is exactly what the user saw on screen. Weight is
  auto-filled from the calculator's own state; only `weight_source` is asked up front, with
  target pit temp / cook method / ambient temp / altitude behind a collapsed "optional
  details" toggle (pit temp and cook method are pre-seeded from the calculator's own
  settings).
- **In-progress checkpoints**: wrap / stall-start / stall-end / finished / rested, each an
  immediate `PATCH`. All optional except finished. The in-progress cook is persisted to
  IndexedDB (`public/sw-queue-utils.js`) so it survives the app closing mid-cook.
- **Offline resilience**: a failed write queues in IndexedDB instead of being lost, drained in
  FIFO order via real Background Sync (`sw.js`'s `sync` handler) with an
  online/visibilitychange fallback for browsers without it (Safari) — belt and suspenders, not
  either/or. A small "N unsynced" badge keeps queued-but-unsent data visible rather than
  silent. `createDefaultSendFn()` in `sw-queue-utils.js` is the one network-replay
  implementation shared by both paths, including reconciling the real server id into the local
  record once a queued cook-creation POST actually lands, and clearing the local placeholder
  if it permanently fails instead — this exact logic had two real bugs caught during manual
  browser testing before it shipped, now covered by `swQueueUtils.spec.js`'s
  `createDefaultSendFn` suite.
- **Lazy-loaded**: the whole module (~8KB gzipped ~2.7KB) is fetched via a dynamic `import()`
  triggered by an `IntersectionObserver` on the panel's own container, not bundled into the
  stall page's default script — most visitors come for a cook-time number and never touch the
  panel, and shipping it unconditionally measured as a >60% increase to that page's JS on an
  ad-monetized page.

Vitest coverage: `cookLogConsent.spec.js` (opt-in/opt-out/clearing), `swQueueUtils.spec.js`
(the offline queue's FIFO retry ordering and the `createDefaultSendFn` reconciliation logic,
against in-memory fakes — no real IndexedDB needed), `cookLogClient.spec.js`
(`postCookLog`/`patchCookLog`'s happy path, server-rejection, and network-failure branches),
and `CookLogCapture.smoke.test.js` (a full DOM smoke test: consent → start a cook → checkpoint
→ finish → done → opt-out, in the same style as every other calc component's smoke test).

**Still open before this ships broadly**: a manual QA pass on a real device (airplane mode
mid-cook, backgrounding, closing the tab and reconnecting while it's closed — Chromium's
actual Background Sync manager doesn't behave deterministically under browser automation, so
that specific path needs human hands) and the final consent copy.

## Recipes

Recipes live in `src/content/recipes/*.md` (schema in `src/content.config.ts`) and are
built by `src/pages/recipes/[...slug].astro` through `RecipeLayout.astro` at
`/recipes/<slug>` — currently one, live at `/recipes/dry-brined-pulled-pork`, with no
recipes index page.

- **No authored cook times.** Smoker time comes from `stallEngine.cookDuration()` on the
  recipe's `modelProtein`, and pulled yield and servings come from that protein's yield
  matrix. Ingredient amounts are the recipe's own `ratios` × raw weight
  (`src/utils/recipeModel.js`). The weight slider rescales this page only; it never writes
  to the URL or localStorage. The Recipe JSON-LD uses the same default-weight values the
  page shows.
- **Build-time checks.** The build fails if `modelVersion` doesn't match the registry, if a
  `sourceIds` entry points at an undeclared source, or if a `review: approved` item has
  neither a source nor `modelBasis` (`src/utils/recipeSources.js`). Pending items only
  log a warning.
- **Links in frontmatter prose.** `steps[].why` and `guidance[].text` are plain text apart
  from one restricted syntax, `[text](/path)`, for same-site paths only
  (`src/utils/inlineLinks.js`). Anything else — external URLs, `//host`, `javascript:` —
  stays literal. The Markdown body below the frontmatter renders normally.
- **Cross-links.** The homepage utilities grid shows a card for the newest recipe, blog
  posts show a "Related recipe" card matched on protein tags, and each recipe lists
  related posts (`src/utils/relatedContent.js`).
- **Review.** `.claude/agents/science-editor.md` is a Claude Code subagent that checks
  recipe and blog copy against the site's evidence tiers (tier A/B sources, with
  food-safety claims tier A only). Run it before merging a new recipe or post.

## Authorship & E-E-A-T

`src/utils/author.js` is the single source of truth for who wrote the site:
`AUTHOR_NAME` / `AUTHOR_ROLE` for visible bylines and `AUTHOR_SCHEMA` (a
schema.org `Person`) for structured data. It feeds the `/about` bio page, the
blog post bylines and end-of-post author box, the `author` field on blog
`Article` and methodology `TechArticle` schema, and `Organization.founder` in
the site-wide `WebSite` block. Because the visible text and the JSON-LD read
from the same module, a byline can never claim something the structured data
contradicts — which is the failure mode search and ad-quality crawlers punish.
It also supplies the recipe byline and the `author` on each recipe's `Recipe` schema.

Editorial rule for author-facing copy: **claim only what's true.** The bio
states plainly that the author is a software/data professional rather than a
chef, food scientist, or competition pitmaster, and points at `/methodology`
for the sourcing. The site's credibility is meant to rest on published sources
and inspectable math, so inflating credentials here would undercut it.

## Testing

Engine calculations are locked with golden-value regression tests (Vitest) in
`src/utils/__tests__/`:

```bash
npm run test
```

Each golden spec hard-codes expected outputs captured from the current engine — one per
protein (`brisketEngine`, `porkShoulderEngine`, `turkeyEngine`, `ribsEngine`), plus
`stallEngine` (representative pit/wrap/climate states + curve monotonicity), `fuelEngine`
(every anchor, midpoint, and fuel × insulation × wind combo), and `restEngine` (Newtonian
cooling curve + safe-hold window). Any accidental change to an engine constant fails the tests.
The specs are regenerated only on an **intentional** engine change via
`node scripts/gen-golden.mjs` (then commit the updated specs).

`crossPathConsistency.spec.js` is different — not a golden. It asserts the stall predictor
(`computeModel`) and the cook scheduler (`cookDuration`) return the same cook duration for
identical inputs across protein × pit temp × wrap × climate, so the two pages can't silently
diverge. Ribs are a declared known failure (`test.fails`): the scheduler runs the fixed
3-2-1 / 2-2-1 method while the predictor uses `computeModel`, so they disagree until ribs is
unified — at which point the declaration turns the suite red and must be removed.

DOM smoke tests (`src/components/calc/__tests__/*.smoke.test.js`, `happy-dom` environment via
a per-file `// @vitest-environment happy-dom` directive) render a calculator component through
Astro's Container API and drive its controls, asserting the right values reach the engine and
land back in the results panel — see `mount.js` for the shared helper. The PWA shell and cook
log capture UI (above) have their own coverage in this style plus plain Vitest specs:
`swCacheUtils.spec.js`, `swQueueUtils.spec.js`, `cookLogClient.spec.js`,
`cookLogConsent.spec.js`, and `CookLogCapture.smoke.test.js`.

Recipes and cross-linking have plain Vitest specs: `recipeModel.spec.js` (wrap mapping,
cook time equal to `cookDuration()`, duration formatting, and ingredient grams),
`recipeSources.spec.js` (the build-time citation rules), `relatedContent.spec.js`, and
`inlineLinks.spec.js` (the link syntax, including rejected external, protocol-relative,
and `javascript:` hrefs).

## Security

- **Response headers** (`public/_headers`, applied site-wide): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
  `Cross-Origin-Opener-Policy: same-origin`, and a restrictive `Permissions-Policy`. The
  `/api/contact` JSON responses set `nosniff` directly (they bypass `_headers`).
- **Shareable links** hydrate calculator state from URL query params, but every value is
  validated — numbers are clamped to their slider range and enums are whitelisted
  (`src/utils/shareLink.js`) — so a hostile URL cannot inject unexpected state or markup.
- **Recipe frontmatter links** render through `src/utils/inlineLinks.js`, which only turns
  `[text](/path)` into a link when the href is a same-site absolute path. No raw HTML is
  accepted, and every other form is left as literal text.
- **Contact endpoint** (`server/contactHandler.ts`): same-origin check, server-side Turnstile
  verification (single-use tokens), message length cap, control-character stripping and length
  caps on subject fields (email-header-injection defense), and reply-to email validation.
- **JSON-LD** is emitted with `<`, `>`, `&`, and JS line-terminators escaped to unicode, so a
  schema string can never break out of its `<script>` element.
- **Content-Security-Policy** (`public/_headers`, site-wide) is **enforced**
  (`Content-Security-Policy`, flipped from `-Report-Only` once the validated allowlist showed
  no legitimate violations in production). The policy allowlists Google Tag/Analytics, the
  AdSense ad ecosystem (`googlesyndication` / `doubleclick` / `adtrafficquality`), and
  Cloudflare Turnstile, and locks down `object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'self'`, and `form-action 'self'`. `script-src` includes `'unsafe-inline'`
  because GA/Consent Mode and AdSense inject inline scripts (nonces can't cover ad-injected
  code), and `img-src https:` allows ad-creative images from arbitrary advertiser hosts.
  `worker-src 'self' blob:` covers the installable-shell Service Worker (see "PWA shell"
  below) — same-origin only, so it already covered the Service Worker and the cook-log
  capture UI's same-origin `fetch` calls with no changes needed when those shipped.
- **`npm audit`** reports advisories in Astro/esbuild, but they apply to features this site
  does not use (`define:vars`, server islands, spread props with user data, SSR error pages)
  or to the local dev server only — none are exploitable in the static production build. The
  only offered fix is a breaking `astro@7` upgrade, which should be done as a planned,
  separately-tested change rather than `npm audit fix --force`.
