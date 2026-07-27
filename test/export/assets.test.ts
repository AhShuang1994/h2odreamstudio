/**
 * 导出产物 · 资源完整性
 *
 * 这里管的是「页面引用的资源是不是真的在导出目录里」，以及「有没有把同一张图
 * 的两个版本都发出去」。这两条是资产清理（#71）最容易误伤的地方。
 */
import { describe, it, expect } from "vitest";
import { loadExport, splitPath, mb } from "../helpers/export";

const RAW_EXT = new Set([".jpg", ".jpeg", ".png"]);

/**
 * 已知缺失、已立项的引用目标 —— 只放**已经有票在跟**的，不要用它掩盖新问题。
 *
 * 这三个文件在仓库根目录存在，但重构时没有一起搬进 public/，
 * 导致 24 个静态页（8 篇 blog + 9 篇案例 + 7 个服务/法务页）在导出里
 * 完全没有样式与脚本。见 #81。修好后把这个数组清空。
 */
const KNOWN_MISSING = ["css/style.min.css", "css/case-study.css", "js/main.min.js"];

describe("导出产物 · 资源引用", () => {
  it("每个被引用的资源都真实存在（已立项的缺失除外）", () => {
    const x = loadExport();
    const missing = x.assetRefs
      .filter((r) => !x.has(r.resolved!))
      .filter((r) => !KNOWN_MISSING.includes(r.resolved!))
      .map((r) => `${r.page}  →  ${r.raw}  (${r.kind})`);

    expect(
      missing,
      `有 ${missing.length} 处引用指向不存在的文件：\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("KNOWN_MISSING 里的每一条都确实还缺着（修好了就该从清单里删掉）", () => {
    const x = loadExport();
    const stale = KNOWN_MISSING.filter((f) => x.has(f));
    expect(
      stale,
      `这些已经不缺了，请从 test/export/assets.test.ts 的 KNOWN_MISSING 里删除：\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("导出目录不是空的，且包含首页", () => {
    const x = loadExport();
    expect(x.files.length).toBeGreaterThan(50);
    expect(x.htmlPages).toContain("index.html");
  });
});

describe("导出产物 · 无冗余原图", () => {
  /**
   * 同一张图同时发 jpg/png 与 webp 两份 —— 访客只会用其中一份，另一份是纯浪费。
   *
   * ⚠️ 这是一条**棘轮**：46 是 #71 清理前的实测基线，只允许降不允许升。
   *    #71（资产瘦身）做完之后把它改成 0。
   */
  const MAX_RAW_WITH_WEBP_SIBLING = 46;

  it(`并存的原图数量不超过基线 ${MAX_RAW_WITH_WEBP_SIBLING}`, () => {
    const x = loadExport();
    const dupes: string[] = [];

    for (const f of x.files) {
      const { dir, stem, ext } = splitPath(f);
      if (!RAW_EXT.has(ext)) continue;
      // 文件名里 _ 与 - 混用过，两种都试
      const stems = new Set([stem, stem.replace(/_/g, "-"), stem.replace(/-/g, "_")]);
      for (const s of stems) {
        const sibling = dir === "." ? `${s}.webp` : `${dir}/${s}.webp`;
        if (x.has(sibling)) {
          dupes.push(`${f}  ←→  ${sibling}  (${mb(x.sizes.get(f)!)})`);
          break;
        }
      }
    }

    expect(
      dupes.length,
      `${dupes.length} 张原图与其 webp 版本并存（基线 ${MAX_RAW_WITH_WEBP_SIBLING}）：\n  ` +
        dupes.slice(0, 20).join("\n  ") +
        (dupes.length > 20 ? `\n  …还有 ${dupes.length - 20} 张` : ""),
    ).toBeLessThanOrEqual(MAX_RAW_WITH_WEBP_SIBLING);
  });
});
