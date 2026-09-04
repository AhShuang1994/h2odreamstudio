import { getDoc, listDocs } from "@/lib/content/doc.mjs";
import { articleMetadata } from "@/lib/meta";
import { LegacyArticle } from "@/components/content/LegacyArticle";

/**
 * 博客文章。
 *
 * `slug` 不带扩展名，但 `trailingSlash: false` 让它导出成
 * `out/blog/<slug>.html` —— 正好是已收录的那条地址，不需要任何技巧。
 */
export function generateStaticParams() {
  return listDocs("blog")
    .filter((d) => !d.isIndex)
    .map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata(getDoc("blog", slug), "en");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LegacyArticle doc={getDoc("blog", slug)} lang="en" />;
}
