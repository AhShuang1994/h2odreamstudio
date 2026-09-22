import { getDoc } from "@/lib/content/doc.mjs";
import { articleMetadata } from "@/lib/meta";
import { LegacyArticle } from "@/components/content/LegacyArticle";

/**
 * 案例拆解索引。
 *
 * ⚠️ 这条路由导出成 `out/case-studies.html`，但它的**规范地址是 `/case-studies/`**（带尾斜杠，
 * 已收录）。`scripts/fix-dir-index.mjs` 在 postbuild 里把它改名成
 * `out/case-studies/index.html`，那才是 Cloudflare 对 `/case-studies/` 解析到的文件。
 * 别把 `trailingSlash` 改成 true 来「解决」这件事，见 ADR-0003。
 */
const doc = getDoc("case-studies", "index");

export const metadata = articleMetadata(doc, "en");

export default function Page() {
  return <LegacyArticle doc={doc} lang="en" />;
}
