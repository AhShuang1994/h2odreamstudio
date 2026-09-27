import { getDoc } from "@/lib/content/doc.mjs";
import { articleMetadata } from "@/lib/meta";
import { LegacyArticle } from "@/components/content/LegacyArticle";

/**
 * 服务页。地址是扁平的 `/landing-page`（已收录形态），所以是一条显式路由，
 * 不是根级 `[slug]`，后者会和 /about、/pricing 这些核心页抢同一层。
 *
 * 中英各一条：原先一个地址靠运行时 JS 切换两种语言，那套已经拆掉（ADR-0002）。
 */
const doc = getDoc("services", "web-design-johor-bahru");

export const metadata = articleMetadata(doc, "zh");

export default function Page() {
  return <LegacyArticle doc={doc} lang="zh" />;
}
