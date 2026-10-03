// 把 JB 外联台的客户名单加密成 public/app/outreach/leads.enc.json。
//
// 仓库是公开的：明文名单（店名、电话）绝不能进 git。进 git 的只有这个脚本产出的密文，
// 页面用同一个密码在浏览器里解开（public/app/outreach/outreach.js）。
//
// 用法：
//   node scripts/outreach-encrypt.mjs <名单>
//
// <名单> 可以是：
//   - JSON 阵列（[{ id, n, ph, ... }, ...]）
//   - Claude 做的那份 JBoutreachconsole.html（会自己抓出里面的 `var LEADS = [...]`）
//
// 密码：会问你（不显示）。要跑在脚本里就设 OUTREACH_PASSWORD 环境变量。
// 换名单或换密码都是重跑一次。换了密码，各装置上「记住」的金钥会自动失效。

import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline";

const OUT = "public/app/outreach/leads.enc.json";
const ITER = 600_000; // OWASP 2023 对 PBKDF2-SHA256 的建议值

function loadLeads(path) {
  const raw = readFileSync(path, "utf8");
  if (/\.html?$/i.test(path)) {
    const m = raw.match(/var LEADS = (\[.*?\]);\n/s);
    if (!m) throw new Error("这个 HTML 里找不到 `var LEADS = [...]`");
    return JSON.parse(m[1]);
  }
  return JSON.parse(raw);
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    rl._writeToOutput = () => {}; // 不回显输入的字
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const b64 = (buf) => Buffer.from(buf).toString("base64");

const path = process.argv[2];
if (!path) {
  console.error("用法：node scripts/outreach-encrypt.mjs <名单.json 或 JBoutreachconsole.html>");
  process.exit(1);
}

const leads = loadLeads(path);
if (!Array.isArray(leads) || !leads.length || !leads[0].id) {
  throw new Error("名单格式不对：要一个阵列，每家至少有 id");
}

let password = process.env.OUTREACH_PASSWORD;
if (!password) {
  password = await ask("设一个密码（至少 12 个字）：");
  const again = await ask("再输入一次：");
  if (password !== again) throw new Error("两次不一样");
}
if (password.length < 12) throw new Error("密码太短。名单的密文是公开的，密码是唯一的锁，至少 12 个字。");

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(leads)));

writeFileSync(OUT, JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) }) + "\n");
console.log(`已加密 ${leads.length} 家 → ${OUT}`);
