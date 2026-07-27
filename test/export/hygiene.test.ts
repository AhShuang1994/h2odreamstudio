/**
 * 导出产物 · 不该出现的东西
 *
 * 这里的每一条都对应一个真实发生过或明确预见的事故。加新的一条时，
 * 在下面的 FORBIDDEN 表里加一行即可，不用改测试结构。
 */
import { describe, it, expect } from "vitest";
import { loadExport, mb } from "../helpers/export";

interface Forbidden {
  /** 断言名 */
  what: string;
  /** 命中即失败 */
  match: (rel: string) => boolean;
  /** 为什么不该在这里 */
  why: string;
}

const FORBIDDEN: Forbidden[] = [
  {
    what: "私人婚礼请柬",
    match: (f) => /(^|\/)wedding-invite(s)?\//i.test(f),
    why:
      "私人请柬必须保持 noindex，与本站全力 GEO 收录的方向相反。它曾因提交在 main " +
      "根目录而真的公开可访问过（含真人照片相册），见 ADR-0006。内容已迁至独立的 " +
      "private 仓库 AhShuang1994/wedding-invites。",
  },
  {
    what: "借来的占位帧序列",
    match: (f) => /(^|\/)scrub-frames(-desktop)?\//i.test(f),
    why:
      "240 帧 / 16.3MB，注释显示借自 ember-scroll，不是本站内容；且帧序列 scrub " +
      "本就不是选定的动效手法（实测参考站 pin 数为 0），见 ADR-0001。",
  },
  {
    what: "构建中间产物",
    match: (f) => /(^|\/)\.next\//.test(f) || f.endsWith(".tsbuildinfo"),
    why: "构建缓存不该被发布出去。",
  },
  {
    what: "源码与配置",
    match: (f) =>
      /(^|\/)(src|node_modules|test)\//.test(f) ||
      /^(package(-lock)?\.json|tsconfig\.json|.*\.config\.(m?js|ts))$/.test(f),
    why: "静态导出只应包含产物，不应把源码一起发出去。",
  },
];

describe("导出产物 · 不该出现的东西", () => {
  const x = loadExport();

  for (const rule of FORBIDDEN) {
    it(`不含${rule.what}`, () => {
      const hits = x.files.filter(rule.match);
      const bytes = hits.reduce((s, f) => s + (x.sizes.get(f) ?? 0), 0);
      expect(
        hits,
        `发现 ${hits.length} 个文件（${mb(bytes)}）：\n  ` +
          hits.slice(0, 15).join("\n  ") +
          (hits.length > 15 ? `\n  …还有 ${hits.length - 15} 个` : "") +
          `\n\n为什么不该在这里：${rule.why}`,
      ).toEqual([]);
    });
  }
});
