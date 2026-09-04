/**
 * 内容页的字体表 —— 构建后运行（#94）。
 *
 * 核心页的拉丁字体由 `next/font` 在构建期下载并自托管，文件名带内容哈希
 * （`out/_next/static/media/xxxx.woff2`），每次构建都可能变。静态内容页是构建
 * **之前**就写好的 HTML，拿不到那些路径 —— 手写死一次，下次构建就 404。
 *
 * 所以这里反过来做：构建完之后，把 Next 产出的样式表里的 `@font-face` 与
 * `--font-inter` 原样抄进一个地址固定的 `out/css/fonts.css`，内容页只认这一个
 * 地址。哈希怎么变都不关内容页的事。
 *
 * 抄的是**全部** `@font-face`，不只是 Inter：三个思源子集也在同一张表里
 * （它们由 `src/app/globals.css` 声明，路径本来就稳定，但抄过来就少一处
 * 「两边各写一份、迟早漂移」）。
 *
 * ⚠️ 这个脚本不发明任何字体栈。栈写在 `public/css/style.css` 的
 * `--font-display` / `--font-body` 里，那才是内容页的入口。
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "out");
const NEXT_CSS = join(OUT, "_next/static/css");
const TARGET = join(OUT, "css/fonts.css");

/** Next 产出的全部样式表，接成一份。 */
function nextCss() {
  const files = readdirSync(NEXT_CSS).filter((f) => f.endsWith(".css"));
  if (files.length === 0) {
    throw new Error(`${NEXT_CSS} 下没有样式表 —— 这个脚本必须跑在 next build 之后`);
  }
  return files.map((f) => readFileSync(join(NEXT_CSS, f), "utf8")).join("\n");
}

function main() {
  const css = nextCss();

  const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  // 实际是 11 条：思源 3 个子集 + Inter 的 7 段 unicode-range + 1 条 Inter Fallback。
  // 下限设 8 只为挡住「一条都没抄到」这种明显失败，不锁死具体条数 ——
  // Google 改一次 Inter 的分段就会变。
  if (faces.length < 8) {
    throw new Error(
      `只抄到 ${faces.length} 条 @font-face，太少了 —— ` +
        `多半是 Next 换了样式表的写法，去看 ${NEXT_CSS} 里到底长什么样`,
    );
  }

  const inter = /--font-inter:\s*([^;}]+)/.exec(css)?.[1]?.trim();
  if (!inter) {
    throw new Error(
      "样式表里找不到 --font-inter —— 它由 src/components/Shell.tsx 的 next/font 声明，" +
        "变量名改了就要同步改这里",
    );
  }

  const out =
    `/* 由 scripts/gen-content-fonts.mjs 在构建后生成，**不要手改**。\n` +
    `   源头是 next/font 与 src/app/globals.css，见 #94 与 ADR-0004。 */\n\n` +
    `:root { --font-inter: ${inter}; }\n\n` +
    `${faces.join("\n\n")}\n`;

  mkdirSync(join(OUT, "css"), { recursive: true });
  writeFileSync(TARGET, out, "utf8");
  console.log(
    `gen-content-fonts: out/css/fonts.css ← ${faces.length} 条 @font-face + --font-inter`,
  );
}

main();
