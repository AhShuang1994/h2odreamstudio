import type { Lang } from "@/lib/i18n";
import { Hero } from "@/components/home/Hero";
import {
  QuickAnswer,
  Services,
  SelectedWork,
  Founder,
  Faq,
  ContactCta,
} from "@/components/home/sections";
import { JsonLd } from "@/components/JsonLd";
import { businessNode, faqNode } from "@/lib/jsonld";
import { site } from "@/content/site";
import { faq } from "@/content/home";

/** 首页主体。中英两份路由（`/` 与 `/zh`）共用它，只是 lang 不同。 */
export function HomePage({ lang }: { lang: Lang }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // 工作室实体与价格区间都来自共享节点，价格由报价单一数据源推导
      businessNode(),
      {
        // 站点实体只有一个，两种语言共用 —— 单语的是**页面**，不是站点
        "@type": "WebSite",
        "@id": `${site.domain}/#website`,
        url: `${site.domain}/`,
        name: "H2ODreamer Studio",
        inLanguage: ["en", "zh-CN"],
        publisher: { "@id": `${site.domain}/#business` },
      },
      // 首页的 FAQ 由 <Faq /> 渲染出来，可见，所以 FAQPage 合规
      faqNode(faq.items, lang),
    ],
  };

  return (
    <main>
      <JsonLd data={jsonLd} />
      <Hero lang={lang} />
      <QuickAnswer lang={lang} />
      <Services lang={lang} />
      <SelectedWork lang={lang} />
      <Founder lang={lang} />
      <Faq lang={lang} />
      <ContactCta lang={lang} />
    </main>
  );
}
