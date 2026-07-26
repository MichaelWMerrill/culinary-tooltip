/*
 * Generates the brand favicon set into public/ from a single SVG master.
 *
 * The mark is the stall curve — steep climb, flat plateau, climb to finish —
 * with the plateau segment picked out in flame (#f97316) against an amber
 * (#fbbf24) curve, on the site's base background (#121824). It is the one
 * shape that covers every protein and every tool rather than any single cut.
 *
 * Run once, or after changing the design; the PNGs are committed:
 *   npm i -D sharp && node scripts/generate-icons.mjs
 *
 * sharp is deliberately NOT a runtime dependency — like scripts/generate-og.mjs,
 * this is a build-the-asset-once script, not part of `npm run build`.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const BG = '#121824';
const FLAME = '#f97316';
const AMBER = '#fbbf24';

// Full curve, and the plateau sub-segment that gets the flame highlight.
const CURVE =
  'M 106 404 C 136 404, 148 302, 174 270 Q 194 246, 238 244 ' +
  'L 306 244 Q 350 243, 366 202 C 382 162, 390 140, 408 106';
const PLATEAU = 'M 174 270 Q 194 246, 238 244 L 306 244 Q 350 243, 366 202';

/**
 * @param {object} o
 * @param {number} o.rx     corner radius on the 512 canvas (0 = full bleed)
 * @param {number} o.scale  mark scale about the canvas centre
 * @param {number} o.sw     stroke width
 */
function iconSvg({ rx, scale, sw }) {
  const t = `translate(${256 - 256 * scale},${256 - 256 * scale}) scale(${scale})`;
  const stroke = `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
       <rect width="512" height="512" rx="${rx}" fill="${BG}"/>
       <g transform="${t}">
         <path d="${CURVE}" stroke="${AMBER}" ${stroke}/>
         <path d="${PLATEAU}" stroke="${FLAME}" ${stroke}/>
       </g>
     </svg>`,
  );
}

// Tab favicons carry a heavier stroke and a tighter crop, otherwise the
// plateau — the whole point of the mark — dissolves at 16px.
const COMPACT = iconSvg({ rx: 72, scale: 1.14, sw: 64 });
const STANDARD = iconSvg({ rx: 112, scale: 1.0, sw: 52 });
const FULL_BLEED = iconSvg({ rx: 0, scale: 1.06, sw: 56 }); // iOS applies its own mask
const MASKABLE = iconSvg({ rx: 0, scale: 0.72, sw: 52 }); // Android adaptive safe zone

const render = (svg, size) => sharp(svg).resize(size, size).png().toBuffer();

/** Minimal ICO container around already-encoded PNG frames. */
function buildIco(frames) {
  const dir = Buffer.alloc(6 + 16 * frames.length);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(frames.length, 4);
  let offset = dir.length;
  frames.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, e);
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([dir, ...frames.map((f) => f.data)]);
}

const outputs = [
  ['public/favicon-16x16.png', COMPACT, 16],
  ['public/favicon-32x32.png', COMPACT, 32],
  ['public/apple-touch-icon.png', FULL_BLEED, 180],
  ['public/android-chrome-192x192.png', STANDARD, 192],
  ['public/android-chrome-512x512.png', STANDARD, 512],
  ['public/maskable-512x512.png', MASKABLE, 512],
];

for (const [path, svg, size] of outputs) {
  await sharp(svg).resize(size, size).png().toFile(path);
  console.log(`[icons] wrote ${path} (${size}x${size})`);
}

const icoSizes = [16, 32, 48];
const frames = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await render(COMPACT, size) })),
);
await writeFile('public/favicon.ico', buildIco(frames));
console.log(`[icons] wrote public/favicon.ico (${icoSizes.join(', ')})`);
