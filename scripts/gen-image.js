#!/usr/bin/env node
/**
 * gen-image.js — generate images with the Gemini API (Nano Banana) from a prompt.
 *
 * Talks straight to generativelanguage.googleapis.com, so it runs anywhere that
 * has network + a key: your laptop, CI, or a Claude Code cloud session. Output is
 * a full-size PNG; pipe it through dewatermark.js to resize and convert to WebP
 * before using it on the site. Recent Gemini output no longer carries the visible
 * corner watermark, and that step passes clean images through untouched, so it is
 * now mainly a resize/convert pass.
 *
 * Auth: set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment. Never pass the
 * key on the command line — it lands in your shell history and in `ps` output.
 *
 * Usage (run from the project root):
 *   GEMINI_API_KEY=... node scripts/gen-image.js "<prompt>" [options]
 *   GEMINI_API_KEY=... node scripts/gen-image.js --list-models
 *
 * Options:
 *   --out <path>    output file (default: assets/gen/<slug-of-prompt>.png)
 *   --model <id>    model to use (default: gemini-2.5-flash-image)
 *   --n <count>     generate N variants, suffixed -1, -2, ... (default: 1)
 *   --ref <path>    reference image to edit/remix; repeatable
 *   --list-models   ask the API which models can return images, then exit
 *
 * Examples:
 *   node scripts/gen-image.js "cinematic hero shot of a Malaysian beach wedding, dusk"
 *   node scripts/gen-image.js "minimal blog cover, dark, abstract" --n 3 --out assets/blog/cover.png
 *   node scripts/gen-image.js "make the sky warmer" --ref assets/blog/cover.png
 *
 * Then resize + convert for the site:
 *   node scripts/dewatermark.js assets/gen/*.png --width 1440
 */
const fs = require('fs');
const path = require('path');

const API = 'https://generativelanguage.googleapis.com/v1beta';
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// ---------- args ----------
const argv = process.argv.slice(2);
const opts = { model: 'gemini-2.5-flash-image', n: 1, refs: [] };
const words = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') opts.out = argv[++i];
  else if (a === '--model') opts.model = argv[++i];
  else if (a === '--n') opts.n = parseInt(argv[++i], 10);
  else if (a === '--ref') opts.refs.push(argv[++i]);
  else if (a === '--list-models') opts.listModels = true;
  else if (a.startsWith('--')) { console.error('Unknown option:', a); process.exit(1); }
  else words.push(a);
}
const prompt = words.join(' ').trim();

if (!KEY) {
  console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.');
  console.error('Get one at https://aistudio.google.com/apikey, then:  export GEMINI_API_KEY=...');
  process.exit(1);
}
if (!opts.listModels && !prompt) {
  console.error('Usage: node scripts/gen-image.js "<prompt>" [--out p] [--model id] [--n N] [--ref img]');
  process.exit(1);
}

// ---------- helpers ----------
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'image';
}

// The API returns errors as JSON; surface the message instead of a bare status code.
async function call(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    const msg = json?.error?.message || text.slice(0, 300);
    throw new Error(`${res.status} ${res.statusText} — ${msg}`);
  }
  return json;
}

// Model IDs move around and the docs host is not always reachable, so ask the API.
async function listModels() {
  const json = await call(`${API}/models?key=${KEY}&pageSize=200`, { method: 'GET' });
  const all = json.models || [];
  const image = all.filter(m =>
    /image/i.test(m.name) || /image/i.test(m.description || '') ||
    (m.supportedGenerationMethods || []).includes('predict'));
  console.log(`${all.length} model(s) visible to this key; ${image.length} look image-capable:\n`);
  for (const m of image) {
    console.log(`  ${m.name.replace(/^models\//, '')}`);
    if (m.displayName) console.log(`      ${m.displayName}`);
  }
  if (!image.length) console.log('  (none — the key may not have image generation enabled)');
}

async function generate(index) {
  const parts = [{ text: prompt }];
  for (const ref of opts.refs) {
    const ext = path.extname(ref).toLowerCase();
    if (!MIME[ext]) throw new Error(`unsupported reference type: ${ref}`);
    parts.push({ inlineData: { mimeType: MIME[ext], data: fs.readFileSync(ref).toString('base64') } });
  }

  const json = await call(`${API}/models/${opts.model}:generateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  const cand = json.candidates?.[0];
  const inline = cand?.content?.parts?.find(p => p.inlineData)?.inlineData;
  if (!inline) {
    // A refusal or safety block comes back as text (or no parts at all) rather than an error.
    const said = cand?.content?.parts?.find(p => p.text)?.text;
    const why = cand?.finishReason || json.promptFeedback?.blockReason;
    throw new Error(`no image returned${why ? ` (${why})` : ''}${said ? `: ${said.slice(0, 200)}` : ''}`);
  }

  const base = opts.out || path.join('assets', 'gen', `${slug(prompt)}.png`);
  const dir = path.dirname(base);
  const ext = path.extname(base) || '.png';
  const stem = path.basename(base, ext);
  const out = opts.n > 1 ? path.join(dir, `${stem}-${index + 1}${ext}`) : base;

  fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(inline.data, 'base64');
  fs.writeFileSync(out, buf);
  console.log(`  ✓ ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
}

(async () => {
  try {
    if (opts.listModels) return await listModels();
    console.log(`gemini ${opts.model}: generating ${opts.n} image(s)`);
    let ok = 0;
    for (let i = 0; i < opts.n; i++) {
      try { await generate(i); ok++; }
      catch (e) { console.error(`  ✗ variant ${i + 1}: ${e.message}`); }
    }
    if (!ok) process.exit(1);                        // nothing produced => fail the build
    console.log('\nNext (resize + WebP): node scripts/dewatermark.js <files> --width 1440');
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
})();
