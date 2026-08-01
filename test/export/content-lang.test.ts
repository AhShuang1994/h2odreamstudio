/**
 * 导出产物 · 内容页语言拆分（#76）
 *
 * blog 与案例拆解由 `scripts/split-content-lang.mjs` 从 `src/content/pages/`
 * 下的双语原稿生成两份单语页面：英文**沿用已收录的原地址**，中文落在 `/zh`
 * 下的对应地址。那批英文地址同时是 llms.txt 给 AI 的引文地址，一个字都不能动。
 *
 * 正文一字不改 —— 两份输出的文本逐字来自原稿的两个标注。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

const SRC = join(process.cwd(), "src/content/pages");

/** 原稿目录 → 相对路径列表，如 `blog/index.html`。 */
const SOURCES = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    readdirSync(join(SRC, d.name))
      .filter((f) => f.endsWith(".html"))
      .map((f) => `${d.name}/${f}`),
  )
  .sort();

/** 汉字。英文页里只允许语言切换按钮上的「中文」两个字。 */
const CJK = /[一-鿿]/g;

/** 去标签、还原实体、压空白 —— 用来把标注值与渲染结果放在同一个尺度上比。 */
function plainText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function bodyText(html: string): string {
  return html
    .split("</head>")[1]
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function htmlLang(html: string): string | null {
  return html.match(/<html[^>]*\slang="([^"]*)"/)?.[1] ?? null;
}

function headLinks(html: string, rel: string): Record<string, string> {
  const head = html.split("</head>")[0];
  const out: Record<string, string> = {};
  const canonical = head.match(/<link rel="canonical" href="([^"]+)"/);
  if (canonical) out.canonical = canonical[1];
  for (const m of head.matchAll(
    /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi,
  )) {
    out[m[1]] = m[2];
  }
  return out;
}

/** 绝对地址 → out/ 下的文件。目录形态取索引页。 */
function fileFor(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  const rel = path.slice(1);
  return rel.endsWith("/") ? `${rel}index.html` : rel;
}

/** 一个原稿对应的两份产物与它们的规范地址。 */
function pair(rel: string) {
  const path = rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
  return {
    en: { file: rel, url: `https://www.h2o-dreamer-studio.com/${path}` },
    zh: { file: `zh/${rel}`, url: `https://www.h2o-dreamer-studio.com/zh/${path}` },
  };
}

