import type { Metadata } from "next";
import { NotFoundPage } from "@/components/pages/NotFound";

/**
 * 中文 404（#93）：导出成 `out/zh/404.html`。
 *
 * 它的作用有两层，第二层是**顺带的**：
 *
 * 1. 导航里的语言切换按钮由地址推出对应语言的地址（`otherLangHref`），在
 *    `/404` 上推出来的就是 `/zh/404`。这一页不存在的话，全站唯一一条死链就在
 *    404 页的导航上：`urls.test.ts` 的站内死链检查会红。
 * 2. Cloudflare Pages 对未匹配地址会往上找最近的 `404.html`，若真如此，`/zh/` 下
 *    走丢的访客会拿到这一份中文优先的版本。**这条只有在真的预览链接上才验证得了**
 *    （同 ADR-0003 那句叮嘱），所以根部那份 `/404` 自己也带着中文，不依赖它。
 */
export const metadata: Metadata = {
  title: "404 · 页面走丢了",
  description: "这个页面走丢了。This page could not be found.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <NotFoundPage lang="zh" />;
}
