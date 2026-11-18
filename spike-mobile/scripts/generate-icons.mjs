// Generate PWA icons from one inline SVG (pink→indigo, matches the app shell).
// Run: npm run icons   (requires the `sharp` devDependency)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

// 80%-safe-zone glyph so the same art works as a maskable icon too.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f9a8d4"/>
      <stop offset="0.5" stop-color="#fdba74"/>
      <stop offset="1" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif" font-size="300"
        font-weight="700" fill="#312e81">P</text>
</svg>`;

const base = Buffer.from(svg);

async function main() {
  await sharp(base).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'));
  await sharp(base).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'));
  // Maskable: same art (already has a safe margin via the rounded rect).
  await sharp(base).resize(512, 512).png().toFile(join(publicDir, 'icon-512-maskable.png'));
  console.log('✅ Wrote icon-192.png, icon-512.png, icon-512-maskable.png to public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
