/**
 * 导出产物 · 资源版本号
 *
 * Cloudflare 让浏览器把 /assets、/css、/js 缓存一年。引用不带内容指纹，换了
 * 内容的文件就会在老访客那里卡一整年：迁进 Next 之后老 build.js 不在构建链里，
 * Glow Seoul 与 MUSE 的缩图就这样卡住过。见 `src/lib/asset-url.mjs`。
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

const VERSIONED = /^(assets|css|js)\//;

function md5(rel: string): string {
  const x = loadExport();
  return createHash("md5").update(readFileSync(join(x.root, rel))).digest("hex").slice(0, 8);
}

describe("导出产物 · 资源版本号", () => {
  it("页面引用的 /assets、/css、/js 都带着当前内容指纹", () => {
    const x = loadExport();
    const wrong = x.assetRefs
      .filter((r) => r.page.endsWith(".html"))
      // app/ 是自带 service worker 的 PWA，自己管缓存
      .filter((r) => !r.page.startsWith("app/"))
      .filter((r) => VERSIONED.test(r.resolved!) && x.has(r.resolved!))
      .filter((r) => !r.raw.endsWith(`?v=${md5(r.resolved!)}`))
      .map((r) => `${r.page}  →  ${r.raw}`);

    expect(
      wrong,
      `有 ${wrong.length} 处引用没带（或带错）版本号：\n  ${wrong.slice(0, 30).join("\n  ")}`,
    ).toEqual([]);
  });

  it("版本号表没有被打进客户端 JS 包", () => {
    const x = loadExport();
    // 号码表整张进包时，里面会出现「"/assets/…": "8 位十六进制"」这种条目
    const leaked = x.files
      .filter((f) => f.startsWith("_next/static/") && f.endsWith(".js"))
      .filter((f) => /"\/(assets|css|js)\/[^"]+":"[0-9a-f]{8}"/.test(x.read(f)));

    expect(leaked, `号码表出现在这些客户端包里：\n  ${leaked.join("\n  ")}`).toEqual([]);
  });
});
