/**
 * `asset-url.mjs` 的类型声明。模块本体是 `.mjs`：Next 服务端组件与 postbuild
 * 脚本（纯 Node）必须 import 同一个文件，见该文件头部的说明。
 */

/** `/assets/x.webp` → `/assets/x.webp?v=…`。不在号码表里的原样返回。 */
export function assetUrl(path: string): string;

/**
 * 改写一段 HTML 里全部 /assets、/css、/js 引用，接上当前内容指纹。
 * `extra` 补上号码表里没有、构建后才生成的文件：{ "/css/fonts.css": "1a2b3c4d" }。
 */
export function versionAssetRefs(html: string, extra?: Record<string, string>): string;
