/**
 * 导出产物 · 文案口径（#79）
 *
 * 两件访客能直接发现的矛盾，都靠这里守住：
 *
 * ① **人称**。全站第一人称一律用「我」：见 CONTEXT.md 的「我」词条。
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
/** 四个服务页，中英各一份，迁进 Next 路由之后才有了中文对偶版（ADR-0002）。 */
const SERVICE_SLUGS = [
  "landing-page",
  "web-design-johor-bahru",
  "shopify-migration",
  "wedding-basic",
  "wedding-premium",
];
const SERVICE_PAGES = SERVICE_SLUGS.flatMap((s) => [`${s}.html`, `zh/${s}.html`]);

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
          `${p} 用了第一人称复数 ${JSON.stringify([...new Set(hits)])}: ` +
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
     * 首页与报价页都必须报出全部六档：#79 之前首页只写了落地页一档、
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
        "llms.txt 是构建产物，改 src/content/llms.template.txt 或 prices.json，别改它",
      ).toBe(true);
    });

    /**
     * 服务页的价格**已经接进 prices.json**（迁进 Next 路由时做的），
     * 原稿里写的是 `{{starter}}` 这类占位符，构建期填。
     *
     * 这条现在守的是「填对了」，不是「有人手动同步了」。
     */
    const SERVICE_PRICES: [string, string[]][] = [
      ["landing-page", [prices.starter, prices.basic, prices.standard]],
      ["web-design-johor-bahru", [prices.starter, prices.basic, prices.standard]],
      ["shopify-migration", [prices.shopify]],
      ["wedding-basic", [prices.weddingStandard]],
      ["wedding-premium", [prices.weddingPremium]],
    ];

    for (const [slug, expected] of SERVICE_PRICES) {
      for (const name of [`${slug}.html`, `zh/${slug}.html`]) {
        it(`${name} 写的价格与报价页一致`, () => {
          const text = visibleText(x.read(findPage(x.files, name)!));
          const missing = expected.filter((p) => !text.includes(p));
          expect(
            missing,
            `${name} 里找不到 ${missing.join(", ")}：占位符没填上？` +
              `见 src/lib/content/doc.mjs 的 fillPrices()`,
          ).toEqual([]);
        });
      }
    }

    /**
     * 源级守卫：原稿里不许再出现字面价格。
     *
     * 上面那条只查得到「替换器坏了」。真正会让价格再次脱节的是有人在原稿里
     * 手写一个新价格：那样输出是对的，数据源却不知道。这条堵的是那个。
     *
     * 域名、寄存这类杂费（RM 10 / RM 40 / RM 150）不在报价单里，是允许的字面量。
     */
    it("服务页原稿里没有字面价格，只有占位符", () => {
      const tiers = Object.entries(prices)
        .filter(([k]) => k !== "$comment")
        .map(([, v]) => v as string);
      const offenders: string[] = [];
      for (const slug of SERVICE_SLUGS) {
        const src = readFileSync(join(process.cwd(), `src/content/services/${slug}.html`), "utf8");
        for (const tier of tiers) {
          if (src.includes(tier)) offenders.push(`${slug}.html 里写死了 ${tier}`);
        }
      }
      expect(
        offenders,
        `${offenders.join("、")}，改用占位符（如 {{starter}}），价格的唯一真相是 prices.json`,
      ).toEqual([]);
    });
  });
});
