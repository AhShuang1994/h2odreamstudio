/**
 * 导出产物 · 动效
 *
 * 手感测不了，也不该测 —— 滚动惯性、揭示节奏、视差速度只能真机看，写断言
 * 说「视差感觉对」是纯浪费。这里只测**正确性**：该注入的注入了、该有的挂载点
 * 还在、不该并存的两套滚动没有并存。见 #66 的 Testing Decisions。
 *
 * 运行时的那几条（减弱动态偏好下动画确实停、幕布没把导航搞坏、移动端没被
 * 平滑滚动接管）归接缝 ②，不在这一层。
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { loadExport, OUT_DIR } from "../helpers/export";

const x = loadExport();

/** 走 Next 路由的核心页，中英各一份。与 geo.test.ts 那份**故意重复**。 */
const CORE_PAGES = [
  "index.html",
  "about.html",
  "contact.html",
  "pricing.html",
  "zh.html",
  "zh/about.html",
  "zh/contact.html",
  "zh/pricing.html",
];

/**
 * 带站点外壳的页面 —— 核心页 + 内容页。幕布覆盖的就是这些。
 *
 * 不包括：`demos/` 下 11 个样板站（是给客户看的独立成品，冻结不动，套上本站
 * 的转场反而串味）、以及 privacy / terms / xhs / wedding-* 这些还没被重构
 * 碰过的旧静态页。它们不属于「全部页面」的那个「全部」。
 */
const SHELL_PAGES = x.htmlPages.filter(
  (p) => CORE_PAGES.includes(p) || /^(zh\/)?(blog|case-studies)\//.test(p),
);

/** 页面上是否引了幕布脚本。 */
function hasCurtain(html: string): boolean {
  return /<script[^>]+src="\/js\/curtain\.js"/.test(html);
}

/** 传输时的字节数。预算是按 gzip 算的（ADR-0008），原始字节没有意义。 */
function gzipBytes(rel: string): number {
  return gzipSync(readFileSync(join(OUT_DIR, rel))).length;
}

