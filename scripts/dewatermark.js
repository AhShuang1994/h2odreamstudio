#!/usr/bin/env node
/**
 * dewatermark.js — remove the Nano Banana / Gemini corner watermark from images.
 *
 * Method (NOT cropping): finds the low-saturation grey "✦" sparkle in the
 * bottom-right, clones a clean adjacent same-row patch over it with a feathered
 * mask, then exports WebP. The full composition and aspect ratio are preserved.
 * Tuned for dark-background images; on light/busy corners it can't find the mark
 * and passes the file through unchanged (with a warning) — fails safe.
 *
 * Usage (run from the project root so sharp resolves):
 *   node scripts/dewatermark.js <image...> [options]
 *
 * Options:
 *   --width <px>    resize to this width before export (default: keep original)
 *   --quality <n>   WebP quality 1-100 (default: 82)
 *   --suffix <s>    add a suffix to the output name, e.g. --suffix -clean
 *   --keep-ext      keep the source format instead of converting to WebP
 *
 * Examples:
 *   node scripts/dewatermark.js assets/blog/foo.png
 *   node scripts/dewatermark.js assets/blog/*.png --width 1440
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- args ----------
const argv = process.argv.slice(2);
const opts = { quality: 82 };
const files = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--width') opts.width = parseInt(argv[++i], 10);
  else if (a === '--quality') opts.quality = parseInt(argv[++i], 10);
  else if (a === '--suffix') opts.suffix = argv[++i];
  else if (a === '--keep-ext') opts.keepExt = true;
  else if (a.startsWith('--')) { console.error('Unknown option:', a); process.exit(1); }
  else files.push(a);
}
if (!files.length) {
  console.error('Usage: node scripts/dewatermark.js <image...> [--width N] [--quality N] [--suffix s] [--keep-ext]');
  process.exit(1);
}

// ---------- detect the grey sparkle in the bottom-right region ----------
async function detectWatermark(buf, W, H) {
  const rx = Math.round(W * 0.62), ry = Math.round(H * 0.60); // search bottom-right ~38% x 40%
  const rw = W - rx, rh = H - ry;
  const { data, info } = await sharp(buf).extract({ left: rx, top: ry, width: rw, height: rh })
    .raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, n = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 110 && sat < 40) {              // bright + greyish == the watermark
        n++;
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
    }
  }
  if (n < 8) return null;                       // nothing watermark-like found
  const w = maxx - minx + 1, h = maxy - miny + 1;
  if (w > W * 0.14 || h > H * 0.14) return null; // too large => a real element, not the mark
  return { x: rx + minx, y: ry + miny, w, h };
}

// ---------- pick a clean (dark, low-detail) clone source to the left ----------
async function findCleanSource(buf, cover, W) {
  for (const f of [0.085, 0.12, 0.16, 0.20]) {
    const left = cover.x - Math.round(W * f);
    if (left < 0) continue;
    const { data, info } = await sharp(buf)
      .extract({ left, top: cover.y, width: cover.w, height: cover.h })
      .raw().toBuffer({ resolveWithObject: true });
    let mx = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (l > mx) mx = l;
    }
    if (mx < 95) return left;                   // clean enough to clone from
  }
  return Math.max(0, cover.x - Math.round(W * 0.12)); // fallback
}

async function removeWatermark(buf, W, H) {
  const wm = await detectWatermark(buf, W, H);
  if (!wm) return { buf, hit: false };

  const pad = Math.round(Math.max(wm.w, wm.h) * 0.6);
  const cover = { x: Math.max(0, wm.x - pad), y: Math.max(0, wm.y - pad), w: wm.w + 2 * pad, h: wm.h + 2 * pad };
  cover.w = Math.min(cover.w, W - cover.x);     // clamp to bounds
  cover.h = Math.min(cover.h, H - cover.y);

  const srcLeft = await findCleanSource(buf, cover, W);
  const inset = Math.round(cover.w * 0.08);
  const radius = Math.round(cover.w * 0.22);
  const blur = Math.max(6, Math.round(cover.w * 0.12));
  const mask = await sharp(Buffer.from(
    `<svg width="${cover.w}" height="${cover.h}"><rect x="${inset}" y="${inset}" width="${cover.w - 2 * inset}" height="${cover.h - 2 * inset}" rx="${radius}" fill="#ffffff"/></svg>`
  )).blur(blur).png().toBuffer();

  const patchRGB = await sharp(buf).extract({ left: srcLeft, top: cover.y, width: cover.w, height: cover.h }).toBuffer();
  const patch = await sharp(patchRGB).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const out = await sharp(buf).composite([{ input: patch, left: cover.x, top: cover.y }]).toBuffer();
  return { buf: out, hit: true };
}

async function run(file) {
  const buf = fs.readFileSync(file);                 // read first (avoids Windows file locks)
  const meta = await sharp(buf).metadata();
  const { buf: cleaned, hit } = await removeWatermark(buf, meta.width, meta.height);

  let pipe = sharp(cleaned);
  if (opts.width) pipe = pipe.resize({ width: opts.width });
  pipe = opts.keepExt ? pipe : pipe.webp({ quality: opts.quality });
  const finalBuf = await pipe.toBuffer();

  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  const ext = opts.keepExt ? path.extname(file) : '.webp';
  const out = path.join(dir, base + (opts.suffix || '') + ext);

  const tmp = path.join(os.tmpdir(), `dwm-${Date.now()}-${base}${ext}`);
  fs.writeFileSync(tmp, finalBuf);                   // temp + copy avoids overwrite locks
  fs.copyFileSync(tmp, out);
  fs.unlinkSync(tmp);

  const kb = (finalBuf.length / 1024).toFixed(0);
  console.log(`  ${hit ? '✓' : '•'} ${path.basename(file)} → ${path.basename(out)} (${kb}KB${hit ? '' : ', no watermark found'})`);
}

(async () => {
  console.log(`de-watermark: ${files.length} file(s)`);
  for (const f of files) {
    try { await run(f); }
    catch (e) { console.error(`  ✗ ${f}: ${e.message}`); }
  }
})();
