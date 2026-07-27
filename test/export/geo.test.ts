/**
 * 导出产物 · GEO 结构
 *
 * 这个站的流量策略建立在「被 AI 检索到并整段引用」上，靠的是两样东西：
 * 每页开头的「快速答案」块，以及结构化数据。视觉怎么改都行，这两样不能掉。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

/** 走 Next 路由渲染的核心页，见 CONTEXT.md 的「核心页」词条。 */
const CORE_PAGES = ["index.html", "about.html", "contact.html", "pricing.html"];

/** 静态导出可能生成 about.html 或 about/index.html，两种都认。 */
function findPage(files: string[], name: string): string | undefined {
  const dir = name.replace(/\.html$/, "/index.html");
  return files.find((f) => f === name) ?? files.find((f) => f === dir);
}

/** 取页面的可见文本：去掉标签与脚本，但把双语属性值算进来（它们会被切换显示）。 */
function visibleText(html: string): string {
  const stripped = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const attrs = [...stripped.matchAll(/data-lang-(?:en|cn)="([^"]*)"/g)].map((m) => m[1]);
  return (stripped.replace(/<[^>]+>/g, " ") + " " + attrs.join(" ")).replace(/\s+/g, " ");
}

function jsonLdBlocks(html: string): unknown[] {
  return [
    ...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => JSON.parse(m[1]));
}

describe("导出产物 · GEO 结构", () => {
  const x = loadExport();

  for (const name of CORE_PAGES) {
    describe(name, () => {
      it("页面存在", () => {
        expect(findPage(x.files, name), `导出目录里找不到 ${name}`).toBeDefined();
      });

      it("有「快速答案」块", () => {
        const p = findPage(x.files, name)!;
        const text = visibleText(x.read(p));
        expect(
          /快速答案|Quick answer/i.test(text),
          `${p} 里找不到「快速答案」块 —— 它是本站流量策略的核心结构，见 CONTEXT.md`,
        ).toBe(true);
      });

      it("有可解析的结构化数据，且指向同一个工作室实体", () => {
        const p = findPage(x.files, name)!;
        const blocks = jsonLdBlocks(x.read(p));
        expect(blocks.length, `${p} 没有 JSON-LD`).toBeGreaterThan(0);

        const all = JSON.stringify(blocks);
        expect(all, `${p} 的结构化数据里没有工作室实体 #business`).toContain("#business");
      });
    });
  }

  /**
   * Google 明令禁止用**页面上不可见**的内容做 FAQ 标记。
   *
   * 旧站的 about（3 个问题）与 pricing（4 个问题）踩了这个坑 —— #74 迁移时
   * 移除了那两个 FAQPage 节点。这条断言防止它被重新加回来。
   *
   * ⚠️ **范围目前只到核心页。** 全站实测：18 个页面带 FAQPage、共 88 条问题，
   * 其中 **74 条不可见**，分布在 16 个内容页（blog 37 条 + case-studies 37 条）。
   * 那是旧站遗留的缺陷，归 #82；在它修好之前全站开启会让测试一直红。
   * #82 做完后，把下面这行的 CORE_PAGES 换成 x.htmlPages。
   */
  it("核心页凡是声明了 FAQPage，每个问题都必须在页面上可见", () => {
    const offenders: string[] = [];
    const scope = CORE_PAGES.map((n) => findPage(x.files, n)).filter(
      (p): p is string => Boolean(p),
    );

    for (const page of scope) {
      const html = x.read(page);
      if (!/"@type"\s*:\s*"FAQPage"/.test(html)) continue;
      const text = visibleText(html);

      for (const block of jsonLdBlocks(html)) {
        const nodes = (block as { "@graph"?: unknown[] })["@graph"] ?? [block];
        for (const n of nodes as { "@type"?: string; mainEntity?: { name: string }[] }[]) {
          if (n["@type"] !== "FAQPage") continue;
          for (const q of n.mainEntity ?? []) {
            // 取问题开头一小段做匹配，避开标点与空白的差异
            const probe = q.name.slice(0, 12);
            if (!text.includes(probe)) offenders.push(`${page}  ✗  ${q.name}`);
          }
        }
      }
    }

    expect(
      offenders,
      `这些 FAQ 问题写进了结构化数据，但页面上找不到 —— Google 会判违规：\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });
});
