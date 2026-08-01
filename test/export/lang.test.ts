/**
 * 导出产物 · 双语路由（#75）
 *
 * 英文是主语言、占据根路径；中文是附加语言、占据 `/zh`。**每个地址只渲染
 * 一种语言** —— 旧的「同页双写 + CSS 显隐」已经拆掉：隐藏的那一半量不到宽度，
 * 逐行揭示动效会直接失败，同页两套正文也不是搜索引擎推荐的做法。
 * 见 CONTEXT.md 的「主语言」词条与 docs/adr/0002-bilingual-separate-routes.md。
 *
 * 静态内容页（blog 与案例拆解）的语言拆分是 #76，不在这里。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";
import { otherLangHref, t, type Lang } from "../../src/lib/i18n";
import { hero, quickAnswer } from "../../src/content/home";
import { aboutHeader, aboutStory } from "../../src/content/about";
import { contactHeader, contactFaq } from "../../src/content/contact";
import { pricingHeader, pricingCta } from "../../src/content/pricing";
import type { Bilingual } from "../../src/content/site";

/** 核心页的中英对偶。左英右中 —— 已收录的地址归英文（ADR-0002）。 */
const PAIRS: { en: string; zh: string; probes: Bilingual[] }[] = [
  { en: "index.html", zh: "zh.html", probes: [hero.h1, quickAnswer.heading] },
  {
    en: "about.html",
    zh: "zh/about.html",
    probes: [aboutHeader.title, aboutStory.heading],
  },
  {
    en: "contact.html",
    zh: "zh/contact.html",
    probes: [contactHeader.title, contactFaq.items[0].q],
  },
  {
    en: "pricing.html",
    zh: "zh/pricing.html",
    probes: [pricingHeader.title, pricingCta.heading],
  },
];

/** 取页面的可见文本，并还原 React 转义过的实体，好跟内容层逐字比对。 */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function htmlLang(html: string): string | null {
  return html.match(/<html[^>]*\slang="([^"]*)"/)?.[1] ?? null;
}

/** hreflang 声明。Next 渲染成驼峰的 hrefLang，HTML 属性名不区分大小写。 */
function alternates(html: string): Record<string, string> {
  const head = html.split("</head>")[0];
  const out: Record<string, string> = {};
  for (const m of head.matchAll(
    /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi,
  )) {
    out[m[1]] = m[2];
  }
  return out;
}

function canonical(html: string): string | null {
  return html.split("</head>")[0].match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
}

/** 把绝对地址换算成 out/ 下的文件。目录形态取该目录的索引页。 */
function fileFor(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  if (path === "" || path === "/") return "index.html";
  const rel = path.slice(1);
  if (rel.endsWith("/")) return `${rel}index.html`;
  return rel.endsWith(".html") ? rel : `${rel}.html`;
}

describe("导出产物 · 双语路由", () => {
  const x = loadExport();

  it("核心页中英一一对应，没有孤儿", () => {
    // Next 渲染出来的页面都引用 /_next/ 下的产物；手写静态页不会。
    const rendered = x.htmlPages.filter(
      (p) => p !== "404.html" && x.read(p).includes("/_next/static"),
    );
    const expected = PAIRS.flatMap((p) => [p.en, p.zh]).sort();
    expect(
      rendered.sort(),
      "核心页多了或少了一份 —— 每个英文页必须有 /zh 下的中文对偶，反之亦然",
    ).toEqual(expected);
  });

  for (const pair of PAIRS) {
    const cases: { page: string; lang: Lang; other: Lang }[] = [
      { page: pair.en, lang: "en", other: "zh" },
      { page: pair.zh, lang: "zh", other: "en" },
    ];

    for (const { page, lang, other } of cases) {
      describe(page, () => {
        it(`根元素语言标记为 ${lang}`, () => {
          expect(x.has(page), `导出目录里找不到 ${page}`).toBe(true);
          expect(htmlLang(x.read(page))).toBe(lang);
        });

        it("正文只有本语言，没有另一种语言的内容块", () => {
          const text = visibleText(x.read(page));
          for (const probe of pair.probes) {
            expect(text, `${page} 里找不到本语言的正文：${t(probe, lang)}`).toContain(
              t(probe, lang),
            );
            expect(
              text.includes(t(probe, other)),
              `${page} 里混进了另一种语言的正文：${t(probe, other)}`,
            ).toBe(false);
          }
        });

        it("旧的双语标注已完全移除", () => {
          const html = x.read(page);
          for (const marker of ['class="lang-cn"', 'class="lang-en"', "data-lang="]) {
            expect(html.includes(marker), `${page} 里还留着旧双语方案的 ${marker}`).toBe(
              false,
            );
          }
        });

        it("canonical 指向自己", () => {
          expect(fileFor(canonical(x.read(page))!)).toBe(page);
        });

        it("hreflang 双向互指，且指到的文件真的存在", () => {
          const alt = alternates(x.read(page));
          expect(Object.keys(alt).sort()).toEqual(["en", "x-default", "zh-CN"]);
          expect(fileFor(alt.en)).toBe(pair.en);
          expect(fileFor(alt["zh-CN"])).toBe(pair.zh);
          expect(fileFor(alt["x-default"]), "x-default 应指向主语言").toBe(pair.en);

          for (const [tag, url] of Object.entries(alt)) {
            expect(x.has(fileFor(url)), `hreflang="${tag}" 指向的 ${url} 没有对应文件`).toBe(
              true,
            );
          }

          // 对偶页必须指回来 —— 单向声明的 hreflang 会被搜索引擎忽略
          const back = alternates(x.read(page === pair.en ? pair.zh : pair.en));
          expect(back.en).toBe(alt.en);
          expect(back["zh-CN"]).toBe(alt["zh-CN"]);
        });
      });
    }
  }

  it("语言切换指向当前页面的另一语言版本，不是回首页", () => {
    // 切换是客户端组件按 pathname 算的，这里锁住那条纯函数的行为
    expect(otherLangHref("/about", "en")).toBe("/zh/about");
    expect(otherLangHref("/zh/about", "zh")).toBe("/about");
    expect(otherLangHref("/", "en")).toBe("/zh");
    expect(otherLangHref("/zh", "zh")).toBe("/");
    expect(otherLangHref("/zh/pricing", "zh")).toBe("/pricing");
  });
});
