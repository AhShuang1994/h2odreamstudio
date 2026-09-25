export type Bilingual = { cn: string; en: string };

export const site = {
  name: "H2ODreamer Studio",
  domain: "https://www.h2o-dreamer-studio.com",
  whatsapp: "60175138694",
  whatsappDisplay: "017-513 8694",
  instagram: "https://www.instagram.com/h2odreamer.studio/",
  waLink(message?: string) {
    const base = "https://wa.me/60175138694";
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  },
};

export const nav = {
  services: {
    label: { cn: "服务", en: "Services" } as Bilingual,
    items: [
      { href: "/landing-page", label: { cn: "网站设计", en: "Website Design" } as Bilingual },
      { href: "/wedding-basic", label: { cn: "婚礼喜帖", en: "Wedding E-Invitation" } as Bilingual },
      { href: "/shopify-migration", label: { cn: "Shopify 迁移", en: "Shopify Migration" } as Bilingual },
      { href: "/pricing", label: { cn: "价格方案", en: "Pricing" } as Bilingual },
    ],
  },
  links: [
    { href: "/about", label: { cn: "关于", en: "About" } as Bilingual },
    { href: "/#work", label: { cn: "作品", en: "Work" } as Bilingual },
    { href: "/blog/", label: { cn: "博客", en: "Blog" } as Bilingual },
    { href: "/contact", label: { cn: "联系", en: "Contact" } as Bilingual },
  ],
};
