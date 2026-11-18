// public/icon.svg → icon-{192,512}.png, plus a "dev" variant (icon-{size}-dev.png: amber
// ribbon with "DEV") so the dev install is visually distinct on the Home Screen.
// Edit public/icon.svg, run `npm run icons`, commit the PNGs. Full-bleed art, so one file
// serves as both the normal and maskable icon.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const SIZES = [192, 512];
const svg = await readFile('public/icon.svg');
const ribbon = (size) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect x="0" y="0" width="512" height="120" fill="#f59e0b"/>
    <text x="256" y="86" font-family="system-ui, sans-serif" font-size="80" font-weight="800" fill="#1c1917" text-anchor="middle">DEV</text>
  </svg>`);

for (const size of SIZES) {
  const base = await sharp(svg, { density: 512 }).resize(size, size).png().toBuffer();
  await sharp(base).toFile(`public/icon-${size}.png`);
  await sharp(base).composite([{ input: await sharp(ribbon(size)).resize(size, size).png().toBuffer() }]).toFile(`public/icon-${size}-dev.png`);
  console.log(`✓ public/icon-${size}.png, icon-${size}-dev.png`);
}
