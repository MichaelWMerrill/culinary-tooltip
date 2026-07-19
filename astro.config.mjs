import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://empiricalbbq.com',
  // Static, pre-rendered output for Cloudflare Pages.
  output: 'static',
  // Emit `brisket-calculator.html` style files (not `/brisket-calculator/index.html`).
  // Canonical URLs are now EXTENSIONLESS (e.g. /brisket-calculator): Cloudflare's
  // default `auto-trailing-slash` html_handling serves dist/brisket-calculator.html
  // at /brisket-calculator, so build.format: 'file' still maps cleanly onto the
  // canonical form. Legacy .html paths 301 to the extensionless URLs via
  // public/_redirects.
  build: {
    format: 'file',
  },
  // NOTE: @astrojs/sitemap is installed but intentionally NOT enabled here.
  // It produces sitemap-index.xml rather than the /sitemap.xml that robots.txt
  // references. Instead, `scripts/generate-sitemap.mjs` (wired into the "build"
  // script) walks dist/ and emits a single sitemap.xml using the exact canonical
  // (extensionless) URL forms.
  integrations: [tailwind()],
});
