/**
 * Refresh the Glow Seoul portfolio thumbnails from the live demo page.
 *
 *   node scripts/screenshot-beauty.js
 *
 * Writes assets/portfolio/landing-beauty-{desktop,mobile}.webp.
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

const DEMO = '../demos/glowseoul-skincare.html';
const SHOTS = [
  { name: 'landing-beauty-desktop.webp', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'landing-beauty-mobile.webp',  viewport: { width: 390,  height: 844 }, isMobile: true  },
];

// Fixed-position furniture that should not sit in a portfolio thumbnail.
const HIDE = '#h2o-concept-badge,.whatsapp-fab{display:none!important}';

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
  const pageUrl = 'file:///' + path.resolve(__dirname, DEMO).replace(/\\/g, '/');
  const outDir = path.resolve(__dirname, '../assets/portfolio');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beauty-shot-'));

  const browser = await chromium.launch();
  try {
    for (const { name, viewport, isMobile } of SHOTS) {
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
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\nDone. If index.html caches these, bump its ?v= hash (see build.js).');
})();
