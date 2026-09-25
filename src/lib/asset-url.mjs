/**
 * 给 /assets、/css、/js 下的静态资源加版本号：`/assets/x.webp?v=1a2b3c4d`。
 *
 * Cloudflare 让浏览器把这些文件缓存一年。网址不变、内容变了，老访客就一直看
 * 旧的；加上内容指纹，文件一改网址就跟着变。号码表由
 * `scripts/gen-asset-versions.mjs` 在构建前生成。
 *
 * **写成 `.mjs` 而不是 `.ts` 是刻意的**：Next 的服务端组件与 postbuild 脚本
 * （纯 Node）要对同一个引用给出逐字相同的结果，理由同 `content/html.mjs`。
 * 类型见同目录的 `asset-url.d.mts`。
 *
 * 只在服务端用。号码表有全站资源的条目，import 进客户端组件会整张打进 JS 包：
 * 客户端组件要的地址，由服务端父组件算好当 props 传下去。
 */
import versions from "../generated/asset-versions.json" with { type: "json" };

/** `/assets/x.webp` → `/assets/x.webp?v=…`。不在表里的（站外、页面、字体）原样返回。 */
export function assetUrl(path) {
  const v = versions[path];
  return v ? `${path}?v=${v}` : path;
}

// 引用前面必须是引号、括号、等号，或 srcset 的「逗号 + 空白」：
// `https://…/assets/og.webp` 这种完整网址前面是域名，不匹配。og:image 与 JSON-LD
// 里的完整网址不加版本号，与老 build.js 同一条规矩（社交平台的爬虫未必认
// query string）。正文里空格后面提到的路径也不匹配。后面已经带着别的 query 的
// 不动，免得拼出两个 `?`。
const REF_RE = /(?<=["'(=]|,\s*)((?:\.\.\/)+|\/)?((?:assets|css|js)\/[^"'()\s,?#]+)(\?v=[\w-]+)?(?![?&])/g;

/**
 * 改写一段 HTML 里的资源引用：`src`、`srcset`、`href`、`poster`、`url(...)` 都算。
 * 相对写法（`../assets/…`）保留原样的前缀，只在后面接版本号：这些目录都只在
 * 站点根下有一份，不需要按页面位置解析。已有的 `?v=` 会被换成当前指纹。
 *
 * `extra` 补上号码表里没有、构建后才生成的文件（如 `/css/fonts.css`）。
 */
export function versionAssetRefs(html, extra = {}) {
  return html.replace(REF_RE, (match, prefix = "", path) => {
    const v = extra[`/${path}`] ?? versions[`/${path}`];
    return v ? `${prefix}${path}?v=${v}` : match;
  });
}
