/**
 * 测试接缝 ① —— 构建产物。
 *
 * 这个站的绝大部分验收都能在「导出目录里有什么文件、文件里写了什么」这一层
 * 完成，不需要浏览器。这是最高的接缝，反馈是秒级的。
 *
 * 用法：在测试里 `const x = loadExport()`，然后断言 x 上的字段。
 * 加新断言时不要改这个文件的结构 —— 优先在 test/export/ 下加 it，
 * 需要新数据时在这里加一个派生字段。
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, posix, dirname, extname, basename } from "node:path";

/** 静态导出的输出目录，由 next.config.mjs 的 output:"export" 产生。 */
export const OUT_DIR = join(process.cwd(), "out");

/** 一处「页面引用了某个资源」的记录。 */
export interface AssetRef {
  /** 引用它的页面，相对 out/ 的 POSIX 路径 */
  page: string;
  /** 原始属性值，未解析 */
  raw: string;
  /** 解析后相对 out/ 的 POSIX 路径；无法解析为站内路径时为 null */
  resolved: string | null;
  /** 来自哪种属性 */
  kind: "src" | "srcset" | "href" | "poster" | "css-url";
}

export interface ExportSnapshot {
  root: string;
  /** 所有文件，相对 out/ 的 POSIX 路径 */
  files: string[];
  fileSet: Set<string>;
  sizes: Map<string, number>;
  totalBytes: number;
  /** 所有 .html 文件的路径 */
  htmlPages: string[];
  /** 全部资源引用，已去重 */
  assetRefs: AssetRef[];
  /** 文件是否存在（相对 out/ 的 POSIX 路径） */
  has(rel: string): boolean;
  /** 读文本文件 */
  read(rel: string): string;
}

// —— 内部工具 ————————————————————————————————————————————————

const TEXT_EXT = new Set([".html", ".css", ".xml", ".txt", ".json", ".js"]);

function walk(dir: string, root: string, acc: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, root, acc);
    else acc.push(posix.normalize(abs.slice(root.length + 1).split("\\").join("/")));
  }
  return acc;
}

/** 外部 / 非文件引用，不参与站内存在性检查。 */
function isExternal(v: string): boolean {
  return (
    v === "" ||
    v.startsWith("#") ||
    v.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(v) // http:, https:, data:, mailto:, tel:, javascript: …
  );
}

/** 去掉 query 与 fragment，并解码百分号转义。 */
function clean(v: string): string {
  const s = v.split("#")[0].split("?")[0].trim();
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** 把页面里的一个引用解析成相对 out/ 的路径。 */
function resolveRef(pageRel: string, raw: string): string | null {
  const v = clean(raw);
  if (!v || isExternal(v)) return null;
  const target = v.startsWith("/")
    ? posix.normalize(v.slice(1))
    : posix.normalize(posix.join(posix.dirname(pageRel), v));
  // 解析到 out/ 之外
  if (target.startsWith("..")) return null;
  // 目录形式的链接（/about/），交给 URL 形态的票去管，不在资源检查范围
  if (target === "" || target.endsWith("/")) return null;
  return target;
}

const TAG_RE = /<(img|source|script|link|video|audio|embed|track)\b([^>]*)>/gi;
const ATTR_RE = /\b(src|srcset|href|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi;
// 前置的否定断言是必需的：没有它，页面内联脚本里的 `createObjectURL(...)`
// 会被当成 CSS 的 url(...) 匹配到（实测在 demos/ 的独立页里踩过）。
const CSS_URL_RE = /(?<![\w-])url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]+))\s*\)/gi;

/** 只对**资源类**属性做存在性检查；页面之间的链接不在此列（见 ADR-0003 / #73）。 */
function extractRefs(pageRel: string, html: string): AssetRef[] {
  const out: AssetRef[] = [];
  const push = (raw: string, kind: AssetRef["kind"]) => {
    const resolved = resolveRef(pageRel, raw);
    if (resolved !== null) out.push({ page: pageRel, raw, resolved, kind });
  };

  for (const [, tag, attrs] of html.matchAll(TAG_RE)) {
    const isLink = tag.toLowerCase() === "link";
    for (const m of attrs.matchAll(ATTR_RE)) {
      const name = m[1].toLowerCase() as AssetRef["kind"];
      const value = m[3] ?? m[4] ?? "";
      // <link> 的 href 只在它指向真实资源时才算（stylesheet / icon / preload…）
      if (name === "href" && isLink && !/\brel\s*=/i.test(attrs)) continue;
      if (name === "href" && !isLink) continue; // <a href> 是页面链接，不在这里管
      if (name === "srcset") {
        for (const part of value.split(",")) {
          const url = part.trim().split(/\s+/)[0];
          if (url) push(url, "srcset");
        }
      } else {
        push(value, name);
      }
    }
  }

  for (const m of html.matchAll(CSS_URL_RE)) {
    push(m[1] ?? m[2] ?? m[3] ?? "", "css-url");
  }
  return out;
}

// —— 对外 ————————————————————————————————————————————————————

let cached: ExportSnapshot | null = null;

export function loadExport(): ExportSnapshot {
  if (cached) return cached;

  if (!existsSync(OUT_DIR)) {
    throw new Error(
      `找不到导出目录 ${OUT_DIR}。\n` +
        `这些断言跑在构建产物上 —— 先跑 \`npm run build\`，或直接用 \`npm test\`（它会先构建）。`,
    );
  }

  const files = walk(OUT_DIR, OUT_DIR, []).sort();
  const fileSet = new Set(files);
  const sizes = new Map<string, number>();
  let totalBytes = 0;
  for (const f of files) {
    const s = statSync(join(OUT_DIR, f)).size;
    sizes.set(f, s);
    totalBytes += s;
  }

  const htmlPages = files.filter((f) => f.endsWith(".html"));

  // 只读文本文件；out/ 里有几百 MB 图片，绝不整包读进内存
  const seen = new Set<string>();
  const assetRefs: AssetRef[] = [];
  for (const page of [...htmlPages, ...files.filter((f) => f.endsWith(".css"))]) {
    const text = readFileSync(join(OUT_DIR, page), "utf8");
    for (const ref of extractRefs(page, text)) {
      const key = `${ref.page}\u0000${ref.resolved}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assetRefs.push(ref);
    }
  }

  cached = {
    root: OUT_DIR,
    files,
    fileSet,
    sizes,
    totalBytes,
    htmlPages,
    assetRefs,
    has: (rel) => fileSet.has(posix.normalize(rel)),
    read: (rel) => {
      if (!TEXT_EXT.has(extname(rel))) throw new Error(`read() 只用于文本文件：${rel}`);
      return readFileSync(join(OUT_DIR, rel), "utf8");
    },
  };
  return cached;
}

/** 把 a/b/c.webp 拆成 { dir, stem, ext } —— 找同名不同扩展名的兄弟文件时用。 */
export function splitPath(rel: string) {
  const ext = extname(rel).toLowerCase();
  return { dir: posix.dirname(rel), stem: basename(rel, extname(rel)), ext };
}

export function mb(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export { dirname };
