/**
 * 导出产物 · 动效
 *
 * 动效手感不进自动化 —— 滚动惯性、逐行揭示的节奏、遮罩视差的速度只能真机看。
 * 这里只放**在构建产物上就能看出对错**的两类事：动画库有没有压进首屏关键
 * 路径，以及必须早于首帧执行的内联脚本还在不在该在的位置。
 *
 * 运行时正确性（减弱动态偏好下动画确实关掉、幕布不搞坏导航）归接缝 ②。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

/** 页面里同步加载的脚本 —— 也就是计入首屏预算的那些。 */
function initialScripts(page: string): string[] {
  const html = loadExport().read(page);
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith("/"))
    .map((s) => s.slice(1));
}

const ENTRY_PAGES = ["index.html", "zh.html"];

/**
 * 幕布要覆盖的页面 = 全部导出页面，减去两类：
 *
 * - `demos/` —— 11 个虚构品牌的成品演示，不属于品牌视觉范围，冻结不动。
 *   见 CONTEXT.md 的「样板站」词条。
 * - `404.html` —— **已知缺失，#93 在跟**。两个 root layout 之间没有共同的根
 *   布局，Next 只能对未匹配路径回退到它的内建 404，那一页不经过 Shell。
 *   下面配了反向断言：#93 修好之后这里会红，提醒把这行删掉。
 */
const NOT_COVERED = (rel: string) => rel.startsWith("demos/") || rel === "404.html";
const KNOWN_MISSING = ["404.html"];

describe("导出产物 · 动效", () => {
  /**
   * ADR-0008 的三条硬要求之一：动画库按需引入，不进首屏关键路径。
   *
   * 把 `import("gsap")` 写成顶层 import 是最容易犯的省事错误 —— 一犯，
   * 47KB 的动画库就从异步 chunk 挪进首屏，预算当场少掉四分之一。
   */
  it.each(ENTRY_PAGES)("%s 的首屏脚本里没有动画库", (page) => {
    const x = loadExport();
    const guilty = initialScripts(page).filter((s) => {
      if (!x.has(s)) return false;
      // 认标识而不是认文件名。`_gsap` 是 gsap 挂在元素上的缓存属性、
      // `scrollerProxy` 是滚动触发器的公开 API —— 都是属性名，压缩器不会改。
      // 不能用 "gsap" / "SplitText" 这种词：Reveal 自己那句动态 import 里就有，
      // 而它本来就该在首屏脚本里（库本体才不该在）。
      return /_gsap|scrollerProxy/.test(x.read(s));
    });

    expect(
      guilty,
      `这些首屏脚本里打进了动画库：\n  ${guilty.join("\n  ")}\n` +
        `动画库必须走动态 import（见 src/components/Reveal.tsx），不能顶层引入。`,
    ).toEqual([]);
  });

  /**
   * 逐行揭示的预备态必须在首帧之前生效，否则标题会先亮一下再被藏起来。
   * 唯一能做到这一点的位置就是 `<head>` 里的内联脚本 —— 交给 React 就要等
   * 水合。谁要是把它挪进组件，这条会红。
   */
  it.each(ENTRY_PAGES)("%s 的揭示预备态脚本在 <body> 之前", (page) => {
    const html = loadExport().read(page);
    const armAt = html.indexOf("reveal-armed");
    const bodyAt = html.indexOf("<body");

    expect(armAt, `${page} 里找不到 reveal-armed 的内联脚本`).toBeGreaterThan(-1);
    expect(
      armAt,
      `reveal-armed 出现在 <body> 之后（${armAt} > ${bodyAt}）—— 它必须早于首帧执行`,
    ).toBeLessThan(bodyAt);
  });

  /**
   * ADR-0001：幕布覆盖**全部**页面，包括仍是静态 HTML 的内容页。只覆盖核心页
   * 会造成「点关于页有幕布、点 blog 白屏硬跳」，比完全没有更糟。
   *
   * 注入分三条路，任何一条断了这里都会红：核心页走 `Shell.tsx`、内容页走
   * `scripts/split-content-lang.mjs`、7 个独立静态页是一次性写进源文件的。
   */
  it("每个页面都注入了动效外壳", () => {
    const x = loadExport();
    const missing = x.htmlPages.filter(
      (rel) =>
        !NOT_COVERED(rel) &&
        !(x.read(rel).includes("h2od-curtain") && x.read(rel).includes("/js/motion.js")),
    );

    expect(
      missing,
      `这些页面没有动效外壳，点进去会白屏硬跳：\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("外壳本体与 Lenis 都在导出产物里", () => {
    const x = loadExport();
    expect(x.has("js/motion.js"), "缺 js/motion.js").toBe(true);
    expect(
      x.has("js/lenis.min.js"),
      "缺 js/lenis.min.js —— 它由 scripts/vendor-lenis.mjs 在 prebuild 拷进来",
    ).toBe(true);
  });

  /**
   * 已知缺失清单的反向断言（见 test/README.md 的「两条特殊约定」）：
   * 修好了却没从清单里删，同样会红 —— 不许用清单掩盖新问题。
   */
  it("已知缺失清单里的页面确实还缺着", () => {
    const x = loadExport();
    const fixed = KNOWN_MISSING.filter(
      (rel) => x.has(rel) && x.read(rel).includes("/js/motion.js"),
    );

    expect(
      fixed,
      `这些页面已经有动效外壳了，请从 KNOWN_MISSING 与 NOT_COVERED 里删掉（#93）：\n  ${fixed.join("\n  ")}`,
    ).toEqual([]);
  });
});
