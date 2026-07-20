# Empirical BBQ — Feature Roadmap

Effort: S (a day or less) / M (a weekend) / L (multi-week)
Leverage: how much it compounds traffic, list, or data assets

## Quick wins — high leverage
- [x] 1. Shareable cook links (S) — encode calculator state in URL query params;
      hydrate state from params on load (params > localStorage). Every forum
      share becomes a pre-configured backlink.
- [x] 2. Cook scheduler (M) — invert the stall predictor: user enters "eat at
      6 PM Saturday" → back-calculate fire-up time, wrap window, rest period.
      Downloadable .ics calendar file. Highest-search-volume BBQ question.
- [x] 3. AI answer-engine optimization (S) — llms.txt at site root; expand
      FAQPage schema per tool; keep Content-Signals policy in robots.txt.

## Medium-term
- [x] 4. More proteins (M per protein) — pork shoulder, ribs, turkey. Each is
      a new constants block in the engine data matrices + a protein selector.
      Each protein is also a new SEO landing page. (Registry-driven; all four
      proteins ship across yield/stall/scheduler as applicable.)
- [x] 5. Reverse brisket calculator (S) — "16 guests → buy a 13.5 lb packer,
      budget $58." Uses existing THRESHOLD_PER_GUEST and yield matrix.
      (Shipped as /brisket-size-calculator and generalized in /party-planner.)
- [ ] 6. Email capture: "Send my cook plan" (M) — email the scheduler output;
      builds the list. Pairs with #2. Requires ESP integration.
- [ ] 7. Wind + altitude in the stall model (M) — fuel engine models wind;
      stall doesn't. Altitude affects evaporative cooling; no competitor
      models it.

## Post-deploy — extensionless URL migration (manual, one-time)
After the extensionless-canonical migration deploys, do these by hand:
- [ ] Resubmit `sitemap.xml` in Google Search Console and request re-indexing of the
      four tool pages (`/brisket-calculator`, `/stall-predictor`, `/fuel-estimator`,
      `/cook-scheduler`).
- [ ] Spot-check live: `curl -I https://empiricalbbq.com/brisket-calculator.html`
      returns `301` → `/brisket-calculator`, and the extensionless URL returns `200`.

## Ambitious
- [ ] 8. Live Cook Mode / PWA (L) — log actual probe temps against the
      predicted curve mid-cook; recalibrate finish estimate in real time.
      Turns a one-shot visit into a 12-hour session.
- [ ] 9. Community calibration loop (L) — structured "log your cook" form;
      aggregate real-cook data to tune engine constants. Moat + marketing
      ("model tuned on N real cooks").
- [ ] 10. Embeddable calculator widgets (L) — iframe/script embeds for BBQ
      blogs; every embed is a branded backlink.
- [x] 11. Contextual affiliate expansion (S) — per-calculator gear modules
      (probes on stall, charcoal baskets on fuel, trimming knives on brisket)
      following the existing Amazon Associates disclosure pattern.
      (Shipped as `GearModule.astro` + `src/data/gear.js` with state → product
      matching rules. The catalog is seeded with the real associate links we
      have; `ROADMAP_GEAR` in gear.js lists the wanted-but-linkless products —
      peach paper, charcoal baskets, rib racks, turkey injector — for a human
      to drop real amzn.to links into, at which point the matcher lights them
      up automatically.)

## Deferred — planned, not yet implemented
- [ ] Astro 7 upgrade — planned, tested separately (see README).
- [ ] Live Cook Mode PWA (= #8 above) — keep it online-first when built;
      offline caching would suppress ad impressions.
- [ ] Community calibration loop (= #9 above).
- [ ] Email capture / ESP integration (= #6 above).
- [ ] CSP enforce-mode flip — manual, after reviewing the production
      report-only CSP report.
- [ ] Turnstile production site key — manual, via the Cloudflare dashboard.
- [ ] GSC sitemap resubmission — manual, post-deploy.
- [ ] Whole-app security audit — the `/api/contact` Worker (input validation,
      injection, Turnstile verification) plus CSP/security-header config.
      Deferred to after Phase 7 per project owner.
