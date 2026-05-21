const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function hash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// 1. Minify CSS and JS
console.log('Minifying CSS...');
execSync('npx clean-css-cli -o css/style.min.css css/style.css', { stdio: 'inherit' });

console.log('Minifying JS...');
execSync('npx terser js/main.js -o js/main.min.js -c -m', { stdio: 'inherit' });

// 2. Build hash map for all assets referenced in index.html
const assetDirs = ['css', 'js', 'assets', 'assets/portfolio'];
const extensions = ['.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.svg'];

const hashMap = new Map();
for (const dir of assetDirs) {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const file of fs.readdirSync(fullDir)) {
    if (!extensions.includes(path.extname(file).toLowerCase())) continue;
    const relPath = path.posix.join(dir, file);
    const h = hash(path.join(fullDir, file));
    if (h) hashMap.set(relPath, h);
  }
}

// 3. Read index.html and replace asset references
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

for (const [assetPath, h] of hashMap) {
  const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Only bust relative references — skip absolute URLs (og:image, JSON-LD, etc.)
  const regex = new RegExp(`(["'])${escaped}(\\?v=[a-f0-9]+)?(["'])`, 'g');
  html = html.replace(regex, (match, q1, _old, q2, offset) => {
    const before = html.slice(Math.max(0, offset - 80), offset);
    if (/https?:\/\//.test(before)) return match;
    return `${q1}${assetPath}?v=${h}${q2}`;
  });

  // srcset references (always relative)
  const srcsetRegex = new RegExp(`(srcset=["'][^"']*?)(${escaped})(\\?v=[a-f0-9]+)?`, 'g');
  html = html.replace(srcsetRegex, `$1$2?v=${h}`);
}

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');

console.log('\nCache-busted assets:');
for (const [p, h] of hashMap) console.log(`  ${p}?v=${h}`);
console.log('\nDone!');
