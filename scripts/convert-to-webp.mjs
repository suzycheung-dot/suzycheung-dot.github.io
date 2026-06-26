/**
 * Optimize images in images/ to WebP under a size budget.
 *
 * Usage:
 *   npm install
 *   npm run optimize-images
 *   npm run optimize-images -- --replace   # delete .jpg/.png after optimizing
 *
 * Options:
 *   --replace       Remove .jpg/.png after optimizing (keeps logo.png)
 *   --max-kb=N      Max file size in KB (default: 300)
 *   --quality=N     Starting WebP quality 1–100 (default: 82)
 *   --max=N         Starting max width in px (default: 1920)
 */

import sharp from 'sharp';
import { readdir, stat, unlink, writeFile, copyFile } from 'fs/promises';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const IMAGES_DIR = join(ROOT, 'images');

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const maxBytes = Number(args.find(a => a.startsWith('--max-kb='))?.split('=')[1] ?? 300) * 1024;
const startQuality = Number(args.find(a => a.startsWith('--quality='))?.split('=')[1] ?? 82);
const startMaxWidth = Number(args.find(a => a.startsWith('--max='))?.split('=')[1] ?? 1920);
const LOGO_MAX = 160;
const MIN_QUALITY = 45;
const MIN_WIDTH = 960;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

function isLogoBase(basePath) {
  return basePath.replace(/\\/g, '/').endsWith('images/logo');
}

async function encodeUnderLimit(inputPath, logo) {
  const meta = await sharp(inputPath, { failOn: 'none' }).metadata();
  let width = logo ? LOGO_MAX : Math.min(meta.width ?? startMaxWidth, startMaxWidth);
  let quality = logo ? 80 : startQuality;

  while (true) {
    const buffer = await sharp(inputPath, { failOn: 'none' })
      .rotate()
      .resize(width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (buffer.length <= maxBytes || logo) return buffer;

    if (quality > MIN_QUALITY) {
      quality -= 5;
      continue;
    }
    if (width > MIN_WIDTH) {
      width = Math.round(width * 0.85);
      quality = startQuality;
      continue;
    }
    return buffer;
  }
}

const allFiles = (await walk(IMAGES_DIR)).filter(f => IMAGE_EXT.has(extname(f).toLowerCase()));

const groups = new Map();
for (const file of allFiles) {
  const base = file.replace(/\.(jpe?g|png|webp)$/i, '');
  if (!groups.has(base)) groups.set(base, []);
  groups.get(base).push(file);
}

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const [base, files] of groups) {
  const logo = isLogoBase(relative(ROOT, base));
  const outPath = `${base}.webp`;
  const source = files.find(f => /\.(jpe?g|png)$/i.test(f)) ?? files.find(f => f.endsWith('.webp'));
  if (!source) continue;

  const existingWebp = files.find(f => f.endsWith('.webp'));
  const hasRasterSource = files.some(f => /\.(jpe?g|png)$/i.test(f));
  const overLimit = existingWebp && (await stat(existingWebp)).size > maxBytes;

  if (!logo && !overLimit && !(hasRasterSource && !existingWebp)) continue;

  const before = (await stat(source)).size;
  const buffer = await encodeUnderLimit(source, logo);
  const tempPath = join(tmpdir(), `wh-${randomBytes(8).toString('hex')}.webp`);
  await writeFile(tempPath, buffer);
  try {
    await copyFile(tempPath, outPath);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
  const after = buffer.length;

  totalBefore += before;
  totalAfter += after;
  count++;

  const pct = before ? Math.round(((before - after) / before) * 100) : 0;
  const mark = after <= maxBytes ? '✓' : '!';
  console.log(`${mark} ${relative(ROOT, source)} → ${relative(ROOT, outPath)}  ${formatBytes(before)} → ${formatBytes(after)} (−${pct}%)`);

  if (replace && !logo) {
    for (const f of files) {
      if (/\.(jpe?g|png)$/i.test(f)) {
        await unlink(f);
        console.log(`  removed ${relative(ROOT, f)}`);
      }
    }
  }
}

const over = [];
for (const file of allFiles) {
  if (!file.endsWith('.webp')) continue;
  const rel = relative(ROOT, file);
  if (isLogoBase(rel.replace(/\.webp$/i, ''))) continue;
  const size = (await stat(file)).size;
  if (size > maxBytes) over.push({ rel, size });
}

console.log('');
if (count === 0) {
  console.log(`Nothing to optimize — images already under ${Math.round(maxBytes / 1024)} KB.`);
} else {
  const pct = totalBefore ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;
  console.log(`Optimized ${count} image(s): ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (−${pct}%)`);
}

if (over.length) {
  console.log(`\nStill over ${Math.round(maxBytes / 1024)} KB:`);
  over.sort((a, b) => b.size - a.size).forEach(({ rel, size }) => console.log(`  ${rel}  ${formatBytes(size)}`));
} else {
  console.log(`\nAll images are under ${Math.round(maxBytes / 1024)} KB.`);
}
