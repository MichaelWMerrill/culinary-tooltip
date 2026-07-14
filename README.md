# Empirical BBQ

Physics-based pitmaster calculators for [empiricalbbq.com](https://empiricalbbq.com) —
brisket trim & yield, the thermodynamic stall, and smoker fuel & cost.

Built with [Astro](https://astro.build) (static output) and pre-compiled Tailwind CSS,
deployed as static assets on Cloudflare Pages.

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
  layouts/Layout.astro       Shared <head> (SEO + GA + AdSense), nav, footer banner
  components/
    Nav.astro                Responsive navigation header
    AdSlot.astro             Ad placement: dev mockup vs. production AdSense <ins>
  pages/                     One .astro route per page (URLs preserved as *.html)
  utils/
    brisketEngine.js         USDA/trim/wrap/serving constants + calc
    stallEngine.js           Mass-scaling, pit, climate model + curve sampler
    fuelEngine.js            Combustion/wind/insulation/ambient model
    analytics.js             Shared PitmasterAnalytics telemetry object
public/                      Static assets copied verbatim (favicon, ads.txt, sitemap.xml)
```

The site builds to `dist/`, which is what Cloudflare serves (see `wrangler.toml` /
`wrangler.jsonc`). AdSense slots render as clean dashed placeholders in development and as
live `<ins class="adsbygoogle">` units in production (`import.meta.env.PROD`).

## Contact endpoint

The contact form (`src/pages/contact.astro`) POSTs JSON to `/api/contact`. The request
handler lives in `server/contactHandler.ts` and is wired for **both** Cloudflare
deployment models:

- **Workers static-assets (current deploy):** `worker.ts` is the Worker entry (`main`
  in `wrangler.toml` / `wrangler.jsonc`). Static files in `dist/` are served by the
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
| `TURNSTILE_SECRET_KEY` | **Yes** | Cloudflare Turnstile *secret* key, used for server-side verification. |
| `RESEND_API_KEY` | Optional | If present, email is sent via Resend instead of MailChannels. |

**Turnstile site key:** the widget's *site* key is a constant in `src/pages/contact.astro`
(`TURNSTILE_SITE_KEY`). It currently uses Cloudflare's public "always passes" **test** key
so the form works in dev/preview — replace it with your production site key (marked with a
`// TODO: set real key` comment). Create the widget and both keys at Cloudflare dashboard →
**Turnstile**.

> **Deployment note:** this repo deploys on the **Workers static-assets** model, and the
> `/api/contact` route is wired via `worker.ts` (`main`) — no action needed to serve it.
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
