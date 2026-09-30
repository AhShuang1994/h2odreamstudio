/**
 * 导出产物 · 图说（alt）跟页面同一种语言
 *
 * 内容页的英文版是从中文原稿塌出来的，原先只换正文、不换 `alt`：英文博客与
 * 案例页挂着 35 条中文图说，中文服务页挂着 24 条英文图说。搜索引擎读图靠
 * alt，语言对不上等于没写。原稿现在写 `data-alt-en` / `data-alt-cn`，由
 * `src/lib/content/html.mjs` 的 `pickAlt` 挑。
 *
 * `/demos/` 与 `/app/` 不在这里：前者 robots 不让进，后者是 Access 后面的自用页。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

const CJK = /[一-鿿]/;

const x = loadExport();
const pages = x.htmlPages.filter((p) => !/^(demos|app)\//.test(p));

function htmlLang(html: string): string | null {
  return html.match(/<html[^>]*\slang="([^"]*)"/)?.[1] ?? null;
}

describe("导出产物 · 图说语言", () => {
  it("有页面可查", () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it("英文页的 alt 没有中文，中文页有字的 alt 都带中文", () => {
    const wrong: string[] = [];
    for (const page of pages) {
      const html = x.read(page);
      const zh = htmlLang(html)?.startsWith("zh");
      for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
        const alt = /\salt="([^"]*)"/.exec(tag)?.[1];
        if (!alt) continue; // 空 alt 是装饰图，本来就该空
        if (zh !== CJK.test(alt)) wrong.push(`${page}: ${alt.slice(0, 60)}`);
      }
    }
    expect(wrong, "这些图说跟页面语言对不上").toEqual([]);
  });

  it("双语图说属性已完全移除", () => {
    const left = pages.filter((p) => /data-alt-(?:en|cn)=/.test(x.read(p)));
    expect(left).toEqual([]);
  });
});
