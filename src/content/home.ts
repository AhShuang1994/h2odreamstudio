import { prices } from "./pricing";
import type { Bilingual } from "./site";

/** 价格一律从 pricing.ts 的单一数据源取，首页不自己写数字（#79）。 */

export const homeMeta = {
  title: {
    cn: "马来西亚网站设计 · H2ODreamer Studio｜帮小生意踏出线上第一步",
    en: "Web Design Malaysia · H2ODreamer Studio | First step online for small businesses",
  } as Bilingual,
  description: {
    cn: `马来西亚柔佛的网站设计工作室，创始人阿爽一对一帮小生意上线：落地页 ${prices.starter} 起、5 页企业官网 ${prices.standard} 起、Shopify 迁移 ${prices.shopify} 起、婚礼电子请柬。中英双语，WhatsApp 免费咨询。`,
    en: `A one-person web design studio in Johor, Malaysia. Ah Shuang takes small businesses online personally: landing pages from ${prices.starter}, 5-page company sites from ${prices.standard}, Shopify migration from ${prices.shopify}, wedding e-invitations. English / 中文, free WhatsApp consultation.`,
  } as Bilingual,
};

export const hero = {
  eyebrow: {
    cn: "我是阿爽 · H2ODreamer Studio 创始人",
    en: "I'm Ah Shuang · Founder, H2ODreamer Studio",
  } as Bilingual,
  h1: {
    cn: "我帮马来西亚的小生意，做会带来生意的网站。",
    en: "I build websites that bring Malaysian small businesses real customers.",
  } as Bilingual,
  sub: {
    cn: `这几年我陪一间间小店、新品牌从零上线 —— 落地页、企业官网、Shopify 搬家、婚礼请柬。不套模板、不玩虚的，像细水长流一样陪你走完。落地页 ${prices.starter} 起。`,
    en: `For years I've taken shops and new brands from zero to launch — landing pages, company sites, Shopify moves, wedding invites. No templates, no fluff, steady as still water. From ${prices.starter}.`,
  } as Bilingual,
  ctaPrimary: { cn: "WhatsApp 直接找我聊", en: "WhatsApp me directly" } as Bilingual,
  ctaSecondary: { cn: "看服务与报价", en: "Services & pricing" } as Bilingual,
  waMessage: {
    cn: "你好阿爽，我想咨询网站",
    en: "Hi Ah Shuang, I'd like to ask about a website",
  } as Bilingual,
  scaleWord: { cn: "梦想", en: "Dream" } as Bilingual,
};

export const quickAnswer = {
  heading: {
    cn: "H2ODreamer Studio 是做什么的？",
    en: "What is H2ODreamer Studio?",
  } as Bilingual,
  body: {
    cn: `H2ODreamer Studio 是我（阿爽）在马来西亚柔佛经营的网站设计工作室，帮小生意和新品牌从零踏出线上第一步。我做四件事：一页式落地页（入门版 ${prices.starter}、进阶版 ${prices.basic}）、多页企业官网（5 页 ${prices.standard} 起）、Shopify 迁移（${prices.shopify} 起）、婚礼电子请柬（${prices.weddingStandard} / ${prices.weddingPremium}）。全程我一个人对接、不外包、不套模板，中英双语沟通，联系走 WhatsApp。`,
    en: `H2ODreamer Studio is a web design studio I (Ah Shuang) run in Johor, Malaysia, helping small businesses and new brands take their first step online. I do four things: one-page landing pages (${prices.starter} Starter, ${prices.basic} Basic), multi-page company sites (5 pages from ${prices.standard}), Shopify migration (from ${prices.shopify}), and wedding e-invitations (${prices.weddingStandard} / ${prices.weddingPremium}). You deal with me directly — no outsourcing, no templates — in English or Chinese, over WhatsApp.`,
  } as Bilingual,
  stats: [
    {
      value: { cn: `${prices.starter}+`, en: `${prices.starter}+` } as Bilingual,
      label: { cn: "落地页起价", en: "Landing pages from" } as Bilingual,
    },
    {
      value: { cn: `${prices.standard}+`, en: `${prices.standard}+` } as Bilingual,
      label: { cn: "5 页企业站起价", en: "5-page sites from" } as Bilingual,
    },
    {
      value: { cn: "1", en: "1" } as Bilingual,
      label: { cn: "对接人（就是我）", en: "Person you deal with" } as Bilingual,
    },
    {
      value: { cn: "中 / EN", en: "EN / ZH" } as Bilingual,
      label: { cn: "双语沟通", en: "Bilingual" } as Bilingual,
    },
  ],
};

