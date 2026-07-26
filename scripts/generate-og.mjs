/*
 * Generates the default social-share image at public/og-default.png (1200×630).
 * Dark base (#121824) with a flame→amber gradient wordmark. Run once (or after
 * changing the design): `node scripts/generate-og.mjs`. The PNG is committed.
 */
import sharp from 'sharp';

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="55%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
    <radialGradient id="glowA" cx="82%" cy="-12%" r="70%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="-8%" cy="108%" r="60%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#121824"/>
  <rect width="${W}" height="${H}" fill="url(#glowA)"/>
  <rect width="${W}" height="${H}" fill="url(#glowB)"/>

  <!-- pill -->
  <rect x="90" y="150" rx="22" ry="22" width="392" height="46" fill="#f97316" fill-opacity="0.12" stroke="#f97316" stroke-opacity="0.4"/>
  <text x="118" y="181" font-family="DejaVu Sans, Verdana, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3" fill="#fdba74">FITTED TO FIELD GUIDANCE</text>

  <text x="88" y="318" font-family="DejaVu Sans, Verdana, Arial, sans-serif" font-size="96" font-weight="800" letter-spacing="-2" fill="url(#title)">EMPIRICAL BBQ</text>

  <text x="92" y="386" font-family="DejaVu Sans, Verdana, Arial, sans-serif" font-size="38" font-weight="500" fill="#aeb8d0">Cook-time, yield &amp; fuel calculators</text>

  <text x="92" y="446" font-family="DejaVu Sans, Verdana, Arial, sans-serif" font-size="26" font-weight="400" fill="#7c8aab">Brisket · Pork shoulder · Ribs · Turkey</text>

  <g transform="translate(896,196) scale(0.46)">
    <rect width="512" height="512" rx="112" fill="#1a2233"/>
    <g>
      <path d="M 106 404 C 136 404, 148 302, 174 270 Q 194 246, 238 244 L 306 244 Q 350 243, 366 202 C 382 162, 390 140, 408 106" fill="none" stroke="#fbbf24" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 174 270 Q 194 246, 238 244 L 306 244 Q 350 243, 366 202" fill="none" stroke="#f97316" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <rect x="0" y="618" width="${W}" height="12" fill="url(#title)"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
const meta = await sharp('public/og-default.png').metadata();
console.log(`[og] wrote public/og-default.png (${meta.width}x${meta.height})`);
