/**
 * 导出产物 · 体积预算
 *
 * 字节数是会悄悄涨的东西 —— 每一次「就多这一张图」都合理，加完就超了。
 * 这里的每条上限都对应一个具体理由，改上限之前先想清楚是不是该改的是内容。
 *
 * 运行时性能（LCP / INP / CLS）测不到这一层，归接缝 ②，见 ADR-0008。
 */
import { describe, it, expect } from "vitest";
import { loadExport, mb } from "../helpers/export";

/**
 * 导出目录总体积上限。
 *
 * #71 之前是 547MB —— 其中 511MB 是构建产物里**无人引用**的 jpg/png 原图。
 * 清理后约 34MB。上限设 40MB 留出内容增长空间；
 * 真要超了，先问「是不是又把原图提交进来了」，再考虑抬上限。
 */
const MAX_EXPORT_BYTES = 40 * 1024 * 1024;

describe("导出产物 · 体积预算", () => {
  it(`总体积不超过 ${mb(MAX_EXPORT_BYTES)}`, () => {
    const x = loadExport();
    const top = [...x.sizes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([f, s]) => `${mb(s).padStart(9)}  ${f}`);

    expect(
      x.totalBytes,
      `导出目录 ${mb(x.totalBytes)}，超出上限 ${mb(MAX_EXPORT_BYTES)}。最大的 10 个文件：\n  ` +
        top.join("\n  "),
    ).toBeLessThanOrEqual(MAX_EXPORT_BYTES);
  });

  it("没有单个文件超过 Cloudflare Pages 的 25 MiB 上限", () => {
    const LIMIT = 25 * 1024 * 1024;
    const over = [...loadExport().sizes]
      .filter(([, s]) => s > LIMIT)
      .map(([f, s]) => `${mb(s)}  ${f}`);

    expect(
      over,
      `这些文件超过 25 MiB，Cloudflare Pages 会拒绝部署：\n  ${over.join("\n  ")}`,
    ).toEqual([]);
  });

  it("文件总数没有超过 Cloudflare Pages 免费版的 20,000 个上限", () => {
    expect(loadExport().files.length).toBeLessThan(20_000);
  });
});
