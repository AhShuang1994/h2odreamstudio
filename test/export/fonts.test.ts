/**
 * 导出产物 · 中文字体子集
 *
 * 自托管思源黑体／宋体的子集，由 scripts/subset-fonts.mjs 生成。
 * 源字体是 17MB / 24MB 的可变字体，**不在仓库里** —— 所以生成好的 woff2
 * 必须提交进版本库，构建机没有源字体可用来重新生成。
 *
 * 见 docs/adr/0004-noto-cjk-self-hosted-subset.md。
 */
import { describe, it, expect } from "vitest";
import { loadExport, mb } from "../helpers/export";

/** 每个子集的合理体积区间（KB）。上限防止有人误把完整字体提交进来， */
/** 下限防止子集生成失败产出一个空壳。 */
const SUBSETS: { file: string; min: number; max: number }[] = [
  { file: "fonts/NotoSansSC-400.woff2", min: 30, max: 130 },
  { file: "fonts/NotoSansSC-600.woff2", min: 30, max: 130 },
  { file: "fonts/NotoSerifSC-600.woff2", min: 40, max: 160 },
];

/**
 * 字体总体积上限。
 *
 * 实测 511 字 / 3 个字重 = 230KB。票里原写的 ≤150KB 是立项时的估算，实测
 * 做不到 —— CJK 每字形约 130 字节，压到 150KB 要么砍掉 600 字重（中文会被
 * 浏览器合成粗体，很糊），要么把宋体裁成只含标题字（以后新标题用到集外的字
 * 会在标题中间掉回黑体）。两个代价都比多 80KB 大。
 *
 * 真正的约束是 ADR-0008 的首屏总重 < 800KB —— 不含字体约 146KB，加 230KB
 * 仍有充足余量。上限设 280KB 留一点文案增长空间。
 */
const MAX_FONT_BYTES = 280 * 1024;

/** OFL 第 2 条：随字体分发必须附带版权声明与许可证全文。 */
const LICENSES = [
  "fonts/OFL-NotoSansSC.txt",
  "fonts/OFL-NotoSerifSC.txt",
  "fonts/LICENSES.txt",
];

describe("导出产物 · 中文字体", () => {
  const x = loadExport();

  for (const { file, min, max } of SUBSETS) {
    it(`${file} 存在且体积在 ${min}~${max} KB`, () => {
      expect(x.has(file), `缺少字体子集 ${file}`).toBe(true);
      const kb = (x.sizes.get(file) ?? 0) / 1024;
      expect(
        kb,
        `${file} 体积 ${kb.toFixed(1)} KB 超出预期区间 —— ` +
          `过大多半是误提交了完整字体，过小多半是子集生成失败`,
      ).toBeGreaterThan(min);
      expect(kb).toBeLessThan(max);
    });
  }

  it(`字体总体积不超过 ${mb(MAX_FONT_BYTES)}`, () => {
    const total = SUBSETS.reduce((s, { file }) => s + (x.sizes.get(file) ?? 0), 0);
    expect(total, `字体合计 ${mb(total)}，超出上限`).toBeLessThanOrEqual(MAX_FONT_BYTES);
  });

  for (const file of LICENSES) {
    it(`${file} 随字体一起分发`, () => {
      expect(x.has(file), `缺少 ${file} —— OFL 第 2 条要求许可证全文可被取得`).toBe(true);
      const text = x.read(file);
      expect(text, `${file} 里没有 OFL 正文`).toContain("SIL OPEN FONT LICENSE");
      expect(text.length).toBeGreaterThan(1000);
    });
  }

  it("页脚有指向字体许可证的链接", () => {
    const home = x.read("index.html");
    expect(
      /href="\/fonts\/LICENSES\.txt"/.test(home),
      "页脚缺少字体许可证链接 —— 许可证文件存在但用户取不到，不算履行 OFL 第 2 条",
    ).toBe(true);
  });

  it("样式表里三个子集都有 @font-face，且限定在中日韩区段", () => {
    const css = x.files
      .filter((f) => f.endsWith(".css"))
      .map((f) => x.read(f))
      .join("\n");

    for (const { file } of SUBSETS) {
      expect(css, `样式表里没有引用 ${file}`).toContain(file.replace("fonts/", ""));
    }
    // unicode-range 限定中日韩：纯英文页面不该为了几个拉丁字符去下载中文字体
    const cjkRanges = (css.match(/unicode-range:[^;}]*4e00-9fff/gi) ?? []).length;
    expect(cjkRanges, "@font-face 缺少中日韩 unicode-range 限定").toBeGreaterThanOrEqual(3);
  });

  it("首页预加载了正文字重，且只预加载它", () => {
    const home = x.read("index.html");
    const preloads = [...home.matchAll(/rel="preload"[^>]*href="(\/fonts\/[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(preloads).toContain("/fonts/NotoSansSC-400.woff2");
    expect(
      preloads.length,
      `预加载了 ${preloads.length} 个字体 —— 三个挤在首屏关键路径上会拖慢 LCP，见 ADR-0008`,
    ).toBe(1);
  });
});
