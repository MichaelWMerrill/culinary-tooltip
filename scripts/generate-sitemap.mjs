/*
 * Postbuild sitemap generator.
 *
 * Walks dist/ for built .html pages and emits dist/sitemap.xml using the site's
 * canonical URL forms (which match the <link rel="canonical"> tags and nav links).
 * All canonicals are EXTENSIONLESS — Cloudflare's default auto-trailing-slash
 * html_handling serves dist/<name>.html at /<name>, and public/_redirects 301s
 * the legacy /<name>.html paths to these forms:
 *   - homepage        -> https://empiricalbbq.com/
 *   - tool/util pages -> https://empiricalbbq.com/<name>
 *   - blog index      -> https://empiricalbbq.com/blog
 *   - blog posts      -> https://empiricalbbq.com/blog/<slug>
 *
 * @astrojs/sitemap is not used because it produces sitemap-index.xml rather than
 * the single /sitemap.xml that robots.txt references.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SITE = 'https://empiricalbbq.com';
const DIST = 'dist';
const LASTMOD = new Date().toISOString().slice(0, 10);

// Pages that should never appear in the sitemap.
const EXCLUDE = new Set(['404.html']);

/** Recursively collect all .html files under dir, as dist-relative POSIX paths. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith('.html')) {
      out.push(relative(DIST, full).split('\\').join('/'));
    }
  }
  return out;
}

/** Map a dist-relative html path to its canonical URL (or null to skip). */
function toUrl(relPath) {
  if (EXCLUDE.has(relPath)) return null;
  if (relPath === 'index.html') return `${SITE}/`;
  // Every other page is extensionless: strip the trailing .html.
  //   blog.html -> /blog · blog/<slug>.html -> /blog/<slug> · foo.html -> /foo
  return `${SITE}/${relPath.replace(/\.html$/, '')}`;
}

/** Rough priority/changefreq by section (paths are extensionless). */
function meta(url) {
  if (url === `${SITE}/`) return { priority: '1.0', changefreq: 'weekly' };
  if (url === `${SITE}/blog`) return { priority: '0.7', changefreq: 'weekly' };
  if (url.startsWith(`${SITE}/blog/`)) return { priority: '0.6', changefreq: 'monthly' }; // blog posts
  return { priority: '0.8', changefreq: 'weekly' }; // tool/util pages
}

const urls = walk(DIST)
  .map(toUrl)
  .filter((u) => u !== null)
  .sort((a, b) => (a === `${SITE}/` ? -1 : b === `${SITE}/` ? 1 : a.localeCompare(b)));

const body = urls
  .map((url) => {
    const { priority, changefreq } = meta(url);
    return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(join(DIST, 'sitemap.xml'), xml);
console.log(`[sitemap] wrote dist/sitemap.xml with ${urls.length} URLs`);
