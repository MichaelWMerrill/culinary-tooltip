/*
 * Generates branded (non-photographic) hero graphics for blog posts that don't
 * have a real cook photo yet: public/blog/turkey-doesnt-stall.jpg and
 * public/blog/cold-weather-fuel-math.jpg (1600x900). Same dark/flame-gradient
 * language as generate-og.mjs, with a small topic-specific line motif. Run
 * once (or after changing the design): `node scripts/generate-blog-heroes.mjs`.
 * The JPGs are committed.
 */
import sharp from 'sharp';

const W = 1600;
const H = 900;

const FONT = 'DejaVu Sans, Verdana, Arial, sans-serif';

const base = (label, motif) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="55%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
    <radialGradient id="glowA" cx="86%" cy="-8%" r="70%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="-6%" cy="112%" r="65%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#121824"/>
  <rect width="${W}" height="${H}" fill="url(#glowA)"/>
  <rect width="${W}" height="${H}" fill="url(#glowB)"/>

  <rect x="100" y="200" rx="22" ry="22" width="330" height="46" fill="#f97316" fill-opacity="0.12" stroke="#f97316" stroke-opacity="0.4"/>
  <text x="126" y="231" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="3" fill="#fdba74">FIELD NOTES</text>

  <text x="98" y="360" font-family="${FONT}" font-size="64" font-weight="800" letter-spacing="-1.5" fill="url(#title)">${label}</text>

  ${motif}

  <rect x="0" y="882" width="${W}" height="18" fill="url(#title)"/>
</svg>`;

// Turkey post: a monotonic climb line (no stall plateau) vs. a brisket-style
// stalled curve, faded, for contrast.
const turkeyMotif = `
  <g stroke-width="6" fill="none" opacity="0.9">
    <polyline points="140,760 340,700 540,520 760,460 980,340 1220,260 1440,210" stroke="url(#title)" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g stroke-width="6" fill="none" opacity="0.28">
    <polyline points="140,800 340,720 460,660 760,650 900,645 1080,520 1440,320" stroke="#7c8aab" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/>
  </g>
  <text x="1220" y="245" font-family="${FONT}" font-size="22" font-weight="600" fill="#fdba74" text-anchor="end">turkey — no stall</text>
  <text x="1440" y="345" font-family="${FONT}" font-size="20" font-weight="500" fill="#7c8aab" text-anchor="end">brisket — stall band</text>
`;

// Fuel post: a rising bar comparison (ideal vs. cold+windy burn) plus a
// simple flame glyph.
const fuelMotif = `
  <g>
    <rect x="1180" y="620" width="90" height="180" rx="10" fill="#7c8aab" fill-opacity="0.35"/>
    <rect x="1300" y="430" width="90" height="370" rx="10" fill="url(#title)"/>
    <text x="1225" y="810" font-family="${FONT}" font-size="18" font-weight="600" fill="#7c8aab" text-anchor="middle">70&#176;F calm</text>
    <text x="1345" y="810" font-family="${FONT}" font-size="18" font-weight="600" fill="#fdba74" text-anchor="middle">22&#176;F windy</text>
  </g>
  <g transform="translate(1440,470) scale(0.34)">
    <path d="M 106 404 C 136 404, 148 302, 174 270 Q 194 246, 238 244 L 306 244 Q 350 243, 366 202 C 382 162, 390 140, 408 106" fill="none" stroke="#fbbf24" stroke-width="52" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </g>
`;

const jobs = [
  { file: 'public/blog/turkey-doesnt-stall.jpg', label: 'TURKEY: NO STALL', motif: turkeyMotif },
  { file: 'public/blog/cold-weather-fuel-math.jpg', label: 'COLD-WEATHER FUEL', motif: fuelMotif },
];

for (const { file, label, motif } of jobs) {
  const svg = base(label, motif);
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`[blog-hero] wrote ${file} (${meta.width}x${meta.height})`);
}
