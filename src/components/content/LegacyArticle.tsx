import { JsonLd } from "@/components/JsonLd";
import { ArticleToc } from "@/components/content/ArticleToc";
import { visibleFaq } from "@/lib/content/html.mjs";
import { localize, type Lang } from "@/lib/i18n";
import type { ContentDoc } from "@/lib/content/doc.d.mts";
import "@/styles/legacy-content.css";

/**
 * 内容页的正文外壳。
 *
 * 正文 HTML **一字不改**地来自 `src/content/pages/**` 的双语原稿（#65 冻结），
 * 塌成一种语言之后直接注入。不拆成组件是刻意的：17 篇文章手工重排，最容易
 * 动到已经冻结的文案，也最容易出错，换来的只是「看起来干净」。
 *
 * 页面外壳（nav / footer / WhatsApp 按钮 / 幕布）来自 `Shell.tsx`，与核心页
 * 完全同一套：这正是迁进 Next 路由买到的东西。
 */
export function LegacyArticle({ doc, lang }: { doc: ContentDoc; lang: Lang }) {
  // 一次算出、两处使用：注入页面的字符串，和生成 FAQPage 的输入。
  // 「结构化数据里的问答必须在页面上可见」于是成了构造保证，不是事后比对，
  // 见 CONTEXT.md 的「可见问答」与 test/export/geo.test.ts。
  const body = doc.bodyHtml(lang, (href) => localize(href, lang));
  const faq = visibleFaq(body);

  return (
    <>
      {/* 原稿 head 里的内联 <style>。博客首页的 blog-grid / blog-card 等 11 个类
          只存在于这里，任何样式表里都没有：丢了那一页会裸奔。 */}
      {doc.headStyle && (
        <style dangerouslySetInnerHTML={{ __html: doc.headStyle }} />
      )}

      {/* 原稿自带的 BlogPosting / Article 节点，原样发。英文版的 headline 与
          description 已经在 doc.jsonLd() 里换过。 */}
      {doc.jsonLd(lang).map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      ))}

      {faq.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }}
        />
      )}

      <article
        className="legacy-content"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {/* 只有博客与案例文章带目录。服务页与索引页不是按章节读的。 */}
      {!doc.isIndex && (doc.section === "blog" || doc.section === "case-studies") && (
        <ArticleToc lang={lang} />
      )}

      {/* 正文今天就带着这支脚本（揭示、锚点滚动、FAQ 展开）。它里面的导航与
          语言切换 IIFE 会因为找不到对应元素而自己让开。要不要拆掉是迁移收尾的
          事，不是迁移本身的事：先保证「同样的像素，新的网址」。 */}
      <script src="/js/main.min.js" defer />
    </>
  );
}
