import type { Bilingual } from "./site";

/**
 * 报价的**单一数据源**。
 *
 * 页面、结构化数据、llms.txt 一律从这里取值，任何地方都不要再硬编码价格。
 * 改一个数字，全站跟着变 —— 这是 #74 的验收条件，也是 #79 要把首页与
 * llms.txt 接过来的目标。词汇表里的「起价」词条定义了它的语义：
 * 所有数字都是下限，最终报价按需求定。
 */

export const pricingMeta = {
  title: "价格方案 · Pricing · H2ODreamer Studio",
  description:
    "H2ODreamer Studio 网站设计价格（马来西亚）：落地页 RM 590 起、5 页企业网站 RM 2,500、Shopify 迁移 RM 10,000 起；电子喜帖 RM 800 / RM 1,500。没有强制月费。",
};

export const pricingHeader = {
  eyebrow: { cn: "价格方案", en: "Pricing" } as Bilingual,
  title: {
    cn: "透明价格，没有意外",
    en: "Transparent pricing, no surprises",
  } as Bilingual,
  lede: {
    cn: "以下每个价格都是「起价」。告诉我们你的需求，我们给你一个固定报价 —— 先免费咨询，绝不强推。",
    en: "Every price below is a starting point. Tell us what you need and we'll give you a fixed quote — free consultation first, no hard sell.",
  } as Bilingual,
};

export const pricingQuickAnswer = {
  cn: "在 H2ODreamer Studio（马来西亚）做网站的价格：单页落地页 RM 590 起（入门版）或 RM 1,000（进阶版，含 SEO + 分析）；5 页企业网站 RM 2,500 起；Shopify 迁移 RM 10,000 起。电子喜帖 RM 800（标准版）与 RM 1,500（定制版）。没有强制月费 —— 网站是你的。",
  en: "A website with H2ODreamer Studio (Malaysia) costs: 1-page landing from RM 590 (Starter) or RM 1,000 (Basic, with SEO + analytics); a 5-page corporate site from RM 2,500; a Shopify migration from RM 10,000. Wedding e-invitations are RM 800 (Standard) and RM 1,500 (Premium). No compulsory monthly fee — the site is yours.",
} as Bilingual;

// ── 网站设计：三档对比 ────────────────────────────────────────────────

export const webTiers = [
  {
    id: "starter",
    name: { cn: "入门版", en: "Starter" } as Bilingual,
    price: "RM 590",
    popular: false,
    href: "/landing-page",
  },
  {
    id: "basic",
    name: { cn: "进阶版", en: "Basic" } as Bilingual,
    price: "RM 1,000",
    popular: true,
    badge: { cn: "热门", en: "Popular" } as Bilingual,
    href: "/landing-page",
  },
  {
    id: "standard",
    name: { cn: "企业版", en: "Standard" } as Bilingual,
    price: "RM 2,500",
    popular: false,
    href: "/landing-page",
  },
] as const;

/** 每行一个对比维度，values 依次对应 webTiers。true = ✓，false = 不含。 */
export const webFeatures: {
  label: Bilingual;
  values: (Bilingual | boolean)[];
}[] = [
  {
    label: { cn: "适合", en: "Best for" },
    values: [
      { cn: "简单先上线", en: "Getting online simply" },
      { cn: "带来询盘", en: "Bringing in enquiries" },
      { cn: "要规模与门面", en: "Looking established" },
    ],
  },
  {
    label: { cn: "页数", en: "Pages" },
    values: [
      { cn: "1 页（≤4 区块）", en: "1 page (≤4 sections)" },
      { cn: "1 页（≤5 区块）", en: "1 page (≤5 sections)" },
      { cn: "5 页", en: "5 pages" },
    ],
  },
  {
    label: { cn: "交付时间", en: "Delivery" },
    values: [
      { cn: "3–5 天", en: "3–5 days" },
      { cn: "5–7 天", en: "5–7 days" },
      { cn: "1–2 周", en: "1–2 weeks" },
    ],
  },
  {
    label: { cn: "修改次数", en: "Revisions" },
    values: [
      { cn: "1 次", en: "1 round" },
      { cn: "2 次", en: "2 rounds" },
      { cn: "2 次", en: "2 rounds" },
    ],
  },
  { label: { cn: "手机响应式", en: "Mobile responsive" }, values: [true, true, true] },
  {
    label: { cn: "设计", en: "Design" },
    values: [
      { cn: "可定制模板", en: "Customizable template" },
      { cn: "可定制设计", en: "Custom design" },
      { cn: "可定制设计", en: "Custom design" },
    ],
  },
  { label: { cn: "联络表单", en: "Contact form" }, values: [true, true, true] },
  { label: { cn: "基础 SEO", en: "Basic SEO" }, values: [false, true, true] },
  { label: { cn: "WhatsApp 在线聊天", en: "WhatsApp live chat" }, values: [false, true, true] },
  { label: { cn: "Facebook Pixel", en: "Facebook Pixel" }, values: [false, true, true] },
  { label: { cn: "Google Analytics", en: "Google Analytics" }, values: [false, true, true] },
  { label: { cn: "自动 Google 收录", en: "Auto Google indexing" }, values: [false, false, true] },
];

