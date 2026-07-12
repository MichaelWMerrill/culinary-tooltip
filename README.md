# Empirical BBQ

Physics-based pitmaster calculators for [empiricalbbq.com](https://empiricalbbq.com) —
brisket trim & yield, the thermodynamic stall, and smoker fuel & cost.

Built with [Astro](https://astro.build) (static output) and pre-compiled Tailwind CSS,
deployed as static assets on Cloudflare Pages.

## Development

```bash
npm install
npm run dev      # local dev server (ad slots render as labeled placeholders)
npm run build    # static build to dist/
npm run preview  # preview the production build
```

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

The site builds to `dist/`, which is what Cloudflare Pages serves (see `wrangler.toml` /
`wrangler.jsonc`). AdSense slots render as clean dashed placeholders in development and as
live `<ins class="adsbygoogle">` units in production (`import.meta.env.PROD`).
