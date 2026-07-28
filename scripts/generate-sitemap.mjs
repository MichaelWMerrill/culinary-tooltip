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
 *
 * <lastmod> describes when the page's SOURCE actually changed, not when we last
 * built. Stamping every URL with "today" on every deploy tells Google the whole
 * site changed every time we ship; once lastmod is demonstrably wrong Google
 * stops trusting the field site-wide, and we lose the one signal that flags
 * genuinely-new pages as worth crawling. Two sources, in order:
 *   1. Blog posts: `updatedDate` (or `pubDate`) from the Markdown frontmatter —
 *      author-declared, and independent of how the repo was cloned.
 *   2. Everything else: the last commit date of the .astro route.
 * When neither resolves (no git, or a shallow CI clone where every file reports
 * the tip commit) we omit <lastmod> for that URL — an absent date is ignored, a
 * wrong one is actively harmful.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE = 'https://empiricalbbq.com';
const DIST = 'dist';

// Pages that should never appear in the sitemap.
const EXCLUDE = new Set(['404.html']);

/** Run a git command, returning trimmed stdout or null if git can't answer. */
function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// A shallow clone (e.g. `git clone --depth 1` in CI) collapses all history onto
// one commit, so per-file commit dates would all be identical — exactly the
// churn this is meant to avoid. Detect it and fall back to omitting lastmod.
const HAS_GIT_HISTORY = git('rev-parse', '--is-inside-work-tree') === 'true' && git('rev-parse', '--is-shallow-repository') === 'false';

/** Map a dist-relative html path back to the source file that produced it. */
function toSource(relPath) {
  const slug = relPath.replace(/\.html$/, '');
  // Blog posts come from Markdown in the content collection; every other page
  // is a .astro route of the same name.
  if (slug.startsWith('blog/')) return `src/content/${slug}.md`;
  return `src/pages/${slug}.astro`;
}

/**
 * Author-declared date from a blog post's frontmatter: `updatedDate` if the post
 * has been revised, else `pubDate`. Returns null for non-posts or on any parse
 * miss (the git fallback then applies).
 */
function frontmatterDate(source) {
  if (!source.endsWith('.md')) return null;
  let raw;
  try {
    raw = readFileSync(source, 'utf8');
  } catch {
    return null;
  }
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return null;
  for (const key of ['updatedDate', 'pubDate']) {
    // Dates are plain or quoted YYYY-MM-DD (schema coerces them to Date); take
    // just the date part so the value is a valid W3C date for the sitemap.
    const hit = block[1].match(new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, 'm'));
    if (hit) return hit[1];
  }
  return null;
}

/** Best available modification date (YYYY-MM-DD) for a page, or null if unknown. */
function lastModified(relPath) {
  const source = toSource(relPath);
  const declared = frontmatterDate(source);
  if (declared) return declared;
  if (!HAS_GIT_HISTORY) return null;
  // %cs = committer date, already formatted as YYYY-MM-DD (W3C date, which is
  // what the sitemap protocol wants).
  return git('log', '-1', '--format=%cs', '--', source) || null;
}

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

const entries = walk(DIST)
  .map((relPath) => ({ url: toUrl(relPath), lastmod: lastModified(relPath) }))
  .filter((e) => e.url !== null)
  .sort((a, b) => (a.url === `${SITE}/` ? -1 : b.url === `${SITE}/` ? 1 : a.url.localeCompare(b.url)));

const body = entries
  .map(({ url, lastmod }) => {
    const { priority, changefreq } = meta(url);
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${url}</loc>${lastmodTag}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(join(DIST, 'sitemap.xml'), xml);
const dated = entries.filter((e) => e.lastmod).length;
console.log(`[sitemap] wrote dist/sitemap.xml with ${entries.length} URLs (${dated} with <lastmod>)`);
if (dated < entries.length) {
  console.warn(`[sitemap] ${entries.length - dated} URL(s) have no <lastmod> — git history unavailable or file untracked.`);
}
