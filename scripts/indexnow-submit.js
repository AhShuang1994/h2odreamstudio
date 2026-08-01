// IndexNow: submit all sitemap.xml URLs to Bing/IndexNow.
// Usage: node scripts/indexnow-submit.js            -> submit every URL in sitemap.xml
//        node scripts/indexnow-submit.js <url> ...  -> submit only the given URLs
// Run after each deploy that adds or changes pages (the key file must be live first).
// sitemap.xml is a build artifact now (scripts/gen-sitemap.mjs writes it into out/),
// so run `npm run build` first — see #77.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'www.h2o-dreamer-studio.com';
const KEY = '35645bffbcc448b6a26912b35f5d9f5b';

let urls = process.argv.slice(2);
if (urls.length === 0) {
  const sitemapPath = path.join(__dirname, '..', 'out', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('找不到 out/sitemap.xml —— 先跑 npm run build。');
    process.exit(1);
  }
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls,
});

const req = https.request(
  {
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
  },
  (res) => {
    responded = true;
    res.resume();
    console.log(`Submitted ${urls.length} URL(s) — HTTP ${res.statusCode} (200/202 = accepted)`);
    urls.forEach((u) => console.log('  ' + u));
  }
);
let responded = false;
// The API often resets the socket after responding; only report errors before the response.
req.on('error', (e) => {
  if (!responded) console.error('IndexNow submit failed:', e.message);
});
req.write(body);
req.end();