describe("导出产物 · 内容页语言拆分", () => {
  const x = loadExport();

  it("原稿都还在，且不会被当成页面发布出去", () => {
    expect(SOURCES.length, "src/content/pages/ 下找不到双语原稿").toBeGreaterThanOrEqual(
      18,
    );
    for (const rel of SOURCES) {
      const source = readFileSync(join(SRC, rel), "utf8");
      expect(source, `${rel} 不再是双语原稿 —— 别把生成结果写回原稿`).toContain(
        "data-lang-en=",
      );
    }
  });

  it("每个原稿都产出中英两份，一一对应没有孤儿", () => {
    const expected = SOURCES.flatMap((rel) => [pair(rel).en.file, pair(rel).zh.file]).sort();
    const actual = x.htmlPages
      .filter((p) => /^(zh\/)?(blog|case-studies)\//.test(p))
      .sort();
    expect(actual, "内容页的中英配对不完整").toEqual(expected);
  });

  for (const rel of SOURCES) {
    const p = pair(rel);

    describe(rel, () => {
      it("英文版的地址与拆分前完全一致", () => {
        expect(x.has(p.en.file), `${p.en.file} 不见了 —— 这是已收录的地址`).toBe(true);
      });

      it("英文版只有英文，中文版只有中文", () => {
        const en = bodyText(x.read(p.en.file));
        // 语言切换按钮上的「中文」是标签不是正文，允许留着
        const strays = (en.match(CJK) ?? []).join("").replace(/中文/g, "");
        expect(strays, `${p.en.file} 正文里混着中文：${strays.slice(0, 40)}`).toBe("");

        const zh = bodyText(x.read(p.zh.file));
        expect((zh.match(CJK) ?? []).length, `${p.zh.file} 正文里没有中文`).toBeGreaterThan(
          20,
        );
      });

      /** 正文一字不改：原稿里每一段标注，都要逐字出现在对应语言的产物里。 */
      it("两份产物的正文与原稿逐字一致", () => {
        const source = readFileSync(join(SRC, rel), "utf8");
        for (const [attr, file] of [
          ["data-lang-en", p.en.file],
          ["data-lang-cn", p.zh.file],
        ] as const) {
          const rendered = plainText(x.read(file));
          const missing = [...source.matchAll(new RegExp(`${attr}="([^"]*)"`, "g"))]
            .map((m) => plainText(m[1]))
            .filter((t) => t && !rendered.includes(t));
          expect(
            missing,
            `${file} 弄丢了原稿里的 ${missing.length} 段文字：\n  ` +
              missing.slice(0, 3).join("\n  "),
          ).toEqual([]);
        }
      });

      it("根元素语言标记与正文一致", () => {
        expect(htmlLang(x.read(p.en.file))).toBe("en");
        expect(htmlLang(x.read(p.zh.file))).toBe("zh");
      });

      it("双语标注属性已完全移除", () => {
        for (const file of [p.en.file, p.zh.file]) {
          expect(
            /data-lang-(?:en|cn)=/.test(x.read(file)),
            `${file} 里还留着旧双语方案的标注属性`,
          ).toBe(false);
        }
      });

      it("canonical 指向自己，hreflang 双向互指且文件存在", () => {
        for (const [lang, self] of [
          ["en", p.en],
          ["zh", p.zh],
        ] as const) {
          const links = headLinks(x.read(self.file), rel);
          expect(links.canonical, `${self.file} 的 canonical 不对`).toBe(self.url);
          expect(links.en).toBe(p.en.url);
          expect(links["zh-CN"]).toBe(p.zh.url);
          expect(links["x-default"], "x-default 应指向主语言").toBe(p.en.url);
          for (const [tag, url] of Object.entries(links)) {
            expect(x.has(fileFor(url)), `${self.file} 的 ${tag} 指向的 ${url} 没有文件`).toBe(
              true,
            );
          }
        }
      });

      it("语言切换指向对应语言的同一篇，不是回首页", () => {
        const toggle = (file: string) =>
          x.read(file).match(/<a class="lang-toggle"[^>]*href="([^"]+)"/)?.[1];
        expect(toggle(p.en.file)).toBe(p.zh.url.replace(/^https?:\/\/[^/]+/, ""));
        expect(toggle(p.zh.file)).toBe(p.en.url.replace(/^https?:\/\/[^/]+/, ""));
      });

      /**
       * 拆分不能弄丢原稿里有的东西。
       *
       * ⚠️ 是「保留」不是「必须有」：18 篇里有 9 篇原稿本来就没有「快速答案」
       * 块（两个索引页 + 7 篇案例拆解）。补齐它们是内容工作，不归这张票。
       */
      it("原稿里有的「快速答案」块与结构化数据，两份产物都还在", () => {
        const source = readFileSync(join(SRC, rel), "utf8");
        const wantsQuickAnswer = /Quick answer|快速答案/i.test(source);
        // 原稿里的块都要保下来，再加上从可见问答生成的那一个 FAQPage（#82）
        const sourceBlocks =
          (source.match(/application\/ld\+json/g)?.length ?? 0) +
          (/class="faq-item"/.test(source) ? 1 : 0);

        for (const file of [p.en.file, p.zh.file]) {
          const html = x.read(file);
          expect(
            /Quick answer|快速答案/i.test(html),
            `${file} 丢了「快速答案」块 —— 它是本站流量策略的核心结构`,
          ).toBe(wantsQuickAnswer);

          const blocks = [
            ...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
          ];
          expect(blocks.length, `${file} 的结构化数据块数与原稿对不上`).toBe(sourceBlocks);
          for (const b of blocks) expect(() => JSON.parse(b[1])).not.toThrow();
        }
      });
    });
  }
});
