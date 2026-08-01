/**
 * 导出产物 · 文案口径（#79）
 *
 * 两件访客能直接发现的矛盾，都靠这里守住：
 *
 * ① **人称**。全站第一人称一律用「我」—— 见 CONTEXT.md 的「我」词条。
 *    「设计到上线一人包办、不外包」是这个工作室唯一的差异化，用复数会稀释掉它。
 * ② **报价**。数字只存在 src/content/prices.json 一份，页面、结构化数据、
 *    llms.txt 都从它取值。改一个数字，全站跟着变。
 *
 * ⚠️ **范围不含内容页**（blog 与案例拆解）。它们的正文按 #65 冻结、一字不改，
 * 语言拆分（#76）之前不动。xhs.html 同样在 #65 的范围外，且它的套餐是给小红书
 * 单独打的，不参与这里的对齐。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";
import prices from "../../src/content/prices.json";

/** 走 Next 路由渲染的核心页，中英各一份，见 CONTEXT.md 的「核心页」词条。 */
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

/** 仍是手写 HTML 的服务页。价格在里面是硬编码的，只能靠断言看住（见文件末）。 */
const SERVICE_PAGES = [
  "landing-page.html",
  "shopify-migration.html",
  "wedding-basic.html",
  "wedding-premium.html",
];

/** 静态导出可能生成 about.html 或 about/index.html，两种都认。 */
function findPage(files: string[], name: string): string | undefined {
  const dir = name.replace(/\.html$/, "/index.html");
  return files.find((f) => f === name) ?? files.find((f) => f === dir);
}

/** 取页面的可见文本：去掉脚本与标签，但把双语属性值算进来（它们会被切换显示）。 */
function visibleText(html: string): string {
  const stripped = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const attrs = [...stripped.matchAll(/data-lang-(?:en|cn)="([^"]*)"/g)].map((m) => m[1]);
  return (stripped.replace(/<[^>]+>/g, " ") + " " + attrs.join(" ")).replace(/\s+/g, " ");
}

function jsonLdText(html: string): string {
  return [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .join(" ");
}

/** 第一人称复数的痕迹。中文的「我们」最要命，英文连 our / us 一起看住。 */
const PLURAL = /我们|\b(we|We|our|Our|us|Us)\b/g;

describe("导出产物 · 文案口径", () => {
  const x = loadExport();
  const pages = [...CORE_PAGES, ...SERVICE_PAGES];

  describe("人称：全站第一人称单数", () => {
    for (const name of pages) {
      it(`${name} 的正文里没有第一人称复数`, () => {
        const p = findPage(x.files, name);
        expect(p, `导出目录里找不到 ${name}`).toBeDefined();

        const hits = visibleText(x.read(p!)).match(PLURAL) ?? [];
        expect(
          hits,
          `${p} 用了第一人称复数 ${JSON.stringify([...new Set(hits)])} —— ` +
            `全站一律用「我」，见 CONTEXT.md 的「我」词条`,
        ).toEqual([]);
      });
    }

    it("结构化数据里没有第一人称复数", () => {
      const offenders = pages
        .map((n) => findPage(x.files, n))
        .filter((p): p is string => Boolean(p))
        .filter((p) => (jsonLdText(x.read(p)).match(PLURAL) ?? []).length > 0);

      expect(offenders, `这些页面的 JSON-LD 里还有第一人称复数：${offenders.join(", ")}`).toEqual(
        [],
      );
    });

    it("llms.txt 里没有第一人称复数", () => {
      const hits = x.read("llms.txt").match(PLURAL) ?? [];
      expect(hits, `llms.txt 用了 ${JSON.stringify([...new Set(hits)])}`).toEqual([]);
    });
  });

  describe("报价：只有一份数据源", () => {
    const tiers = [
      prices.starter,
      prices.basic,
      prices.standard,
      prices.shopify,
      prices.weddingStandard,
      prices.weddingPremium,
    ];

    /**
     * 首页与报价页都必须报出全部六档 —— #79 之前首页只写了落地页一档、
     * Shopify 写成「报价而定」，访客点进报价页当场发现矛盾。
     */
    for (const name of ["index.html", "pricing.html", "zh.html", "zh/pricing.html"]) {
      it(`${name} 报出的档位与报价页一致`, () => {
        const text = visibleText(x.read(findPage(x.files, name)!));
        const missing = tiers.filter((p) => !text.includes(p));
        expect(missing, `${name} 少了这几档：${missing.join(", ")}`).toEqual([]);
      });
    }

    it("首页不再把 Shopify 迁移写成「报价而定」", () => {
      for (const name of ["index.html", "zh.html"]) {
        const text = visibleText(x.read(findPage(x.files, name)!));
        expect(text, name).not.toMatch(/报价而定|Quote-based/);
      }
    });

    it("llms.txt 的手写部分就是模板 + prices.json 渲染出来的", () => {
      const template = readFileSync(join(process.cwd(), "src/content/llms.template.txt"), "utf8");
      const rendered = template
        .replace(/\{\{(\w+)\}\}/g, (_, key: keyof typeof prices) => prices[key])
        .replace(/\r\n/g, "\n")
        .trimEnd();
      // 尾部的中文版清单是从导出页面生成的（#77），归 discovery.test.ts 管
      expect(
        x.read("llms.txt").replace(/\r\n/g, "\n").startsWith(rendered),
        "llms.txt 是构建产物 —— 改 src/content/llms.template.txt 或 prices.json，别改它",
      ).toBe(true);
    });

    /**
     * 手写 HTML 的服务页还没有接进数据源（那要等它们迁进 Next 路由）。
     * 在那之前，改 prices.json 会让下面这条红 —— 逼着人一起改，而不是悄悄脱节。
     */
    const LEGACY: [string, string[]][] = [
      ["landing-page.html", [prices.starter, prices.basic, prices.standard]],
      ["shopify-migration.html", [prices.shopify]],
      ["wedding-basic.html", [prices.weddingStandard]],
      ["wedding-premium.html", [prices.weddingPremium]],
    ];

    for (const [name, expected] of LEGACY) {
      it(`${name} 写的价格与报价页一致`, () => {
        const text = visibleText(x.read(findPage(x.files, name)!));
        const missing = expected.filter((p) => !text.includes(p));
        expect(
          missing,
          `${name} 里找不到 ${missing.join(", ")} —— prices.json 改过了，` +
            `这个手写页面要跟着改（它还没接进数据源）`,
        ).toEqual([]);
      });
    }
  });
});
