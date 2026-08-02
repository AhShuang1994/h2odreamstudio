/**
 * 动效外壳要往每个页面塞的两段标记 —— 核心页与静态页共用同一份来源。
 *
 * 见 `src/motion/head-inline.js` 的文件头：写两份迟早漂移，而漂移的表现是
 * 「有的页面有幕布、有的白屏硬跳」，ADR-0001 说这比完全没有更糟。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 必须早于首帧的那段，内联进 `<head>`。 */
export const headInline = readFileSync(
  join(process.cwd(), "src/motion/head-inline.js"),
  "utf8",
);

/** 动效外壳本体，`</body>` 之前。defer 保序，Lenis 必须排在前面。 */
export const bodyScripts =
  '<script src="/js/lenis.min.js" defer></script>\n' +
  '  <script src="/js/motion.js" defer></script>';

/** 已经注入过就别再注入一次 —— 认这个标记。 */
export const MARKER = "h2od-curtain";