describe("导出产物 · 动效", () => {
  describe("幕布转场", () => {
    it("脚本本身在导出目录里", () => {
      expect(x.has("js/curtain.js")).toBe(true);
    });

    /**
     * 覆盖**全部**页面，不只核心页。
     *
     * 只覆盖核心页会造成「点关于页有幕布、点 blog 白屏硬跳」的不一致，
     * 比完全没有幕布更糟 —— 所以这条断言的范围是 htmlPages，别缩回去。
     */
    it("每一个带外壳的页面都注入了幕布脚本", () => {
      expect(SHELL_PAGES.length, "带外壳的页面一个都没找到，选择器八成错了").toBeGreaterThan(30);
      const missing = SHELL_PAGES.filter((p) => !hasCurtain(x.read(p)));
      expect(
        missing,
        `这些页面没有幕布脚本，点进去会白屏硬跳：\n  ${missing.join("\n  ")}`,
      ).toEqual([]);
    });

    it("是同步脚本 —— 带着幕布到达要赶在首次绘制之前", () => {
      const deferred = SHELL_PAGES.filter((p) =>
        /<script[^>]+src="\/js\/curtain\.js"[^>]*\s(?:defer|async)/.test(x.read(p)),
      );
      expect(
        deferred,
        `这些页面把幕布脚本 defer/async 了 —— 会先闪出内容再被盖上：\n  ${deferred.join("\n  ")}`,
      ).toEqual([]);
    });

    it("脚本自己会在减弱动态偏好下让开", () => {
      expect(x.read("js/curtain.js")).toMatch(/prefers-reduced-motion/);
    });
  });

  describe("逐行揭示", () => {
    it("首页两种语言都有揭示挂载点", () => {
      for (const page of ["index.html", "zh.html"]) {
        expect(x.read(page), `${page} 上一个 data-reveal 都没有`).toMatch(
          /data-reveal="lines"/,
        );
      }
    });

    /**
     * 隐藏开关必须与摘除它的脚本成对出现。
     * 只有前者的页面 = 内容永远停在 opacity:0，比没有动效严重得多。
     */
    it("挂了隐藏开关的页面，一定也带着摘掉它的脚本", () => {
      const armed = x.htmlPages.filter((p) => x.read(p).includes("motion-armed"));
      expect(armed.length, "核心页应该都带 motion-armed").toBeGreaterThan(0);

      const orphan = armed.filter((p) => !/_next\/static\/chunks/.test(x.read(p)));
      expect(
        orphan,
        `这些页面藏了内容却没有能放出来的脚本：\n  ${orphan.join("\n  ")}`,
      ).toEqual([]);
    });
  });

  describe("平滑滚动", () => {
    it("核心页有 ScrollSmoother 要的那层包裹", () => {
      const html = x.read("index.html");
      expect(html).toMatch(/id="smooth-wrapper"/);
      expect(html).toMatch(/id="smooth-content"/);
    });

    /**
     * 浏览器原生平滑滚动与 ScrollSmoother 会抢同一个 scrollTop，表现是抖。
     * 这条挡的是「顺手把 scroll-behavior: smooth 加回来」。
     *
     * 只查核心页的样式表：内容页那套 `css/style.css` 上没有 ScrollSmoother，
     * 它的原生平滑滚动没有对手，不构成冲突。
     */
    it("核心页样式表里没有原生 scroll-behavior: smooth", () => {
      const offenders = x.files
        .filter((f) => f.startsWith("_next/") && f.endsWith(".css"))
        .filter((f) => /scroll-behavior:\s*smooth/.test(x.read(f)));
      expect(
        offenders,
        `这些样式表把原生平滑滚动加回来了，会与 ScrollSmoother 打架：\n  ${offenders.join("\n  ")}`,
      ).toEqual([]);
    });
  });

  describe("首屏预算", () => {
    /**
     * gsap + ScrollTrigger + SplitText + ScrollSmoother 加起来一百多 KB，
     * 它们必须走动态 import 落到独立 chunk 里，绝不能进首屏关键请求链。
     * 上限 200KB（gzip）来自 ADR-0008 的务实档，算的是 HTML 里直接
     * `<script src>` 引的那些 —— 运行时才拉的 chunk 不算首屏。
     */
    const LIMIT = 200 * 1024;

    for (const page of ["index.html", "zh.html"]) {
      it(`${page} 直接引用的 JS（gzip）不超过 ${LIMIT / 1024}KB`, () => {
        const local = [...x.read(page).matchAll(/<script[^>]+src="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((s) => s.startsWith("/"))
          .map((s) => s.slice(1))
          .filter((s) => x.has(s));

        const sizes = local.map((f) => [f, gzipBytes(f)] as const);
        const total = sizes.reduce((sum, [, b]) => sum + b, 0);
        const breakdown = sizes
          .map(([f, b]) => `${String(Math.round(b / 1024)).padStart(5)}KB  ${f}`)
          .join("\n  ");

        expect(total, `首屏 JS ${Math.round(total / 1024)}KB：\n  ${breakdown}`).toBeLessThanOrEqual(
          LIMIT,
        );
      });
    }

    /** gsap 那几个插件确实落在了独立 chunk 里，而不是被打进首屏。 */
    it("gsap 不在首屏直接引用的脚本里", () => {
      const local = [...x.read("index.html").matchAll(/<script[^>]+src="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((s) => s.startsWith("/_next/"))
        .map((s) => s.slice(1))
        .filter((s) => x.has(s));

      // 认 gsap 库本身，不认「ScrollTrigger」这种词 —— SiteMotion 自己的源码
      // 里就写着这些名字，拿它们当指纹会把 6KB 的挂载代码误判成整个库
      const leaked = local.filter((f) => /scrollerProxy|_gsapID/.test(x.read(f)));
      expect(
        leaked,
        `gsap 被打进了首屏脚本 —— 动态 import 八成写成静态 import 了：\n  ${leaked.join("\n  ")}`,
      ).toEqual([]);
    });
  });
});
