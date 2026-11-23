// e2e/capture/build-assets.mjs
//
// Turns the captured screenshots into the README's images:
//   assets/demo.gif          the walkthrough, one frame per step
//   assets/screenshots/*.webp a few stills
// Usage: node build-assets.mjs <capture dir> <repository root> <sharp module path>

import { mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const [captureDir, root, sharpPath] = process.argv.slice(2);
const sharp = createRequire(import.meta.url)(sharpPath);

const frames = readdirSync(captureDir)
  .filter((f) => f.endsWith('.png'))
  .sort();
const name = (f) => f.replace(/^\d+-/, '').replace(/\.png$/, '');

// The walkthrough: 960px wide, 2 seconds a frame, looping.
const GIF_WIDTH = 960;
const buffers = await Promise.all(
  frames.map((f) =>
    sharp(join(captureDir, f)).resize({ width: GIF_WIDTH }).png().toBuffer(),
  ),
);
const gif = await sharp(buffers, { join: { animated: true } })
  .gif({ delay: frames.map(() => 2000), loop: 0, effort: 10, colours: 128 })
  .toFile(join(root, 'assets', 'demo.gif'));
console.log(
  `demo.gif: ${frames.length} frames, ${Math.round(gif.size / 1024)} KB`,
);

// Stills for the README sections.
const STILLS = [
  'home',
  'product',
  'cart',
  'payment-result',
  'profile-shipped',
  'admin-orders',
];
const outDir = join(root, 'assets', 'screenshots');
mkdirSync(outDir, { recursive: true });
for (const still of STILLS) {
  const file = frames.find((f) => name(f) === still);
  if (!file) throw new Error(`missing capture ${still}`);
  const info = await sharp(join(captureDir, file))
    .resize({ width: 1280 })
    .webp({ quality: 82 })
    .toFile(join(outDir, `${still}.webp`));
  console.log(`screenshots/${still}.webp ${Math.round(info.size / 1024)} KB`);
}