// ── 婚礼喜帖与电商 ───────────────────────────────────────────────────

export const otherServices = [
  {
    name: { cn: "电子喜帖 · 标准版", en: "Wedding E-Invitation · Standard" } as Bilingual,
    href: "/wedding-basic",
    price: "RM 800",
    delivery: { cn: "4–6 天", en: "4–6 days" } as Bilingual,
    highlights: {
      cn: "多区块滚动、相册、Google Maps、最多 6 张照片",
      en: "Multi-section scroll, photo gallery, Google Maps, up to 6 photos",
    } as Bilingual,
  },
  {
    name: { cn: "电子喜帖 · 定制版", en: "Wedding E-Invitation · Premium" } as Bilingual,
    href: "/wedding-premium",
    price: "RM 1,500",
    delivery: { cn: "5–7 天", en: "5–7 days" } as Bilingual,
    highlights: {
      cn: "RSVP、倒数计时、动画、背景音乐、专属配色",
      en: "RSVP, countdown, animations, background music, custom palette",
    } as Bilingual,
  },
  {
    name: { cn: "Shopify 迁移", en: "Shopify Migration" } as Bilingual,
    href: "/shopify-migration",
    price: "RM 10,000",
    delivery: { cn: "2–4 周", en: "2–4 weeks" } as Bilingual,
    highlights: {
      cn: "产品与页面迁移、301 重定向、GA4 追踪、后台培训",
      en: "Product & page migration, 301 redirects, GA4 tracking, admin training",
    } as Bilingual,
  },
];

export const pricingNotes: Bilingual[] = [
  {
    cn: "所有价格为起价（「From」）。最终报价依需求而定 —— 开工前先确认清楚。",
    en: "All prices are starting points (“from”). The final quote depends on your scope — confirmed before any work begins.",
  },
  {
    cn: "主机与域名费用另计，直接付给服务商（如 Shopify、Hostinger）。",
    en: "Hosting and domain are billed separately, paid directly to the provider (e.g. Shopify, Hostinger).",
  },
  {
    cn: "没有强制月费 —— 网站归你所有。可选维护套餐另议。",
    en: "No compulsory monthly fee — you own the website. Optional maintenance packages are available.",
  },
];

export const pricingGuides = {
  intro: {
    cn: "不确定哪个套餐适合你的生意？看我们的指南：",
    en: "Not sure which tier fits your business? Read our guide:",
  } as Bilingual,
  links: [
    {
      href: "/blog/which-website-for-your-business.html",
      label: {
        cn: "不同生意该做什么网站？→",
        en: "Which website does your business need? →",
      } as Bilingual,
    },
    {
      href: "/blog/website-cost-malaysia.html",
      label: {
        cn: "一个网站到底要多少钱？→",
        en: "How much does a website really cost? →",
      } as Bilingual,
    },
  ],
};

export const pricingCta = {
  heading: { cn: "获取你的专属报价", en: "Get your fixed quote" } as Bilingual,
  whatsapp: {
    cn: "💬 WhatsApp 咨询，免费报价",
    en: "💬 WhatsApp Us — Free Quote",
  } as Bilingual,
  whatsappMessage: "Hi H2ODreamer! 我想要一个报价。我的生意是 [business type]。",
  secondary: { cn: "📨 更多联系方式", en: "📨 Contact options" } as Bilingual,
};
