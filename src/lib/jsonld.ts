import { site, type Bilingual } from "@/content/site";
import { webTiers } from "@/content/pricing";
import { t, type Lang } from "./i18n";

/**
 * 全站共用的结构化数据节点。
 *
 * ⚠️ FAQPage 只能放在**页面上真的有可见问答**的页面上。Google 明令禁止用
 * 不可见的内容做 FAQ 标记 —— 旧站的 about 与 pricing 就踩了这个坑（3 个与
 * 4 个问题在页面上找不到），迁移时已移除。加 FAQPage 之前先确认问答渲染出来了。
 */

/** 工作室本体。每个页面都引用同一个 @id，让搜索引擎知道说的是同一个实体。 */
export function businessNode() {
  const from = webTiers[0].price;
  const to = webTiers[webTiers.length - 1].price;
  return {
    "@type": "ProfessionalService",
    "@id": `${site.domain}/#business`,
    name: "H2ODreamer Studio",
    url: `${site.domain}/`,
    logo: `${site.domain}/og/logo.svg`,
    image: `${site.domain}/og/og-image.jpg`,
    description:
      "Web design studio in Malaysia — landing pages, multi-page corporate websites, wedding e-invitations and Shopify migration. Bilingual service in English and Chinese.",
    areaServed: "MY",
    address: {
      "@type": "PostalAddress",
      addressRegion: "Johor",
      addressCountry: "MY",
    },
    geo: { "@type": "GeoCoordinates", latitude: 1.4927, longitude: 103.7414 },
    // 价格区间从报价单一数据源推导，不再手写
    priceRange: `${from} - ${to}+`,
    serviceType: [
      "Web Design",
      "Wedding E-Invitation",
      "Landing Page",
      "Shopify Migration",
    ],
    knowsLanguage: ["en", "zh"],
    founder: {
      "@type": "Person",
      name: "Hui Huang Ong",
      jobTitle: "Founder",
      image: `${site.domain}/og/founder-avatar.webp`,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${site.whatsapp}`,
      contactType: "sales",
      availableLanguage: ["English", "Chinese"],
    },
    sameAs: [site.instagram],
  };
}

/**
 * 页面本体节点，统一挂到工作室实体上。
 *
 * `inLanguage` 是**单值** —— 每个地址只渲染一种语言，声明两种会和 hreflang
 * 互相打架。中英两份各自声明自己那一种。
 */
export function pageNode(
  type: "AboutPage" | "ContactPage" | "WebPage",
  path: string,
  lang: Lang,
  name: string,
  description: string,
) {
  return {
    "@type": type,
    "@id": `${site.domain}${path}#page`,
    url: `${site.domain}${path}`,
    name,
    description,
    inLanguage: lang === "zh" ? "zh-CN" : "en",
    isPartOf: { "@id": `${site.domain}/#website` },
    about: { "@id": `${site.domain}/#business` },
  };
}

/** 只在问答**页面上可见**时才调用；问答的语言必须与页面一致。 */
export function faqNode(items: { q: Bilingual; a: Bilingual }[], lang: Lang) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: t(f.q, lang),
      acceptedAnswer: { "@type": "Answer", text: t(f.a, lang) },
    })),
  };
}
