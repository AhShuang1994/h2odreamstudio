/**
 * 导出产物 · 技术 SEO
 *
 * 每个该收录的页面都要过的页内基本功：标题、描述、H1、viewport、图片、
 * 结构化数据、robots.txt。单独看都是小事，漏一条 GSC 就会在「体验」或
 * 「增强功能」报告里挂红，而且没人会去翻那几份报告。
 *
 * 收录入口（canonical、sitemap、hreflang、llms.txt）在 `discovery.test.ts`，
 * 地址形态在 `urls.test.ts`，这里不重复。
 */
import { describe, it, expect } from "vitest";
import { loadExport } from "../helpers/export";

/** 与 discovery.test.ts 同一份排除清单，故意重复：见那边的注释。 */
function isExcluded(file: string): boolean {
  return (
    file === "404.html" ||
    file.endsWith("/404.html") ||
    file === "xhs.html" ||
    file.startsWith("demos/") ||
    file.startsWith("app/")
  );
}

function decode(s: string): string {
  return s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

describe("导出产物 · 技术 SEO", () => {
  const x = loadExport();
  const pages = x.htmlPages.filter((f) => !isExcluded(f));
  const heads = new Map(pages.map((f) => [f, x.read(f).split("</head>")[0]]));

  /** 每页一行问题清单，集中报出来，别一条红一条地修。 */
  function check(rule: (file: string, html: string, head: string) => string | null) {
    const problems: string[] = [];
    for (const file of pages) {
      const problem = rule(file, x.read(file), heads.get(file)!);
      if (problem) problems.push(`${file}: ${problem}`);
    }
    return problems;
  }

  /**
   * 标题与描述重复，Google 会当成同一页的几份拷贝，只挑一份显示。
   * 中英两版的标题本来就不同语言，不会撞。
   */
  it("每页都有 <title> 与 meta description，且全站不重复", () => {
    const seen = { title: new Map<string, string>(), description: new Map<string, string>() };
    const problems: string[] = [];
    for (const [file, head] of heads) {
      const values = {
        title: head.match(/<title>([^<]*)<\/title>/)?.[1],
        description: head.match(/<meta name="description" content="([^"]*)"/)?.[1],
      };
      for (const key of ["title", "description"] as const) {
        const v = values[key] && decode(values[key]!);
        if (!v) problems.push(`${file}: 缺 ${key}`);
        else if (seen[key].has(v)) problems.push(`${file}: ${key} 与 ${seen[key].get(v)} 重复`);
        else seen[key].set(v, file);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /**
   * 太长的标题与描述，Google 会截断或自己改写，搜索结果里那一行就不是我们写的了。
   * 上限含结尾的站名，见 docs/seo-action-plan.md 2c。noindex 的页不进搜索结果，不算。
   *
   * 棘轮：2c 改完之前做不到 0。超长的页数只许降不许升，改完一批就把基线调低。
   * 2c 第 4 步归 0 后改成硬约束。
   */
  it("标题与描述不超过搜索结果的显示长度（棘轮）", () => {
    const LIMITS = { en: { title: 60, description: 155 }, zh: { title: 50, description: 80 } };
    const BASELINE = { title: 11, description: 22 };
    const over = { title: [] as string[], description: [] as string[] };
    for (const [file, head] of heads) {
      if (/<meta name="robots" content="[^"]*noindex/.test(head)) continue;
      const limit = LIMITS[file === "zh.html" || file.startsWith("zh/") ? "zh" : "en"];
      const values = {
        title: decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
        description: decode(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""),
      };
      for (const key of ["title", "description"] as const) {
        if (values[key].length > limit[key]) over[key].push(`${file}: ${key} ${values[key].length} > ${limit[key]}`);
      }
    }
    expect(over.title.length, over.title.join("\n")).toBeLessThanOrEqual(BASELINE.title);
    expect(over.description.length, over.description.join("\n")).toBeLessThanOrEqual(BASELINE.description);
  });

  it("每页恰好一个 <h1>", () => {
    const problems = check((_, html) => {
      const n = (html.split("</head>")[1]?.match(/<h1\b/gi) ?? []).length;
      return n === 1 ? null : `${n} 个 h1`;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /** 没有 viewport，Google 的手机版爬虫把页面当成桌面版缩小显示。 */
  it("每页都声明了字符集与 viewport", () => {
    const problems = check((_, __, head) => {
      if (!/<meta charset/i.test(head)) return "缺 <meta charset>";
      if (!/<meta name="viewport"/.test(head)) return "缺 viewport";
      return null;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("og:url 与 canonical 是同一个地址", () => {
    const problems = check((_, __, head) => {
      const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      const og = head.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
      if (!canonical) return null; // discovery.test.ts 管 canonical 在不在
      return og === canonical ? null : `og:url ${og ?? "缺"} ≠ canonical ${canonical}`;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /**
   * alt 是 Google 图片搜索与 AI 读图的唯一文字来源。宽高缺了会排版跳动，
   * 伤 CLS（Core Web Vitals 的一项）。纯装饰图写 `alt=""` 也算。
   */
  it("每张 <img> 都有 alt、width、height", () => {
    const problems = check((_, html) => {
      const bad = [...html.matchAll(/<img\b[^>]*>/gi)]
        .map((m) => m[0])
        .filter((tag) => !/\balt=/.test(tag) || !/\bwidth=/.test(tag) || !/\bheight=/.test(tag));
      return bad.length ? `${bad.length} 张图缺 alt / width / height，例如 ${bad[0]}` : null;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /** https 页面引 http 资源，浏览器会拦掉，Google 也会报「不安全」。 */
  it("没有 http:// 的资源引用", () => {
    const problems = check((_, html) => {
      const m = html.match(/<(?:img|script|link|source|iframe|video)\b[^>]*\b(?:src|href)="http:\/\/[^"]*"/i);
      return m ? m[0] : null;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /** geo.test.ts 只查 8 个核心页。坏一个括号，整页的富结果就没了。 */
  it("所有页面的 JSON-LD 都能解析", () => {
    const problems = check((_, html) => {
      for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          JSON.parse(m[1]);
        } catch (e) {
          return `JSON-LD 解析失败：${(e as Error).message}`;
        }
      }
      return null;
    });
    expect(problems, problems.join("\n")).toEqual([]);
  });

  /** Google 在搜索结果里把网址换成「首页 › 博客 › 标题」显示。 */
  it("博客与案例拆解的文章页都有面包屑，最后一层指向自己", () => {
    const articles = pages.filter(
      (f) => /^(zh\/)?(blog|case-studies)\//.test(f) && !f.endsWith("/index.html"),
    );
    expect(articles.length, "找不到文章页").toBeGreaterThanOrEqual(30);
    const problems: string[] = [];
    for (const file of articles) {
      const html = x.read(file);
      const canonical = heads.get(file)!.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      const crumb = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((m) => JSON.parse(m[1]))
        .find((b) => b["@type"] === "BreadcrumbList");
      if (!crumb) {
        problems.push(`${file}: 没有 BreadcrumbList`);
        continue;
      }
      const items = crumb.itemListElement as { item: string }[];
      if (items.length !== 3) problems.push(`${file}: 面包屑 ${items.length} 层，应为 3 层`);
      if (items.at(-1)?.item !== canonical) problems.push(`${file}: 面包屑最后一层 ≠ canonical`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  describe("robots.txt", () => {
    const robots = x.read("robots.txt");

    it("声明了 sitemap 的完整网址", () => {
      expect(robots).toContain("Sitemap: https://www.h2o-dreamer-studio.com/sitemap.xml");
    });

    /**
     * Google 要读 CSS 与 JS 才能把页面画出来。挡掉它们，Googlebot 看到的是
     * 一页没样式的文字，手机适配与版面都判不准。曾经挡过，见
     * docs/seo-lessons.md §6。
     */
    it("没有挡住页面渲染要用的样式、脚本、字体", () => {
      const blocked = ["/css/", "/js/", "/_next/", "/fonts/"].filter((dir) =>
        new RegExp(`^Disallow:\\s*${dir.replace(/\//g, "\\/")}\\s*$`, "m").test(robots),
      );
      expect(blocked, `robots.txt 挡住了：${blocked.join(", ")}`).toEqual([]);
    });

    it("没有整站 Disallow", () => {
      expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
    });
  });
});
