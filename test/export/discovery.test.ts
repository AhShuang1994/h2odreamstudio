/**
 * 导出产物 · 收录入口（#77）
 *
 * sitemap、llms.txt、hreflang —— 三样都是「让别人找到这个站」的入口，三样
 * 都在构建期生成。生成的东西也会错，所以这里独立地重新扫一遍 `out/`，
 * 而不是复用生成器的那份清单：拿产物去对产物，才叫断言。
 *
 * llms.txt 里的地址是给 AI 的**引文地址** —— 指向 404 比不写还糟。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

const DOMAIN = "https://www.h2o-dreamer-studio.com";

/**
 * 不该出现在收录入口里的页面。
 *
 * 与 scripts/lib/exported-pages.mjs 里那份**故意重复** —— 断言不能拿被测
 * 代码的定义来判自己对不对。这三条改动时两边一起改。
 */
function isExcluded(file: string): boolean {
  return file === "404.html" || file === "xhs.html" || file.startsWith("demos/");
}

describe("导出产物 · 收录入口", () => {
  const x = loadExport();

  /** 收录范围内的页面：文件 → 它自己声明的规范地址。 */
  const canonical = new Map<string, string>();
  for (const file of x.htmlPages) {
    if (isExcluded(file)) continue;
    const m = x.read(file).split("</head>")[0].match(/<link rel="canonical" href="([^"]+)"/);
    if (m) canonical.set(file, m[1]);
  }
  const urls = new Set(canonical.values());

  /** 规范地址 → out/ 下的文件，用来判「这条地址是否可达」。 */
  const fileByUrl = new Map([...canonical].map(([file, url]) => [url, file]));

  it("每个该收录的页面都声明了 canonical", () => {
    const naked = x.htmlPages.filter((f) => !isExcluded(f) && !canonical.has(f));
    expect(naked, `这些页面没有 canonical，收录入口无从引用：${naked.join(", ")}`).toEqual([]);
  });

  describe("sitemap", () => {
    const xml = x.read("sitemap.xml");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    it("条目与实际导出的页面一一对应", () => {
      const listed = [...locs].sort();
      const expected = [...urls].sort();
      expect(listed.length, "sitemap 里有重复条目").toBe(new Set(locs).size);
      expect(listed, "sitemap 与导出的页面对不上").toEqual(expected);
    });

    it("中英两个语言树都在", () => {
      const zh = locs.filter((u) => u === `${DOMAIN}/zh` || u.startsWith(`${DOMAIN}/zh/`));
      expect(zh.length, "sitemap 里没有中文树").toBeGreaterThanOrEqual(22);
      expect(locs.length - zh.length, "sitemap 里没有英文树").toBeGreaterThanOrEqual(28);
    });

    it("没有死链 —— 每条地址都能落到一个真实文件", () => {
      const dead = locs.filter((u) => !fileByUrl.has(u));
      expect(dead, `sitemap 里这些地址没有对应文件：\n  ${dead.join("\n  ")}`).toEqual([]);
    });

    it("每条的 hreflang 与页面 head 里声明的一致", () => {
      const mismatched: string[] = [];
      for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
        const loc = /<loc>([^<]+)<\/loc>/.exec(block[1])![1];
        const inSitemap = [
          ...block[1].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g),
        ].map((m) => `${m[1]}=${m[2]}`);
        const head = x.read(fileByUrl.get(loc)!).split("</head>")[0];
        const inHead = [
          ...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi),
        ].map((m) => `${m[1]}=${m[2]}`);
        if (inSitemap.sort().join("|") !== inHead.sort().join("|")) mismatched.push(loc);
      }
      expect(
        mismatched,
        `这些页面的 hreflang 在 sitemap 与 head 里对不上：\n  ${mismatched.join("\n  ")}`,
      ).toEqual([]);
    });
  });

  describe("hreflang", () => {
    /** 每个页面声明的 hreflang。 */
    const declared = new Map<string, Record<string, string>>();
    for (const [file, url] of canonical) {
      const head = x.read(file).split("</head>")[0];
      const alt: Record<string, string> = {};
      for (const m of head.matchAll(
        /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi,
      )) {
        alt[m[1]] = m[2];
      }
      declared.set(url, alt);
    }

    it("有对偶版本的页面都声明了 hreflang", () => {
      const silent = [...urls].filter((url) => {
        const counterpart = url.startsWith(`${DOMAIN}/zh`)
          ? url.replace(`${DOMAIN}/zh`, DOMAIN) || DOMAIN
          : `${DOMAIN}/zh${url.slice(DOMAIN.length)}`;
        const hasPair = urls.has(counterpart === DOMAIN ? DOMAIN : counterpart);
        return hasPair && Object.keys(declared.get(url) ?? {}).length === 0;
      });
      expect(silent, `这些页面有另一语言的版本，却没声明 hreflang：\n  ${silent.join("\n  ")}`).toEqual(
        [],
      );
    });

    /**
     * 没有对偶版本的页面不声明 hreflang —— 这是对的，不是漏了。
     * 4 个手写服务页与隐私／条款目前只有一种语言，等它们也拆了再说。
     */
    it("声明了 hreflang 的，三条齐全、双向互指、指到的页面都存在", () => {
      const broken: string[] = [];
      for (const [url, alt] of declared) {
        if (Object.keys(alt).length === 0) continue;

        if (["en", "zh-CN", "x-default"].some((k) => !alt[k])) {
          broken.push(`${url}  ✗ 缺 hreflang（有 ${Object.keys(alt).join(", ")}）`);
          continue;
        }
        if (alt["x-default"] !== alt.en) {
          broken.push(`${url}  ✗ x-default 没指向主语言`);
        }
        for (const [tag, href] of Object.entries(alt)) {
          if (!fileByUrl.has(href)) broken.push(`${url}  ✗ ${tag} 指向不存在的 ${href}`);
        }
        // 双向：对偶页必须声明一模一样的一组地址
        const other = url === alt.en ? alt["zh-CN"] : alt.en;
        const back = declared.get(other);
        if (!back || back.en !== alt.en || back["zh-CN"] !== alt["zh-CN"]) {
          broken.push(`${url}  ✗ ${other} 没有反向指回来`);
        }
      }
      expect(broken, `hreflang 配对有问题：\n  ${broken.join("\n  ")}`).toEqual([]);
    });
  });

  describe("llms.txt", () => {
    const text = x.read("llms.txt");
    const cited = [...new Set([...text.matchAll(/https:\/\/www\.h2o-dreamer-studio\.com[^\s)]*/g)].map((m) => m[0]))];

    it("给 AI 的引文地址全部可达", () => {
      const dead = cited
        .map((u) => (u === `${DOMAIN}/` ? DOMAIN : u))
        .filter((u) => !fileByUrl.has(u));
      expect(dead, `llms.txt 里这些引文地址落不到文件上：\n  ${dead.join("\n  ")}`).toEqual([]);
    });

    it("条目与实际导出的页面一致，没有漏掉的页面", () => {
      const listed = new Set(cited.map((u) => (u === `${DOMAIN}/` ? DOMAIN : u)));
      const missing = [...urls].filter((u) => !listed.has(u));
      expect(
        missing,
        `这些页面导出了却没进 llms.txt —— AI 不会知道它们存在：\n  ${missing.join("\n  ")}`,
      ).toEqual([]);
    });

    it("中文版清单跟着中文树走", () => {
      const zh = [...urls].filter((u) => u === `${DOMAIN}/zh` || u.startsWith(`${DOMAIN}/zh/`));
      const section = text.split("## 中文版")[1] ?? "";
      const missing = zh.filter((u) => !section.includes(u));
      expect(missing, `中文版清单缺了：\n  ${missing.join("\n  ")}`).toEqual([]);
    });
  });
});