export const services = {
  eyebrow: { cn: "服务", en: "Services" } as Bilingual,
  heading: {
    cn: "帮你把生意，搬到客户找得到的地方",
    en: "Getting your business where customers can find it",
  } as Bilingual,
  items: [
    {
      title: { cn: "一页式落地页", en: "Landing Page" } as Bilingual,
      price: {
        cn: `${prices.starter} / ${prices.basic}`,
        en: `${prices.starter} / ${prices.basic}`,
      } as Bilingual,
      desc: {
        cn: `一页说清卖点，引导访客直接 WhatsApp 下单或预约。适合单一产品、服务或活动。入门版 ${prices.starter}，进阶版 ${prices.basic} 多了 SEO 与数据分析。`,
        en: `One page that makes your offer clear and sends visitors straight to WhatsApp to order or book. Great for a single product, service or campaign. ${prices.starter} Starter, or ${prices.basic} Basic with SEO and analytics.`,
      } as Bilingual,
      href: "/landing-page",
    },
    {
      title: { cn: "多页企业官网", en: "Company Website" } as Bilingual,
      price: { cn: `${prices.standard} 起`, en: `From ${prices.standard}` } as Bilingual,
      desc: {
        cn: "品牌、服务、作品、联系，一个完整的线上门面。5 页起，可按需扩展。",
        en: "Brand, services, work, contact — a complete online front. From 5 pages, expandable.",
      } as Bilingual,
      href: "/landing-page",
    },
    {
      title: { cn: "Shopify 迁移", en: "Shopify Migration" } as Bilingual,
      price: { cn: `${prices.shopify} 起`, en: `From ${prices.shopify}` } as Bilingual,
      desc: {
        cn: "从旧平台或零基础搬到 Shopify，把「逛」变成「加购结账」，开始真正卖货。",
        en: "Move from an old platform or from scratch to Shopify — turn browsing into checkout and actually start selling.",
      } as Bilingual,
      href: "/shopify-migration",
    },
    {
      title: { cn: "婚礼电子请柬", en: "Wedding E-Invite" } as Bilingual,
      price: {
        cn: `${prices.weddingStandard} / ${prices.weddingPremium}`,
        en: `${prices.weddingStandard} / ${prices.weddingPremium}`,
      } as Bilingual,
      desc: {
        cn: "一个链接 WhatsApp 转发就搞定，宾客一键 RSVP，含导航、行程与祝福留言。",
        en: "One link to forward on WhatsApp, one tap for guests to RSVP — with directions, schedule and a guestbook.",
      } as Bilingual,
      href: "/wedding-basic",
    },
  ],
};

export const selectedWork = {
  eyebrow: { cn: "精选作品", en: "Selected work" } as Bilingual,
  heading: {
    cn: "每个作品背后，都有一个设计决策",
    en: "Every project has a design decision behind it",
  } as Bilingual,
  cta: { cn: "看全部案例拆解", en: "See all case studies" } as Bilingual,
  items: [
    {
      title: { cn: "CoolTech 冷气 · 上门服务落地页", en: "CoolTech Aircon · Service landing page" } as Bilingual,
      tag: { cn: "落地页", en: "Landing page" } as Bilingual,
      img: "/assets/portfolio/landing-aircon-desktop.webp",
      href: "/case-studies/cooltech-aircon",
    },
    {
      title: { cn: "Glow Seoul · 护肤产品落地页", en: "Glow Seoul · Skincare landing page" } as Bilingual,
      tag: { cn: "落地页", en: "Landing page" } as Bilingual,
      img: "/assets/portfolio/landing-beauty-desktop.webp",
      href: "/case-studies/glow-seoul-skincare",
    },
    {
      title: { cn: "MUSE Apparel · Shopify 服装网店", en: "MUSE Apparel · Shopify store" } as Bilingual,
      tag: { cn: "Shopify", en: "Shopify" } as Bilingual,
      img: "/assets/portfolio/shopify-fashion-desktop.webp",
      href: "/case-studies/muse-apparel-shopify",
    },
    {
      title: { cn: "Wok & Flame · 餐厅落地页", en: "Wok & Flame · Restaurant landing page" } as Bilingual,
      tag: { cn: "餐饮", en: "F&B" } as Bilingual,
      img: "/assets/portfolio/landing-fnb-desktop.webp",
      href: "/case-studies/wok-and-flame-fnb",
    },
  ],
};

