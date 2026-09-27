import { getDoc, listDocs } from "@/lib/content/doc.mjs";
import { articleMetadata } from "@/lib/meta";
import { LegacyArticle } from "@/components/content/LegacyArticle";

/**
 * 博客文章。
 *
 * `slug` 不带扩展名，但 `trailingSlash: false` 让它导出成
 * `out/blog/<slug>.html`。Cloudflare Pages 以 `/blog/<slug>`（无扩展名）服务它，
 * 那也是 canonical 写的地址；带 `.html` 的请求会被 308 过去。
 */
export function generateStaticParams() {
  return listDocs("blog")
    .filter((d) => !d.isIndex)
    .map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata(getDoc("blog", slug), "zh");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LegacyArticle doc={getDoc("blog", slug)} lang="zh" />;
}
