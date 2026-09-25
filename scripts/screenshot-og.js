/**
 * Re-shoot the site-wide share image (og:image) from the live homepage hero.
 *
 *   node scripts/screenshot-og.js og-hero-2027.jpg
 *
 * Writes public/og/<name>, 1200x630 JPEG. The name is required and must be
 * new: WhatsApp, Facebook and the browser cache (Cloudflare keeps /og/ for a
 * year) all key the image by URL, so overwriting the current file in place would
 * keep showing the old picture for a long time. After shooting, point every
 * reference at the new file (the script prints the grep) and delete the old one.
 *
 * Why it is not a plain screenshot:
 * - The hero is scroll-driven. On load there is only the orb; the headline and
 *   the galaxy video play in as you scroll, then the copy stays pinned for a
 *   stretch before it scrolls away. We step the wheel until the copy is fully
 *   opaque and the video has nearly finished, which is that pinned stretch.
 * - Playwright's bundled Chromium has no H.264 decoder, so the hero video
 *   would never play. Edge has it, hence channel: 'msedge'.
 * - The viewport is 1600x840, the same 1.905:1 ratio as 1200x630. At 1200x630
 *   itself the pinned copy does not fit: the headline slides under the nav.
 * - Only the floating WhatsApp button is hidden. Hiding every wa.me link would
 *   take the hero's own "WhatsApp me directly" button with it.
 *
 * Requires: playwright (npm i playwright), Microsoft Edge, and sharp (installed
 * with next).
 */
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const URL = 'https://www.h2o-dreamer-studio.com/';
const VIEWPORT = { width: 1600, height: 840 };
const OUT_SIZE = { width: 1200, height: 630 };

(async () => {
  const name = process.argv[2];
  if (!name || !/^[a-z0-9-]+\.jpg$/.test(name)) {
    console.error('Usage: node scripts/screenshot-og.js <new-name>.jpg   (lowercase, e.g. og-hero-2027.jpg)');
    process.exit(1);
  }
  const out = path.resolve(__dirname, '../public/og', name);
  if (fs.existsSync(out)) {
    console.error(`${name} already exists. Pick a new name: share previews are cached by URL.`);
    process.exit(1);
  }

  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      // Shoot at 1.5x so the downscale to 1200 wide stays crisp.
      deviceScaleFactor: 1.5,
    });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    await page.evaluate(() => {
      for (const a of document.querySelectorAll("a[href*='wa.me']")) {
        for (let el = a; el && el !== document.body; el = el.parentElement) {
          if (getComputedStyle(el).position === 'fixed') {
            el.style.visibility = 'hidden';
            break;
          }
        }
      }
    });

    let state;
    for (let i = 0; i < 80; i++) {
      state = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        // Seen once mid-load: no h1 yet. Keep scrolling rather than crash.
        if (!h1) return { y: Math.round(scrollY), opacity: 0, played: 0, h1Top: null };
        const copy = [...h1.parentElement.children];
        const v = document.querySelector('video[data-hero-river]');
        return {
          y: Math.round(scrollY),
          opacity: Math.min(...copy.map((el) => Number(getComputedStyle(el).opacity))),
          played: v && v.duration ? v.currentTime / v.duration : 0,
          h1Top: Math.round(h1.getBoundingClientRect().top),
        };
      });
      if (state.opacity === 1 && state.played >= 0.95) break;
      await page.mouse.wheel(0, 50);
      await page.waitForTimeout(250);
    }
    if (state.opacity !== 1 || state.played < 0.95) {
      throw new Error(`Hero never finished revealing: ${JSON.stringify(state)}. Has the hero changed?`);
    }
    // Let the smooth scroll and the last video frame settle.
    await page.waitForTimeout(1500);

    const png = await page.screenshot({ type: 'png' });
    await sharp(png).resize(OUT_SIZE.width, OUT_SIZE.height)
      .jpeg({ quality: 85, mozjpeg: true }).toFile(out);

    console.log(`${name}  ${OUT_SIZE.width}x${OUT_SIZE.height}  ${fs.statSync(out).size} bytes`);
    console.log(`  shot at scrollY ${state.y}, headline top ${state.h1Top}px, video ${Math.round(state.played * 100)}%`);
    console.log('\nNext: open the image and check it, then repoint every reference to the old one:');
    console.log('  git grep -n "/og/og-" -- src public');
  } finally {
    await browser.close();
  }
})();
