/*
 * Post-build guard for dist/ads.txt.
 *
 * ads.txt is AdSense revenue infrastructure: if it goes missing or loses the
 * publisher ID, Google flags the site and can stop serving ads — silently, with
 * no build error. This check fails the build instead, so a stray deletion or a
 * public/ mishap can never ship. (The file was accidentally deleted once in this
 * repo's history; this is the tripwire that would have caught it.)
 *
 * Wired into the "build" script after astro build + sitemap generation.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ADS_TXT = join('dist', 'ads.txt');
const REQUIRED_PUBLISHER_ID = 'pub-4455664783992058';

let contents;
try {
  contents = readFileSync(ADS_TXT, 'utf8');
} catch {
  console.error(
    `[ads-txt] FAIL: ${ADS_TXT} is missing from the build.\n` +
      `          Restore public/ads.txt (Google AdSense authorized-sellers file).`
  );
  process.exit(1);
}

if (!contents.includes(REQUIRED_PUBLISHER_ID)) {
  console.error(
    `[ads-txt] FAIL: ${ADS_TXT} does not contain the AdSense publisher ID ` +
      `${REQUIRED_PUBLISHER_ID}.\n          Current contents:\n${contents.trim()}`
  );
  process.exit(1);
}

console.log(`[ads-txt] OK: dist/ads.txt present with publisher ID ${REQUIRED_PUBLISHER_ID}.`);
