/**
 * 导出产物 · 资源完整性
 *
 * 这里管的是「页面引用的资源是不是真的在导出目录里」，以及「有没有把同一张图
 * 的两个版本都发出去」。这两条是资产清理（#71）最容易误伤的地方。
 */
import { describe, it, expect } from "vitest";
import { loadExport, splitPath, mb } from "../helpers/export";

const RAW_EXT = new Set([".jpg", ".jpeg", ".png"]);

describe("导出产物 · 资源引用", () => {
  // 曾经这里有一份 KNOWN_MISSING 允许清单，收着 css/style.min.css、
  // css/case-study.css、js/main.min.js —— 它们在仓库根目录存在却没搬进 public/，
  // 害 24 个静态页在导出里完全没有样式。#81 把 css/ 与 js/ 移进 public/ 之后清单清空。
  // 需要再次使用允许清单时，务必同时补一条反向断言（见 test/README.md）。
  it("每个被引用的资源都真实存在", () => {
    const x = loadExport();
    const missing = x.assetRefs
      .filter((r) => !x.has(r.resolved!))
      .map((r) => `${r.page}  →  ${r.raw}  (${r.kind})`);

    expect(
      missing,
      `有 ${missing.length} 处引用指向不存在的文件：\n  ${missing.join("\n  ")}`,
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
   * #71 已清零。这条从棘轮转为硬约束 —— 再出现一对就是有人把原图提交回来了。
   */
  const MAX_RAW_WITH_WEBP_SIBLING = 0;

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
