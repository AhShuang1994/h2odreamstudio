/**
 * 导出产物 · 体积预算
 *
 * 字节数是会悄悄涨的东西 —— 每一次「就多这一张图」都合理，加完就超了。
 * 这里的每条上限都对应一个具体理由，改上限之前先想清楚是不是该改的是内容。
 *
 * 运行时性能（LCP / INP / CLS）测不到这一层，归接缝 ②，见 ADR-0008。
 */
import { describe, it, expect } from "vitest";
import { loadExport, mb } from "../helpers/export";

/**
 * 导出目录总体积上限。
 *
 * #71 之前是 547MB —— 其中 511MB 是构建产物里**无人引用**的 jpg/png 原图。
 * 清理后约 34MB。上限设 40MB 留出内容增长空间；
 * 真要超了，先问「是不是又把原图提交进来了」，再考虑抬上限。
 *
 * 40 → 44MB：首屏星河视频从 1280 宽（2.6MB）换成 1920 宽（4.8MB），总量
 * 顶到 41.0MB。按上面那条顺序查过了，**不是**原图回流，是一次有意的清晰度
 * 升级 —— 1280 在满屏铺底下要被 object-cover 拉到 1605 宽，实机看糊。
 *
 * ⚠️ 但真正的大头不是它：`assets/wedding/` 一个目录 25.4MB，占导出的 62%，
 * 35 张全尺寸婚礼图，单张最大 1.5MB。下次谁再撞到这条上限，该动的是那批图
 * （压缩 / 出响应式尺寸），不是继续抬这个数。
 */
/*
 * 44 → 48MB：内容页迁进 Next 路由。
 *
 * **这 2MB 不是站变胖了，是 RSC 的税。** App Router 把每个页面的 flight payload
 * 内联进 HTML，所以正文被序列化**两次** —— 一次是标记，一次是
 * `self.__next_f.push`。实测一篇文章 26.7KB → 70.2KB，其中 58% 是那份重复。
 * 这些页面是 100% 静态散文，Shell 之下没有任何交互，这笔税换不到任何东西，
 * 而 App Router 没有关闭开关。
 *
 * 18 篇内容页 +0.7MB，案例拆解与服务页迁完再 +1MB 左右。
 *
 * ⚠️ 上面那条「先问是不是原图回流」的顺序仍然有效，而且 assets/wedding/
 * 那 25.4MB 还在那里。别再抬这个数了 —— 下次撞上限该动的是那批图。
 *
 * 2026-09-21 撞上了（从 main 同步新 demo 与作品区星河图 +4.7MB → 49.3MB），
 * 照上面说的动了那批图：35 张原图长边 5472 → 2560、WebP q80，23.1 → 6.8MB。
 * 上限没抬。
 */
const MAX_EXPORT_BYTES = 48 * 1024 * 1024;

describe("导出产物 · 体积预算", () => {
  it(`总体积不超过 ${mb(MAX_EXPORT_BYTES)}`, () => {
    const x = loadExport();
    const top = [...x.sizes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([f, s]) => `${mb(s).padStart(9)}  ${f}`);

    expect(
      x.totalBytes,
      `导出目录 ${mb(x.totalBytes)}，超出上限 ${mb(MAX_EXPORT_BYTES)}。最大的 10 个文件：\n  ` +
        top.join("\n  "),
    ).toBeLessThanOrEqual(MAX_EXPORT_BYTES);
  });

  it("没有单个文件超过 Cloudflare Pages 的 25 MiB 上限", () => {
    const LIMIT = 25 * 1024 * 1024;
    const over = [...loadExport().sizes]
      .filter(([, s]) => s > LIMIT)
      .map(([f, s]) => `${mb(s)}  ${f}`);

    expect(
      over,
      `这些文件超过 25 MiB，Cloudflare Pages 会拒绝部署：\n  ${over.join("\n  ")}`,
    ).toEqual([]);
  });

  it("文件总数没有超过 Cloudflare Pages 免费版的 20,000 个上限", () => {
    expect(loadExport().files.length).toBeLessThan(20_000);
  });
});
