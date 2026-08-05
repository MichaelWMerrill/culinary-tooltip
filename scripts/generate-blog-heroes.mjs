/*
 * Generates branded (non-photographic) hero graphics for blog posts that don't
 * have a real cook photo yet. Same dark/flame-gradient language as
 * generate-og.mjs, with a small topic-specific line motif per post. Run once
 * (or after changing the design or adding a post to `jobs`):
 * `node scripts/generate-blog-heroes.mjs`. The JPGs are committed.
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

// Ribs post: a fixed 3-2-1 block schedule (stacked bars, proportional 3:2:1)
// against the physics-model's smooth curve, to show the two disagreeing clocks.
const ribsMotif = `
  <g>
    <rect x="140" y="640" width="330" height="52" rx="8" fill="url(#title)"/>
    <rect x="484" y="640" width="220" height="52" rx="8" fill="url(#title)" fill-opacity="0.65"/>
    <rect x="718" y="640" width="110" height="52" rx="8" fill="url(#title)" fill-opacity="0.4"/>
    <text x="140" y="722" font-family="${FONT}" font-size="20" font-weight="600" fill="#fdba74">3-2-1 SCHEDULE — fixed blocks</text>
  </g>
  <g stroke-width="6" fill="none" opacity="0.75">
    <polyline points="140,540 340,510 560,430 800,380 1040,300 1260,240 1440,200" stroke="#7c8aab" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/>
  </g>
  <text x="1440" y="180" font-family="${FONT}" font-size="20" font-weight="500" fill="#7c8aab" text-anchor="end">predictor — physics curve</text>
`;

// Turkey brine/spatchcock post: three comparison bars (baseline, brined,
// spatchcocked) showing carved yield moving in different directions.
const brineMotif = `
  <g>
    <rect x="1080" y="660" width="80" height="140" rx="10" fill="#7c8aab" fill-opacity="0.35"/>
    <rect x="1200" y="560" width="80" height="240" rx="10" fill="url(#title)"/>
    <rect x="1320" y="676" width="80" height="124" rx="10" fill="#7c8aab" fill-opacity="0.55"/>
    <text x="1120" y="830" font-family="${FONT}" font-size="17" font-weight="600" fill="#7c8aab" text-anchor="middle">baseline</text>
    <text x="1240" y="830" font-family="${FONT}" font-size="17" font-weight="600" fill="#fdba74" text-anchor="middle">brined</text>
    <text x="1360" y="830" font-family="${FONT}" font-size="17" font-weight="600" fill="#7c8aab" text-anchor="middle">spatchcock</text>
  </g>
`;

// Climate stall-paradox post: two stall curves on the same axes — arid
// flattens (stalls) earlier and holds the plateau longer, humid flattens
// later and breaks sooner, both converging by the finish.
const climateMotif = `
  <g stroke-width="6" fill="none" opacity="0.9">
    <polyline points="140,790 320,660 460,630 700,615 880,600 1040,430 1220,300 1440,215" stroke="url(#title)" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g stroke-width="6" fill="none" opacity="0.32">
    <polyline points="140,800 300,700 540,650 800,640 1000,630 1160,470 1440,260" stroke="#7c8aab" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/>
  </g>
  <text x="1440" y="195" font-family="${FONT}" font-size="22" font-weight="600" fill="#fdba74" text-anchor="end">arid — earlier, longer stall</text>
  <text x="1440" y="440" font-family="${FONT}" font-size="20" font-weight="500" fill="#7c8aab" text-anchor="end">humid — later, shorter stall</text>
`;

// Brisket yield post: a rising bar chart of cooked yield % by grade — Prime
// shortest, Select tallest, inverse of the price/prestige ordering.
const yieldMotif = `
  <g>
    <rect x="1070" y="672" width="86" height="150" rx="10" fill="#7c8aab" fill-opacity="0.4"/>
    <rect x="1186" y="592" width="86" height="230" rx="10" fill="#f59e0b" fill-opacity="0.65"/>
    <rect x="1302" y="502" width="86" height="320" rx="10" fill="url(#title)"/>
    <text x="1113" y="655" font-family="${FONT}" font-size="18" font-weight="700" fill="#7c8aab" text-anchor="middle">46.8%</text>
    <text x="1229" y="575" font-family="${FONT}" font-size="18" font-weight="700" fill="#fdba74" text-anchor="middle">50.2%</text>
    <text x="1345" y="485" font-family="${FONT}" font-size="18" font-weight="700" fill="#fdba74" text-anchor="middle">54.3%</text>
    <text x="1113" y="850" font-family="${FONT}" font-size="18" font-weight="600" fill="#7c8aab" text-anchor="middle">PRIME</text>
    <text x="1229" y="850" font-family="${FONT}" font-size="18" font-weight="600" fill="#7c8aab" text-anchor="middle">CHOICE</text>
    <text x="1345" y="850" font-family="${FONT}" font-size="18" font-weight="600" fill="#7c8aab" text-anchor="middle">SELECT</text>
  </g>
`;

// Brisket mass-exponent post: two bar pairs — climb rate roughly halving
// 8lb->16lb (steep exponent) next to stall duration barely moving (shallow
// exponent) — the decoupling is the whole point of the post.
const massExponentMotif = `
  <g>
    <text x="1030" y="470" font-family="${FONT}" font-size="18" font-weight="700" fill="#7c8aab" text-anchor="middle">CLIMB RATE</text>
    <rect x="990" y="500" width="80" height="220" rx="10" fill="url(#title)"/>
    <rect x="1110" y="610" width="80" height="110" rx="10" fill="url(#title)" fill-opacity="0.5"/>
    <text x="1030" y="745" font-family="${FONT}" font-size="16" font-weight="600" fill="#fdba74" text-anchor="middle">8 lb</text>
    <text x="1150" y="745" font-family="${FONT}" font-size="16" font-weight="600" fill="#7c8aab" text-anchor="middle">16 lb</text>
  </g>
  <g>
    <text x="1330" y="470" font-family="${FONT}" font-size="18" font-weight="700" fill="#7c8aab" text-anchor="middle">STALL LENGTH</text>
    <rect x="1290" y="620" width="80" height="100" rx="10" fill="#7c8aab" fill-opacity="0.55"/>
    <rect x="1410" y="595" width="80" height="125" rx="10" fill="#7c8aab" fill-opacity="0.55"/>
    <text x="1330" y="745" font-family="${FONT}" font-size="16" font-weight="600" fill="#fdba74" text-anchor="middle">8 lb</text>
    <text x="1450" y="745" font-family="${FONT}" font-size="16" font-weight="600" fill="#7c8aab" text-anchor="middle">16 lb</text>
  </g>
`;

// Turkey danger-zone post: a bracketed 40-140°F band with a clock glyph, plus
// the two levers (spatchcock / higher pit temp) that shrink the exposure.
const dangerZoneMotif = `
  <g>
    <rect x="140" y="560" width="1180" height="70" rx="12" fill="#f97316" fill-opacity="0.16" stroke="#f97316" stroke-opacity="0.55" stroke-width="2"/>
    <text x="170" y="605" font-family="${FONT}" font-size="24" font-weight="700" fill="#fdba74">40&#176;F</text>
    <text x="1250" y="605" font-family="${FONT}" font-size="24" font-weight="700" fill="#fdba74" text-anchor="end">140&#176;F</text>
    <text x="710" y="605" font-family="${FONT}" font-size="19" font-weight="600" fill="#fca5a5" text-anchor="middle" letter-spacing="1">DANGER ZONE</text>
  </g>
  <g transform="translate(1360,470) scale(0.42)">
    <circle cx="256" cy="256" r="200" fill="none" stroke="#7c8aab" stroke-width="26" opacity="0.5"/>
    <line x1="256" y1="256" x2="256" y2="120" stroke="#fdba74" stroke-width="26" stroke-linecap="round"/>
    <line x1="256" y1="256" x2="360" y2="256" stroke="#fdba74" stroke-width="26" stroke-linecap="round"/>
  </g>
  <text x="1440" y="700" font-family="${FONT}" font-size="19" font-weight="600" fill="#7c8aab" text-anchor="end">spatchcock or raise pit temp</text>
  <text x="1440" y="730" font-family="${FONT}" font-size="19" font-weight="600" fill="#7c8aab" text-anchor="end">to shrink the window</text>
`;

const jobs = [
  { file: 'public/blog/turkey-doesnt-stall.jpg', label: 'TURKEY: NO STALL', motif: turkeyMotif },
  { file: 'public/blog/cold-weather-fuel-math.jpg', label: 'COLD-WEATHER FUEL', motif: fuelMotif },
  { file: 'public/blog/ribs-two-clocks.jpg', label: 'RIBS: TWO CLOCKS', motif: ribsMotif },
  { file: 'public/blog/turkey-brine-vs-spatchcock-yield.jpg', label: 'BRINE VS SPATCHCOCK', motif: brineMotif },
  { file: 'public/blog/climate-stall-paradox.jpg', label: 'CLIMATE: STALL SHIFT', motif: climateMotif },
  { file: 'public/blog/prime-brisket-yield-myth.jpg', label: 'BRISKET YIELD MATH', motif: yieldMotif },
  { file: 'public/blog/brisket-mass-exponents.jpg', label: 'MASS VS. THE STALL', motif: massExponentMotif },
  { file: 'public/blog/turkey-danger-zone-clock.jpg', label: 'TURKEY DANGER ZONE', motif: dangerZoneMotif },
];

for (const { file, label, motif } of jobs) {
  const svg = base(label, motif);
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`[blog-hero] wrote ${file} (${meta.width}x${meta.height})`);
}
