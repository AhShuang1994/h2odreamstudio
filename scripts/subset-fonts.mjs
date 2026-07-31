/**
 * 中文字体子集化 —— 构建期运行。
 *
 * 完整的思源黑体／宋体是 10MB 级，但这是个**文案写死在源码里的静态站**，
 * 全站实际用到的汉字只有几百个。扫出来只打这几百字的子集，两套合计 ~90KB。
 * 动态站做不到这件事，我们能。见 docs/adr/0004-noto-cjk-self-hosted-subset.md。
 *
 * 依赖 fontTools 的 pyftsubset（Python）。源字体是可变字体，先实例化到目标
 * 字重再子集化。
 *
 * 用法：node scripts/subset-fonts.mjs [--src <源字体目录>]
 * 源字体不进仓库 —— 它们是 17MB / 24MB 的可变字体，只在需要重新生成时下载。
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "fonts");

/**
 * 扫哪些文件里的中文。
 *
 * 目前只扫 src/ —— 只有 Next 渲染的核心页用这套字体。public/ 下的静态内容页
 * 仍用它们自己的字体栈，等 #66 套壳后把 "public/**\/*.html" 加进来即可。
 */
const SOURCE_GLOBS = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.css"];

/**
 * 要生成的子集。
 *
 * 字重的取舍（实测，571 字，每个字重约 76~97 KB）：
 *   - 组件里用到 font-normal(400) / font-medium(500) / font-semibold(600) 三档
 *   - **不打 500** —— 中文的 medium 与 normal 几乎无差别，浏览器会回落到 400，
 *     省下 77KB。拉丁字符走 Inter，Inter 有完整字重，不受影响。
 *   - **保留 600** —— 缺它浏览器会对中文做合成粗体，糊得很明显
 *   - 宋体只做标题用的 600
 *
 * 宋体用**全量**字符集而不是只裁标题字（那样能省 52KB）：标题字集要靠猜哪些
 * 字段算标题，以后新写的标题一旦用到集外的字，那个字会在标题中间掉回黑体 ——
 * 用 52KB 换这个风险不值。
 */
const TARGETS = [
  {
    file: "NotoSansSC[wght].ttf",
    family: "NotoSansSC",
    weights: [400, 600],
    license: "OFL-NotoSansSC.txt",
  },
  {
    file: "NotoSerifSC[wght].ttf",
    family: "NotoSerifSC",
    weights: [600],
    license: "OFL-NotoSerifSC.txt",
  },
];

/**
 * OFL 第 2 条要求随字体分发附带版权声明与许可证全文。
 *
 * 两份必须都放 —— 版权方不同：
 *   Noto Sans SC  © Adobe，**声明了 Reserved Font Name 'Source'**（它源自思源黑体）
 *   Noto Serif SC © Google，未声明 RFN
 *
 * RFN 只约束「呈现给用户的主字体名」（OFL 第 3 条原文）。我们的子集沿用
 * "Noto Sans SC" 这个名字，不含 'Source'，因此合规。若将来给子集改名，
 * 名字里不要出现 'Source'。
 */

/** 中日韩统一表意文字 + 全角标点／符号。 */
const CJK_RE = /[　-〿一-鿿＀-￯]/gu;

/** 始终包含的字符：拉丁与数字由 Inter 负责，但标点混排时需要中文字体兜底。 */
const ALWAYS = "　、。，．·；：？！…—～《》「」『』（）【】％＋－＝";

/**
 * 去掉注释后再扫。
 *
 * 源码注释里的中文**永远不会被渲染**，但会被打进字形。这个仓库的注释是中文写的，
 * 不去掉的话每写一段注释子集就胖一圈 —— 实测加了几行 CSS 注释就多出 55 个字。
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* 块注释 */ —— .ts/.tsx/.css 通用
    .replace(/(^|[^:])\/\/.*$/gm, "$1 "); // // 行注释，排除 https:// 里的双斜杠
}

function collectChars() {
  const chars = new Set(ALWAYS);
  for (const pattern of SOURCE_GLOBS) {
    for (const f of globSync(pattern, { cwd: ROOT })) {
      const text = stripComments(readFileSync(join(ROOT, f), "utf8"));
      for (const m of text.matchAll(CJK_RE)) chars.add(m[0]);
    }
  }
  return [...chars].sort();
}

