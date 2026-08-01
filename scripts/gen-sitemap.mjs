/**
 * sitemap.xml —— 构建期生成（#77）。
 *
 * 原先是手写的。语言拆分之后条目从 26 条变成 50 条，手维护必然脱节 ——
 * 加一页忘了加进来，搜索引擎就永远不知道它存在。改成扫 `out/`：**页面在
 * 哪里，sitemap 里就有什么**。
 *
 * 每条同时带上 `xhtml:link` 形式的 hreflang，与页面 `<head>` 里的声明一致 ——
 * Google 的两条渠道都喂到，任一条断了另一条还在。
 *
 * 由 package.json 的 postbuild 钩子在 `next build` 之后跑，直接写进 `out/`。
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportedPages, OUT_DIR } from "./lib/exported-pages.mjs";

/** 收录优先级。中文版一律比对应的英文版低一档 —— 英文是主语言。 */
function priorityOf(page) {
  const base =
    page.path === "/" || page.path === "/zh"
      ? 1.0
      : page.section === "core"
        ? 0.8
        : page.path.endsWith("/")
          ? 0.8
          : 0.7;
  return (page.lang === "zh" ? base - 0.1 : base).toFixed(1);
}

function changefreqOf(page) {
  return page.section === "blog" ? "weekly" : "monthly";
}

function escape(url) {
  return url.replace(/&/g, "&amp;");
}

function entry(page) {
  const lines = [`    <loc>${escape(page.url)}</loc>`];

  // hreflang：中英互指 + x-default 给主语言。没有对偶版本的页面不声明。
  for (const [hreflang, href] of Object.entries(page.alternates)) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escape(href)}"/>`,
    );
  }

  if (page.lastmod) lines.push(`    <lastmod>${page.lastmod}</lastmod>`);
  lines.push(`    <changefreq>${changefreqOf(page)}</changefreq>`);
  lines.push(`    <priority>${priorityOf(page)}</priority>`);
  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

const pages = exportedPages();
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!-- 构建期生成，见 scripts/gen-sitemap.mjs。别手改：下次构建会覆盖。 -->\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
  `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  `${pages.map(entry).join("\n")}\n` +
  `</urlset>\n`;

writeFileSync(join(OUT_DIR, "sitemap.xml"), xml, "utf8");
console.log(
  `gen-sitemap: out/sitemap.xml ← ${pages.length} 个页面` +
    `（英文 ${pages.filter((p) => p.lang === "en").length} / 中文 ${
      pages.filter((p) => p.lang === "zh").length
    }）`,
);
