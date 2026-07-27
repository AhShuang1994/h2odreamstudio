import type { Metadata } from "next";
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
import { homeMeta, faq } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: homeMeta.title },
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeMeta.title,
    description: homeMeta.description,
    url: "/",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    // 工作室实体与价格区间都来自共享节点，价格由报价单一数据源推导
    businessNode(),
    {
      "@type": "WebSite",
      "@id": `${site.domain}/#website`,
      url: `${site.domain}/`,
      name: "H2ODreamer Studio",
      inLanguage: ["zh-CN", "en"],
      publisher: { "@id": `${site.domain}/#business` },
    },
    // 首页的 FAQ 由 <Faq /> 渲染出来，可见，所以 FAQPage 合规
    faqNode(faq.items),
  ],
};

export default function Home() {
  return (
    <main>
      <JsonLd data={jsonLd} />
      <Hero />
      <QuickAnswer />
      <Services />
      <SelectedWork />
      <Founder />
      <Faq />
      <ContactCta />
    </main>
  );
}
