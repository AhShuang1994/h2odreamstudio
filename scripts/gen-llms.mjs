/**
 * 由 src/content/llms.template.txt 渲染出 public/llms.txt。
 *
 * 模板里的 {{starter}} 一类占位符从 src/content/prices.json 取值 —— 那是报价的
 * 唯一真相，页面与结构化数据走的是同一份。这样改一个价格数字，llms.txt 会跟着
 * 变，不会悄悄脱节（#79）。
 *
 * 由 package.json 的 prebuild 钩子在每次 build 前跑，不需要手动执行。
 * ⚠️ 不要手改 public/llms.txt —— 改模板。test/export/pricing.test.ts 会拦手改。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const prices = JSON.parse(readFileSync(join(root, "src/content/prices.json"), "utf8"));
const template = readFileSync(join(root, "src/content/llms.template.txt"), "utf8");

const missing = [];
const rendered = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  if (typeof prices[key] !== "string" || key.startsWith("$")) {
    missing.push(key);
    return match;
  }
  return prices[key];
});

if (missing.length > 0) {
  console.error(`gen-llms: prices.json 里没有这些占位符：${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}

writeFileSync(join(root, "public/llms.txt"), rendered, "utf8");
console.log("gen-llms: public/llms.txt ← llms.template.txt + prices.json");