function mb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  const srcArg = process.argv.indexOf("--src");
  const SRC_DIR = srcArg > -1 ? process.argv[srcArg + 1] : join(ROOT, ".fonts-src");

  const chars = collectChars();
  console.log(`扫到 ${chars.length} 个中文字符（来自 ${SOURCE_GLOBS.join(", ")}）`);

  if (!existsSync(SRC_DIR)) {
    console.error(
      `\n找不到源字体目录：${SRC_DIR}\n` +
        `源字体不进仓库（17MB + 24MB）。重新生成子集时先下载：\n` +
        `  NotoSansSC[wght].ttf   https://github.com/google/fonts/tree/main/ofl/notosanssc\n` +
        `  NotoSerifSC[wght].ttf  https://github.com/google/fonts/tree/main/ofl/notoserifsc\n` +
        `然后 node scripts/subset-fonts.mjs --src <目录>`,
    );
    process.exit(1);
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const textFile = join(OUT_DIR, ".chars.tmp");
  writeFileSync(textFile, chars.join(""), "utf8");

  let total = 0;
  const made = [];
  for (const { file, family, weights, license } of TARGETS) {
    const src = join(SRC_DIR, file);
    if (!existsSync(src)) {
      console.error(`缺少源字体：${src}`);
      process.exit(1);
    }

    // OFL 第 2 条：随字体分发必须附带许可证全文
    const licSrc = join(SRC_DIR, license);
    if (!existsSync(licSrc)) {
      console.error(`缺少许可证：${licSrc} —— OFL 第 2 条要求随字体附带全文，不能省`);
      process.exit(1);
    }
    writeFileSync(join(OUT_DIR, license), readFileSync(licSrc));

    // ── 步骤 1：先裁字。此时输出仍是可变字体，但已经从 17MB 掉到几十 KB。
    // 顺序很重要 —— 先实例化再裁字要在完整的 3 万字形上跑三遍，慢得多。
    const trimmed = join(OUT_DIR, `${family}.trimmed.ttf`);
    execFileSync(
      "pyftsubset",
      [
        src,
        `--text-file=${textFile}`,
        `--output-file=${trimmed}`,
        "--layout-features=*",
        "--no-hinting",
        "--drop-tables+=DSIG",
      ],
      { stdio: "pipe" },
    );

    for (const w of weights) {
      // ── 步骤 2：把可变轴钉死到目标字重，产出静态字体
      const static_ = join(OUT_DIR, `${family}-${w}.static.ttf`);
      execFileSync(
        "python",
        ["-m", "fontTools.varLib.instancer", trimmed, `wght=${w}`, "--static", "-o", static_, "-q"],
        { stdio: "pipe" },
      );

      // ── 步骤 3：转 woff2
      const out = join(OUT_DIR, `${family}-${w}.woff2`);
      execFileSync(
        "pyftsubset",
        [
          static_,
          `--text-file=${textFile}`,
          `--output-file=${out}`,
          "--flavor=woff2",
          "--layout-features=*",
          "--no-hinting",
          "--desubroutinize",
        ],
        { stdio: "pipe" },
      );
      rmSync(static_);

      const size = statSync(out).size;
      total += size;
      made.push(`  ${family}-${w}.woff2  ${mb(size)}`);
    }
    rmSync(trimmed);
  }
  rmSync(textFile);

  // 页脚只放得下一个链接，所以额外生成一份合并的许可证 —— 两份版权方不同，
  // 都必须可被取得（OFL 第 2 条）。单独的 OFL-*.txt 也保留。
  const combined = [
    "本站自托管的中文字体子集及其授权",
    "=".repeat(60),
    "",
    "字体文件是从下列开源字体裁剪出的子集，仅包含本站实际用到的字符。",
    "子集属于 OFL 定义的 Modified Version，同样受 SIL Open Font License 1.1 约束。",
    "",
    "主字体名保持为 Noto Sans SC / Noto Serif SC，未使用任何 Reserved Font Name。",
    "",
    ...TARGETS.flatMap(({ family, license }) => [
      "",
      "-".repeat(60),
      `${family}`,
      "-".repeat(60),
      "",
      readFileSync(join(OUT_DIR, license), "utf8"),
    ]),
  ].join("\n");
  writeFileSync(join(OUT_DIR, "LICENSES.txt"), combined, "utf8");

  console.log(made.join("\n"));
  console.log(`合计 ${mb(total)}`);
  console.log(`许可证：${TARGETS.map((t) => t.license).join("、")} 与合并版 LICENSES.txt`);
}

main();
