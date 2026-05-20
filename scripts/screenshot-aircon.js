const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const pagePath = 'file:///' + path.resolve(__dirname, '../demos/cooltech-aircon.html').replace(/\\/g, '/');
  const outDir = path.resolve(__dirname, '../assets/portfolio');

  const browser = await chromium.launch();

  // Desktop screenshot (1440x900)
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(pagePath, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({
    path: path.join(outDir, 'landing-aircon-desktop.webp'),
    type: 'png',
    fullPage: false
  });
  console.log('Desktop screenshot saved');

  // Mobile screenshot (390x844 iPhone 14 Pro)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(pagePath, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({
    path: path.join(outDir, 'landing-aircon-mobile.webp'),
    type: 'png',
    fullPage: false
  });
  console.log('Mobile screenshot saved');

  await browser.close();
  console.log('Done');
})();
