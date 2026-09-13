/**
 * Refresh the CoolTech aircon portfolio thumbnails from the live demo page.
 *
 *   node scripts/screenshot-aircon.js
 *
 * Writes assets/portfolio/landing-aircon-{desktop,mobile}.webp.
 * Playwright only emits PNG/JPEG, so we shoot PNG and convert with ffmpeg --
 * writing PNG bytes to a .webp filename (what this script used to do) leaves a
 * file that browsers still decode but that is neither smaller nor a real WebP.
 *
 * Requires: playwright (npm i playwright) and ffmpeg on PATH.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const DEMO = '../demos/cooltech-aircon-v2.html';
const SHOTS = [
  { name: 'landing-aircon-desktop.webp', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'landing-aircon-mobile.webp',  viewport: { width: 390,  height: 844 }, isMobile: true  },
];

// Fixed-position furniture that should not sit in a portfolio thumbnail.
const HIDE = '#h2o-concept-badge,.whatsapp-fab{display:none!important}';

function findFfmpeg() {
  const candidates = [
    'ffmpeg',
    path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages',
      'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'),
  ];
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aircon-shot-'));

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
