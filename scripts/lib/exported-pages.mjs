/**
 * 导出目录里「该被收录的页面」清单 —— sitemap 与 llms.txt 的共同输入。
 *
 * 直接扫 `out/`，所以清单**天然**与实际导出的页面一致：加一页就自动进，
 * 删一页就自动出，没有手维护的余地（#77）。
 *
 * 地址取页面自己声明的 `<link rel="canonical">` —— 那是规范地址的定义，
 * 不用在这里猜哪些带 `.html`、哪些是目录形态（两种都是已收录的原样）。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

export const DOMAIN = "https://www.h2o-dreamer-studio.com";
export const OUT_DIR = join(process.cwd(), "out");

/**
 * 不进 sitemap 与 llms.txt 的页面。
 *
 * - `404.html` —— 错误页，也是全站唯一没有 canonical 的页面
 * - `demos/**` —— 样板站，`robots.txt` 里本来就 Disallow（见 CONTEXT.md 的
 *   「样板站」词条：11 个虚构品牌的成品演示，冻结不动）
 * - `xhs.html` —— 小红书落地页，链接印在站外、纯中文、不参与语言拆分（#65）
 * - `app/**` —— 离线小工具（小帐本 PWA），`robots.txt` 里同样 Disallow。它是
 *   装到主屏幕用的应用外壳，不是内容页：没有 canonical，也不该被当成内容收录（#98）
 */
function isExcluded(rel) {
  return (
    rel === "404.html" ||
    rel === "xhs.html" ||
    rel.startsWith("demos/") ||
    rel.startsWith("app/")
  );
}

function walk(dir, root = dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, root, acc);
    else if (entry.name.endsWith(".html")) {
      acc.push(posix.normalize(abs.slice(root.length + 1).split("\\").join("/")));
    }
  }
  return acc;
}

/** 从页面自己的结构化数据里取最后修改日期；取不到就不写 lastmod（它是可选的）。 */
function lastmodOf(html) {
  const patterns = [
    /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /<meta property="article:published_time" content="(\d{4}-\d{2}-\d{2})/,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1];
  }
  return null;
}

/** hreflang 声明，用来配对中英两版。 */
function alternatesOf(head) {
  const out = {};
  for (const m of head.matchAll(
    /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi,
  )) {
    out[m[1]] = m[2];
  }
  return out;
}

/** 收录范围内的全部页面，按地址排序。 */
export function exportedPages() {
  const pages = [];
  for (const file of walk(OUT_DIR)) {
    if (isExcluded(file)) continue;
    const html = readFileSync(join(OUT_DIR, file), "utf8");
    const head = html.split("</head>")[0];
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(head);
    if (!canonical) {
      throw new Error(`${file} 没有声明 canonical —— 收录范围内的页面必须有`);
    }
    const url = canonical[1];
    const path = url.slice(DOMAIN.length) || "/";
    pages.push({
      file,
      url,
      path,
      lang: path === "/zh" || path.startsWith("/zh/") ? "zh" : "en",
      section: /^\/(zh\/)?blog\//.test(path)
        ? "blog"
        : /^\/(zh\/)?case-studies\//.test(path)
          ? "case-studies"
          : "core",
      lastmod: lastmodOf(html),
      alternates: alternatesOf(head),
    });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}
