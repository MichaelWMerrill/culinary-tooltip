# Empirical BBQ

Physics-flavored pitmaster calculators for [empiricalbbq.com](https://empiricalbbq.com) —
yield & cost, the thermodynamic stall, cook scheduling, smoker fuel, and rest/hold — across
four proteins (beef brisket, pork shoulder, pork ribs, turkey), plus a party planner, a
brisket size calculator, a methodology page, and a science-focused blog.

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
writes `dist/sitemap.xml` using the site's canonical URL forms (homepage `/`,
tool/util pages `*.html`, blog index `/blog`, posts `/blog/<slug>`).

## Project structure

```
src/
  layouts/
    Layout.astro           Shared <head> (SEO + GA + AdSense), nav, sticky banner, consent
    BlogPostLayout.astro   Blog-post chrome
  components/
    Nav.astro              Responsive navigation header
    AdSlot.astro           Ad placement: dev mockup vs. production AdSense <ins>
    calc/                  Calculator UI components + their client controllers
                           (StallPredictor, YieldCalculator, FuelEstimator,
                           CookScheduler, RestCalculator, PartyPlanner,
                           ProteinSelector, GearModule, FaqSection)
  pages/                   One .astro route per page (URLs preserved as *.html):
                           per-protein yield & stall pages, cook-scheduler,
                           fuel-estimator, rest-calculator, party-planner,
                           brisket-size-calculator, methodology, contact,
                           privacy, and the blog + posts
  utils/
    proteinRegistry.js     Single source of truth for per-protein data: yield
                           matrices, thermal/stall constants, serving, input axes
    brisketEngine.js       Yield/trim/shrinkage + cost calc (reads the registry)
    stallEngine.js         Mass-scaling, pit, wrap & climate stall model + curve sampler
    fuelEngine.js          Combustion/wind/insulation/ambient fuel model
    restEngine.js          Newtonian-cooling rest/hold model
    toolMatrix.js          Homepage protein × tool matrix + tool metadata
    version.js             Site + stall-engine version strings (single source of truth)
    shareLink.js           Validated URL-param (shareable-link) helpers
    analytics.js           Shared PitmasterAnalytics telemetry object
  content/blog/            Markdown blog posts
server/contactHandler.ts   Shared contact-form handler (Workers + Pages)
scripts/                   Build/generator scripts: sitemap, OG images, golden specs, ads.txt check
public/                    Static assets copied verbatim (favicons, ads.txt, llms.txt, _headers)
```

The site builds to `dist/`, which is what Cloudflare serves (see `wrangler.jsonc`). AdSense
slots render as clean dashed placeholders in development and as live
`<ins class="adsbygoogle">` units in production (`import.meta.env.PROD`).

## Contact endpoint

The contact form (`src/pages/contact.astro`) POSTs JSON to `/api/contact`. The request
handler lives in `server/contactHandler.ts` and is wired for **both** Cloudflare
deployment models:

- **Workers static-assets (current deploy):** `worker.ts` is the Worker entry (`main`
  in `wrangler.jsonc`). Static files in `dist/` are served by the
  `ASSETS` binding; the Worker only runs for `/api/contact` and defers everything else
  (including `404.html`) to the assets.
- **Cloudflare Pages:** `functions/api/contact.ts` is a thin adapter over the same
  handler, for the `functions/` convention.

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
key and is overridable at build time via the `TURNSTILE_SITE_KEY` env var (see table below). A
build-time guard throws if the resolved value is one of Cloudflare's documented **test** keys
(e.g. the "always passes" `1x00000000000000000000AA`), so a test key — which issues tokens that
always pass and would silently disable bot protection — can never ship to production. Create the
widget and both keys at Cloudflare dashboard → **Turnstile**.

> **Deployment note:** this repo deploys on the **Workers static-assets** model (config in
> `wrangler.jsonc`), and the `/api/contact` route is wired via `worker.ts` (`main`) — no
> action needed to serve it.
> `output: 'static'` in `astro.config.mjs` is unchanged; `npm run build` still just produces
> `dist/`, and the Worker is bundled by `wrangler` at deploy time. The `functions/` adapter is
> retained only for the alternative Pages deployment model.
>
> MailChannels now requires account setup (their free Workers integration was retired), so
> **Resend is the recommended path** — set `RESEND_API_KEY` and verify your sending domain.

## Testing

Engine calculations are locked with golden-value regression tests (Vitest) in
`src/utils/__tests__/`:

```bash
npm run test
```

Each spec hard-codes expected outputs captured from the current engine (grade × trim × wrap
for brisket; six representative states plus curve monotonicity for the stall; every anchor,
midpoint, and fuel × insulation × wind combo for fuel). Any accidental change to an engine
constant fails the tests. The specs are regenerated only on an **intentional** engine change
via `node scripts/gen-golden.mjs` (then commit the updated specs).

## Security

- **Response headers** (`public/_headers`, applied site-wide): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
  `Cross-Origin-Opener-Policy: same-origin`, and a restrictive `Permissions-Policy`. The
  `/api/contact` JSON responses set `nosniff` directly (they bypass `_headers`).
- **Shareable links** hydrate calculator state from URL query params, but every value is
  validated — numbers are clamped to their slider range and enums are whitelisted
  (`src/utils/shareLink.js`) — so a hostile URL cannot inject unexpected state or markup.
- **Contact endpoint** (`server/contactHandler.ts`): same-origin check, server-side Turnstile
  verification (single-use tokens), message length cap, control-character stripping and length
  caps on subject fields (email-header-injection defense), and reply-to email validation.
- **JSON-LD** is emitted with `<`, `>`, `&`, and JS line-terminators escaped to unicode, so a
  schema string can never break out of its `<script>` element.
- **Content-Security-Policy** (`public/_headers`, site-wide) ships in **report-only** mode
  (`Content-Security-Policy-Report-Only`): browsers report violations to the console but
  block nothing, so live AdSense/Analytics revenue is never at risk while the allowlist is
  validated in production. The policy allowlists Google Tag/Analytics, the AdSense ad
  ecosystem (`googlesyndication` / `doubleclick` / `adtrafficquality`), and Cloudflare
  Turnstile, and locks down `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`,
  and `form-action 'self'`. `script-src` includes `'unsafe-inline'` because GA/Consent Mode
  and AdSense inject inline scripts (nonces can't cover ad-injected code), and `img-src https:`
  allows ad-creative images from arbitrary advertiser hosts. **To enforce** once you've
  confirmed no legitimate violations in production, rename the header to
  `Content-Security-Policy` (drop `-Report-Only`) — `upgrade-insecure-requests` (inert and
  warned-about under report-only) then takes effect automatically.
- **`npm audit`** reports advisories in Astro/esbuild, but they apply to features this site
  does not use (`define:vars`, server islands, spread props with user data, SSR error pages)
  or to the local dev server only — none are exploitable in the static production build. The
  only offered fix is a breaking `astro@7` upgrade, which should be done as a planned,
  separately-tested change rather than `npm audit fix --force`.