export const founder = {
  eyebrow: { cn: "关于创始人", en: "About the founder" } as Bilingual,
  name: { cn: "Hui Huang Ong（阿爽）", en: "Hui Huang Ong (Ah Shuang)" } as Bilingual,
  role: {
    cn: "创始人 · 设计到上线一人包办",
    en: "Founder · design to launch, done by one person",
  } as Bilingual,
  avatar: "/assets/founder-avatar.webp",
  bio: {
    cn: "我是阿爽，H2ODreamer Studio 的创始人，从设计到上线一个人包办。我会开始做网站，是因为看着身边太多有手艺、有产品的小老板，卡在「不知道怎么上线」这一步——东西明明很好，客户却在网上找不到他们。所以我把工作室取名 H2ODreamer：再大的海，也是从一滴水开始。这几年我陪餐厅、护肤、服饰、婚礼等不同行业从零做起，不套模板、不玩虚数据，像细水长流一样陪你把生意慢慢做大。有想法，随时 WhatsApp 找我聊。",
    en: "I'm Ah Shuang, founder of H2ODreamer Studio, and I handle everything from design to launch myself. I started building websites because I kept seeing skilled small-business owners stuck at the same step — great products, but customers couldn't find them online. That's why I named the studio H2ODreamer: even an ocean starts from a single drop. Over the years I've taken restaurants, skincare, fashion and wedding brands from zero — no templates, no vanity numbers — steady as still water, growing your business drop by drop. Got an idea? WhatsApp me anytime.",
  } as Bilingual,
};

export const faq = {
  eyebrow: { cn: "常见问题", en: "FAQ" } as Bilingual,
  heading: { cn: "开始前，你可能想问的", en: "What you might want to ask first" } as Bilingual,
  items: [
    {
      q: { cn: "做一个网站要多少钱？", en: "How much does a website cost?" } as Bilingual,
      a: {
        cn: `一页式落地页 ${prices.starter} 起（进阶版 ${prices.basic}），5 页企业官网 ${prices.standard} 起，Shopify 迁移 ${prices.shopify} 起，具体看页数和功能。报价前我会先免费和你聊需求，价钱透明、没有隐藏收费。`,
        en: `One-page landing pages start at ${prices.starter} (${prices.basic} for Basic), 5-page company sites at ${prices.standard}, and a Shopify migration from ${prices.shopify} — depending on pages and features. I'll talk through your needs for free first — transparent pricing, no hidden fees.`,
      } as Bilingual,
    },
    {
      q: { cn: "做好一个网站要多久？", en: "How long does it take?" } as Bilingual,
      a: {
        cn: "落地页通常 1–2 周，企业官网约 2–4 周，主要看内容（文案、图片）准备的速度。素材备好，就能更快上线。",
        en: "Landing pages usually take 1–2 weeks, company sites about 2–4 weeks — mostly depending on how fast your content (copy, photos) is ready.",
      } as Bilingual,
    },
    {
      q: { cn: "我没有文案和图片，也能做吗？", en: "What if I don't have copy or photos yet?" } as Bilingual,
      a: {
        cn: "可以。我会引导你一步步准备，帮你把要说的内容理清楚、排好结构，不会让你对着空白发呆。",
        en: "Yes. I'll guide you step by step, help you organize what to say and structure it — you won't be staring at a blank page.",
      } as Bilingual,
    },
    {
      q: { cn: "网站做好后，我能自己改吗？", en: "Can I update the site myself afterwards?" } as Bilingual,
      a: {
        cn: "看方案。简单内容更新我可以教你自己改，或交给我按次维护。上线不是结束，后续我也在。",
        en: "Depends on the package. For simple updates I can show you how, or handle maintenance per request. Launch isn't the end — I'm still around.",
      } as Bilingual,
    },
    {
      q: { cn: "你在马来西亚哪里？可以远程吗？", en: "Where in Malaysia are you? Can you work remotely?" } as Bilingual,
      a: {
        cn: "我在柔佛，全马都能远程合作，WhatsApp 和线上沟通就行，不必见面也能顺利完成。",
        en: "I'm in Johor and work with clients across Malaysia remotely — WhatsApp and online calls are enough, no need to meet in person.",
      } as Bilingual,
    },
  ],
};

export const contactCta = {
  eyebrow: { cn: "开始", en: "Get started" } as Bilingual,
  heading: { cn: "有想法，就从一滴水开始", en: "Got an idea? Start from a single drop" } as Bilingual,
  body: {
    cn: "免费聊聊你的生意和想法，我会告诉你最适合的做法和大概花费——没有压力，不合适也没关系。",
    en: "Let's talk about your business and idea for free. I'll tell you the best approach and rough cost — no pressure, no hard sell.",
  } as Bilingual,
  cta: { cn: "WhatsApp 免费咨询", en: "Free WhatsApp consult" } as Bilingual,
  waMessage: {
    cn: "你好阿爽，我想免费咨询",
    en: "Hi Ah Shuang, I'd like a free consultation",
  } as Bilingual,
};
