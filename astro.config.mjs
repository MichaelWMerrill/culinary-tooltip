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
  integrations: [tailwind()],
});
