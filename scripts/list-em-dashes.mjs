/*
 * List any em dash (U+2014) left in reader-facing files.
 *
 * Usage: node scripts/list-em-dashes.mjs [--include-comments]
 *
 * Scans src/pages, src/components, src/layouts, src/content, src/data,
 * src/utils and public for the character and its escapes (&mdash;, &#8212;,
 * &#x2014;, and the JS escape for U+2014). Prints one line per hit as `file:line [category] excerpt`
 * and a per-category count at the end.
 *
 * Informational only: it ALWAYS exits 0 and is not wired into the build or CI.
 * Code comments, tests and __tests__ folders are skipped unless
 * --include-comments is passed. Legal copy (the privacy page) and standalone
 * empty-state placeholder glyphs are labelled so they are easy to ignore.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOTS = ['src/pages', 'src/components', 'src/layouts', 'src/content', 'src/data', 'src/utils', 'public'];
const EXTS = new Set(['.astro', '.js', '.mjs', '.ts', '.md', '.txt', '.json', '.webmanifest', '.xml']);
const DASH = /\u2014|&mdash;|&#8212;|&#x2014;|\\u2014/i;
const includeComments = process.argv.includes('--include-comments');

function walk(dir, out = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (name === 'node_modules' || name === '__tests__' || name === 'dist') continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

const isComment = (s) => /^(\/\/|\/\*|\*|\{\/\*|<!--|#)/.test(s);
const trailingComment = (line) => {
  const m = DASH.exec(line);
  if (!m) return false;
  const before = line.slice(0, m.index);
  return /(^|[^:])\/\/\s/.test(before) || /(^|[^:'"`])\/\/(?!\/)/.test(before) && !/https?:/.test(before.slice(-8));
};
const isPlaceholder = (s) =>
  />\s*(\u2014|&mdash;)(\s*[^<>{]{0,18})?\s*</.test(s) || /(=|:|\?|\|\|)\s*['"`]\u2014['"`]/.test(s);

const counts = new Map();
const bump = (k) => counts.set(k, (counts.get(k) || 0) + 1);

try {
  for (const root of ROOTS) {
    for (const file of walk(root).sort()) {
      const rel = relative('.', file);
      let lines;
      try {
        lines = readFileSync(file, 'utf8').split('\n');
      } catch {
        continue;
      }
      const isMd = file.endsWith('.md');
      let inFront = isMd && lines[0]?.trim() === '---';
      let inBlockComment = false;
      lines.forEach((line, i) => {
        const s = line.trim();
        if (inFront && i > 0 && s === '---') inFront = false;
        const startsBlock = s.includes('/*') && !s.includes('*/');
        const wasBlock = inBlockComment;
        if (startsBlock) inBlockComment = true;
        if (inBlockComment && s.includes('*/')) inBlockComment = false;
        if (!DASH.test(line)) return;

        let cat = 'copy';
        if (wasBlock || isComment(s) || trailingComment(line)) cat = 'comment';
        else if (rel.endsWith('privacy.astro')) cat = 'legal';
        else if (isPlaceholder(line)) cat = 'placeholder';
        else if (isMd && inFront && /^(title|description):/.test(s)) cat = 'title-or-description';
        else if (/^\s*(title=|description=|headline:|name:)/.test(line)) cat = 'title-or-description';

        if (cat === 'comment' && !includeComments) return;
        bump(cat);
        console.log(`${rel}:${i + 1} [${cat}] ${s.slice(0, 110)}`);
      });
    }
  }
  console.log('\nSummary (em dash lines by category):');
  if (counts.size === 0) console.log('  none');
  for (const [k, v] of [...counts].sort()) console.log(`  ${k}: ${v}`);
} catch (err) {
  console.log(`list-em-dashes: stopped early (${err && err.message ? err.message : err}). Exiting 0 by design.`);
}
process.exit(0);
