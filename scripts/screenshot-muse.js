/**
 * Refresh the MUSE Apparel portfolio thumbnails from the live demo page.
 *
 *   node scripts/screenshot-muse.js
 *
 * Writes assets/portfolio/shopify-fashion-{desktop,mobile}.webp, which
 * shopify-migration.html references directly (no cache buster).
 *
 * Playwright only emits PNG/JPEG, so we shoot PNG and convert with ffmpeg --
 * writing PNG bytes to a .webp filename leaves a file that browsers still
 * decode but that is neither smaller nor a real WebP.
 *
 * Requires: playwright (npm i playwright) and ffmpeg on PATH.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const VIEWPORTS = [
  { suffix: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { suffix: 'mobile',  viewport: { width: 390,  height: 844 }, isMobile: true  },
];

const DEMOS = [
  { demo: '../demos/muse-apparel.html', slug: 'shopify-fashion' },
];

// The studio watermark should not sit in a portfolio thumbnail.
const HIDE = '#h2o-concept-badge{display:none!important}';

function findFfmpeg() {
  const candidates = ['ffmpeg'];

  // winget drops ffmpeg under a versioned folder, so glob rather than pin a
  // version -- a hardcoded one goes stale the first time ffmpeg updates.
  const wingetDir = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages',
    'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe');
  try {
    for (const entry of fs.readdirSync(wingetDir)) {
      candidates.push(path.join(wingetDir, entry, 'bin/ffmpeg.exe'));
    }
  } catch { /* not a winget install, PATH is the only candidate */ }

  for (const c of candidates) {
    try {
      execFileSync(c, ['-version'], { stdio: 'ignore' });
      return c;
    } catch { /* try the next one */ }
  }
  throw new Error('ffmpeg not found. Install it (winget install Gyan.FFmpeg) and reopen your shell.');
}

(async () => {
  const ffmpeg = findFfmpeg();
  const outDir = path.resolve(__dirname, '../assets/portfolio');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-shot-'));

  const browser = await chromium.launch();
  try {
    for (const { demo, slug } of DEMOS) {
      const pageUrl = 'file:///' + path.resolve(__dirname, demo).split(path.sep).join('/');

      for (const { suffix, viewport, isMobile } of VIEWPORTS) {
        const name = `${slug}-${suffix}.webp`;
        const ctx = await browser.newContext({
          viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
        await page.addStyleTag({ content: HIDE });
        await page.waitForTimeout(1500);

        const png = path.join(tmpDir, name.replace(/\.webp$/, '.png'));
        await page.screenshot({ path: png, type: 'png', fullPage: false });
        await ctx.close();

        const webp = path.join(outDir, name);
        execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', png,
          '-c:v', 'libwebp', '-quality', '82', webp]);
        console.log(`${name}  ${viewport.width}x${viewport.height}  ${fs.statSync(webp).size} bytes`);
      }
    }
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\nDone. shopify-migration.html references these directly (no cache buster).');
})();
