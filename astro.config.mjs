import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://empiricalbbq.com',
  // Static, pre-rendered output for Cloudflare Pages.
  output: 'static',
  // Emit `brisket-calculator.html` style files (not `/brisket-calculator/index.html`)
  // so the existing crawled URLs, sitemap entries, and internal `.html` links stay valid.
  build: {
    format: 'file',
  },
  // NOTE: @astrojs/sitemap is installed but intentionally NOT enabled here.
  // With build.format: 'file' it emits extensionless URLs (e.g. /brisket-calculator)
  // that contradict this site's `.html` canonical URLs, and it produces
  // sitemap-index.xml rather than the /sitemap.xml that robots.txt references.
  // Instead, `scripts/generate-sitemap.mjs` (wired into the "build" script) walks
  // dist/ and emits a single sitemap.xml using the exact canonical URL forms.
  integrations: [tailwind()],
});
