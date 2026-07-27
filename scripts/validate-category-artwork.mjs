import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('packages/ui/src/assets/category-presets');
const stems = [
  'location-apartment', 'location-room', 'location-floor', 'location-outdoor', 'location-garage',
  'container-cabinet', 'container-drawer', 'container-box', 'container-shelf', 'container-fridge', 'container-bag',
  'item-digital', 'item-clothing', 'item-books', 'item-kitchen', 'item-appliances', 'item-tools', 'item-cleaning',
  'item-health', 'item-toys', 'item-valuables',
];

const failures = [];
const hashes = new Set();

for (const stem of stems) {
  for (const [extension, limit] of [['png', 300_000], ['webp', 120_000]]) {
    const file = path.join(root, `${stem}.${extension}`);
    const buffer = await fs.readFile(file);
    const metadata = await sharp(buffer).metadata();
    if (metadata.width !== 512 || metadata.height !== 512) {
      failures.push(`${stem}.${extension}: expected 512×512, got ${metadata.width}×${metadata.height}`);
    }
    if (!metadata.hasAlpha) {
      failures.push(`${stem}.${extension}: missing alpha channel`);
    }
    if (buffer.byteLength > limit) {
      failures.push(`${stem}.${extension}: ${buffer.byteLength} bytes exceeds ${limit}`);
    }
    hashes.add(createHash('sha256').update(buffer).digest('hex'));
  }

  const { data, info } = await sharp(path.join(root, `${stem}.png`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let visible = 0;
  let residualMagenta = 0;
  let borderVisible = 0;
  let borderPixels = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const pixel = index / info.channels;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    if (alpha > 8) visible += 1;
    if (alpha > 32 && Math.min(red, blue) - green > 40) residualMagenta += 1;
    if (x < 4 || y < 4 || x >= info.width - 4 || y >= info.height - 4) {
      borderPixels += 1;
      if (alpha > 8) borderVisible += 1;
    }
  }
  const coverage = visible / (info.width * info.height);
  if (coverage < 0.12 || coverage > 0.72) {
    failures.push(`${stem}.png: visible coverage ${(coverage * 100).toFixed(1)}% is outside 12–72%`);
  }
  if (borderVisible / borderPixels > 0.005) {
    failures.push(`${stem}.png: transparent border check failed`);
  }
  if (residualMagenta / Math.max(1, visible) > 0.0005) {
    failures.push(`${stem}.png: chroma spill check failed`);
  }
}

const expectedFileCount = stems.length * 2;
const actualFiles = (await fs.readdir(root)).filter((file) => /\.(?:png|webp)$/.test(file));
if (actualFiles.length !== expectedFileCount) {
  failures.push(`expected ${expectedFileCount} image files, found ${actualFiles.length}`);
}
if (hashes.size !== expectedFileCount) {
  failures.push('one or more generated files are byte-identical');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${expectedFileCount} category artwork files: dimensions, alpha, size, coverage, edges, and uniqueness.`);
}
