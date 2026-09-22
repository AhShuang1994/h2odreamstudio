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
  /** 首屏的滚动提示。第一屏文案还没浮上来，得有个东西告诉人这里要滚。 */
  scrollHint: { cn: "向下滚动", en: "Scroll" } as Bilingual,
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

/** 轮播里的一张服务卡。`badge` 可选 —— 只有「热门」那两档有。 */
export type ServiceCard = {
  id: string;
  pill: Bilingual;
  group: Bilingual;
  badge?: Bilingual;
  title: Bilingual;
  /** 方块里放的短名。方块只有一百来 px 宽，`title` 塞不下。 */
  short: Bilingual;
  tagline: Bilingual;
  desc: Bilingual;
  features: Bilingual[];
  delivery: Bilingual;
  revisions: Bilingual;
  price: Bilingual;
  href: string;
  cta: Bilingual;
  waMessage: Bilingual;
};

/**
 * 六个档位，与报价页同一套口径 —— 价格一律取 `prices.json`，这里不硬编码数字。
 * `pill` 是轮播上方那排跳转标签，短到能一行排完；`title` 才是卡面上的大标题。
 */
const serviceItems: ServiceCard[] = [
    {
      id: "starter",
      pill: { cn: "入门版", en: "Starter" } as Bilingual,
      group: { cn: "网站设计", en: "Website Design" } as Bilingual,
      title: { cn: "一页式落地页", en: "1-Page Landing" } as Bilingual,
      short: { cn: "落地页", en: "Landing Page" } as Bilingual,
      tagline: {
        cn: "把生意搬上网 —— 最简单的那个开头。",
        en: "Get your business online — the simplest way to start.",
      } as Bilingual,
      desc: {
        cn: "用可定制模板做一页干净、手机能看的落地页 —— 小生意要在网上看起来像回事，这些就够了。",
        en: "A clean, mobile-ready landing page built from a customizable template — everything a small business needs to look real online.",
      } as Bilingual,
      features: [
        { cn: "单页设计（最多 4 个区块）", en: "1-page design (up to 4 sections)" } as Bilingual,
        { cn: "手机响应式", en: "Mobile responsive" } as Bilingual,
        { cn: "可定制模板", en: "Customizable template" } as Bilingual,
        { cn: "1 个简单联络表单", en: "1 simple contact form" } as Bilingual,
      ],
      delivery: { cn: "3–5 天", en: "3–5 days" } as Bilingual,
      revisions: { cn: "1 次修改", en: "1 revision round" } as Bilingual,
      price: { cn: `${prices.starter} 起`, en: `From ${prices.starter}` } as Bilingual,
      href: "/landing-page",
      cta: { cn: "用入门版开始", en: "Start with Starter" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想问入门版落地页。",
        en: "Hi H2ODreamer! I'd like to ask about the Starter landing page.",
      } as Bilingual,
    },
    {
      id: "basic",
      pill: { cn: "进阶版", en: "Basic" } as Bilingual,
      group: { cn: "网站设计", en: "Website Design" } as Bilingual,
      badge: { cn: "热门", en: "Popular" } as Bilingual,
      title: { cn: "一页式落地页", en: "1-Page Landing" } as Bilingual,
      short: { cn: "落地页", en: "Landing Page" } as Bilingual,
      tagline: {
        cn: "真正能给你带来询盘的那一页。",
        en: "The page that actually brings you enquiries.",
      } as Bilingual,
      desc: {
        cn: "完全定制设计的落地页，内建 WhatsApp 在线聊天、基础 SEO 与数据分析 —— 让 Google 找得到你，客户联系得上你。",
        en: "A custom-designed landing page with WhatsApp chat, SEO basics and analytics built in — so Google can find you and customers can reach you.",
      } as Bilingual,
      features: [
        { cn: "单页设计（最多 5 个区块）", en: "1-page design (up to 5 sections)" } as Bilingual,
        { cn: "完全定制设计", en: "Fully customizable design" } as Bilingual,
        { cn: "基础 SEO", en: "Basic SEO" } as Bilingual,
        { cn: "WhatsApp 在线聊天", en: "WhatsApp live chat" } as Bilingual,
        { cn: "Facebook Pixel 与 Google Analytics", en: "Facebook Pixel & Google Analytics" } as Bilingual,
      ],
      delivery: { cn: "5–7 天", en: "5–7 days" } as Bilingual,
      revisions: { cn: "2 次修改", en: "2 revision rounds" } as Bilingual,
      price: { cn: `${prices.basic} 起`, en: `From ${prices.basic}` } as Bilingual,
      href: "/landing-page",
      cta: { cn: "做我的落地页", en: "Build my landing page" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想做进阶版落地页。",
        en: "Hi H2ODreamer! I'd like the Basic landing page.",
      } as Bilingual,
    },
    {
      id: "standard",
      pill: { cn: "企业版", en: "Standard" } as Bilingual,
      group: { cn: "网站设计", en: "Website Design" } as Bilingual,
      title: { cn: "多页企业官网", en: "Corporate Website" } as Bilingual,
      short: { cn: "企业官网", en: "Corporate Site" } as Bilingual,
      tagline: {
        cn: "一个跟得上生意长大的完整网站。",
        en: "A full website that grows with your business.",
      } as Bilingual,
      desc: {
        cn: "5 页网站，含进阶版的全部配置，再加自动 Google 收录 —— 让生意看起来成熟，也真的被找得到。",
        en: "A 5-page website with everything in Basic — plus auto Google indexing — so your business looks established and gets found.",
      } as Bilingual,
      features: [
        { cn: "5 页设计", en: "5-page design" } as Bilingual,
        { cn: "完全定制设计", en: "Fully customizable design" } as Bilingual,
        { cn: "基础 SEO 与 WhatsApp 在线聊天", en: "Basic SEO & WhatsApp live chat" } as Bilingual,
        { cn: "Facebook Pixel 与 Google Analytics", en: "Facebook Pixel & Google Analytics" } as Bilingual,
        { cn: "自动 Google 收录", en: "Auto Google indexing" } as Bilingual,
      ],
      delivery: { cn: "1–2 周", en: "1–2 weeks" } as Bilingual,
      revisions: { cn: "2 次修改", en: "2 revision rounds" } as Bilingual,
      price: { cn: `${prices.standard} 起`, en: `From ${prices.standard}` } as Bilingual,
      href: "/landing-page",
      cta: { cn: "做我的官网", en: "Build my website" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想做一个多页企业官网。",
        en: "Hi H2ODreamer! I'd like a corporate website.",
      } as Bilingual,
    },
    {
      id: "wedding-standard",
      pill: { cn: "标准版", en: "Standard" } as Bilingual,
      group: { cn: "婚礼与电商", en: "Wedding & E-Commerce" } as Bilingual,
      title: { cn: "婚礼电子请柬", en: "Wedding E-Invitation" } as Bilingual,
      short: { cn: "电子喜帖", en: "Wedding Invite" } as Bilingual,
      tagline: {
        cn: "一张像迷你婚礼网站的杂志感请柬。",
        en: "An editorial invitation that feels like a mini wedding website.",
      } as Bilingual,
      desc: {
        cn: "多区块滚动设计，带滚动动效、杂志式相册与场地详情 —— 全部装进一个可转发的链接。",
        en: "Multi-section scrolling design with scroll animations, editorial photo gallery, and venue details — all in one shareable link.",
      } as Bilingual,
      features: [
        { cn: "多区块滚动版面", en: "Multi-section scrolling layout" } as Bilingual,
        { cn: "滚动动效与杂志式相册", en: "Scroll animations & editorial gallery" } as Bilingual,
        { cn: "场地详情与 Google Maps 导航", en: "Venue details & Google Maps navigation" } as Bilingual,
        { cn: "专属配色，最多 6 张照片", en: "Custom colors, up to 6 photos" } as Bilingual,
      ],
      delivery: { cn: "4–6 天", en: "4–6 days" } as Bilingual,
      revisions: { cn: "1 次修改", en: "1 revision round" } as Bilingual,
      price: { cn: `${prices.weddingStandard} 起`, en: `From ${prices.weddingStandard}` } as Bilingual,
      href: "/wedding-basic",
      cta: { cn: "做我的请柬", en: "Design my invite" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想做标准版电子喜帖。",
        en: "Hi H2ODreamer! I'd like the Standard wedding e-invitation.",
      } as Bilingual,
    },
    {
      id: "wedding-premium",
      pill: { cn: "定制版", en: "Premium" } as Bilingual,
      group: { cn: "婚礼与电商", en: "Wedding & E-Commerce" } as Bilingual,
      badge: { cn: "热门", en: "Popular" } as Bilingual,
      title: { cn: "婚礼电子请柬", en: "Wedding E-Invitation" } as Bilingual,
      short: { cn: "电子喜帖", en: "Wedding Invite" } as Bilingual,
      tagline: {
        cn: "宾客会忍不住转发的那种请柬。",
        en: "An invitation your guests won't stop sharing.",
      } as Bilingual,
      desc: {
        cn: "多区块设计，带 RSVP、倒数计时、动画与背景音乐 —— 一个会惊艳人的迷你婚礼网站。",
        en: "Multi-section design with RSVP, countdown, animations & background music — a mini wedding website that wows.",
      } as Bilingual,
      features: [
        { cn: "多区块版面，丝滑滚动", en: "Multi-section layout with smooth scroll" } as Bilingual,
        { cn: "内建 RSVP —— 回复一目了然", en: "Built-in RSVP — track responses easily" } as Bilingual,
        { cn: "实时倒数计时", en: "Live countdown timer to your big day" } as Bilingual,
        { cn: "精致动画与背景音乐", en: "Elegant animations & background music" } as Bilingual,
        { cn: "你的照片与专属配色", en: "Your photos & custom color palette" } as Bilingual,
      ],
      delivery: { cn: "5–7 天", en: "5–7 days" } as Bilingual,
      revisions: { cn: "2 次修改", en: "2 revision rounds" } as Bilingual,
      price: { cn: `${prices.weddingPremium} 起`, en: `From ${prices.weddingPremium}` } as Bilingual,
      href: "/wedding-premium",
      cta: { cn: "做我的定制请柬", en: "Design my premium invite" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想做定制版电子喜帖。",
        en: "Hi H2ODreamer! I'd like the Premium wedding e-invitation.",
      } as Bilingual,
    },
    {
      id: "shopify",
      pill: { cn: "Shopify 迁移", en: "Shopify" } as Bilingual,
      group: { cn: "婚礼与电商", en: "Wedding & E-Commerce" } as Bilingual,
      title: { cn: "Shopify 迁移", en: "Shopify Migration" } as Bilingual,
      short: { cn: "店铺迁移", en: "Migration" } as Bilingual,
      tagline: {
        cn: "搬到 Shopify，一个客户也不会丢。",
        en: "Move to Shopify without losing a single customer.",
      } as Bilingual,
      desc: {
        cn: "完整迁移 —— 产品、页面、SEO 排名与追踪一起搬，附后台培训，上线第一天你就会用。",
        en: "Full migration — products, pages, SEO rankings & tracking — with admin training so you're confident from day one.",
      } as Bilingual,
      features: [
        { cn: "产品与页面完整迁移", en: "Complete product & page migration" } as Bilingual,
        { cn: "301 重定向 —— 保住 Google 排名", en: "301 redirects — protect your Google rankings" } as Bilingual,
        { cn: "GA4 电商追踪配置", en: "GA4 ecommerce tracking setup" } as Bilingual,
        { cn: "后台培训与交接", en: "Admin training & handover session" } as Bilingual,
      ],
      delivery: { cn: "2–4 周", en: "2–4 weeks" } as Bilingual,
      revisions: { cn: "2 次修改", en: "2 revision rounds" } as Bilingual,
      price: { cn: `${prices.shopify} 起`, en: `From ${prices.shopify}` } as Bilingual,
      href: "/shopify-migration",
      cta: { cn: "迁移我的店", en: "Migrate my store" } as Bilingual,
      waMessage: {
        cn: "Hi H2ODreamer！我想把店迁移到 Shopify。",
        en: "Hi H2ODreamer! I'd like to migrate my store to Shopify.",
      } as Bilingual,
    },
];

export const services = {
  eyebrow: { cn: "服务", en: "Services" } as Bilingual,
  heading: {
    cn: "帮你把生意，搬到客户找得到的地方",
    en: "Getting your business where customers can find it",
  } as Bilingual,
  items: serviceItems,
};

export const selectedWork = {
  eyebrow: { cn: "精选作品", en: "Selected work" } as Bilingual,
  heading: {
    cn: "每个作品背后，都有一个设计决策",
    en: "Every project has a design decision behind it",
  } as Bilingual,
  cta: { cn: "看全部案例拆解", en: "See all case studies" } as Bilingual,
  /** 左下角信息卡的三行小标题。内容全部摘自对应案例页的「一眼看懂」表，不另编。 */
  labels: {
    goal: { cn: "核心任务", en: "The one goal" } as Bilingual,
    action: { cn: "主 CTA", en: "Primary CTA" } as Bilingual,
    palette: { cn: "配色", en: "Palette" } as Bilingual,
    read: { cn: "看设计拆解", en: "Read case study" } as Bilingual,
  },
  items: [
    {
      title: { cn: "CoolTech 冷气 · 上门服务落地页", en: "CoolTech Aircon · Service landing page" } as Bilingual,
      name: "CoolTech Aircon",
      tag: { cn: "落地页", en: "Landing page" } as Bilingual,
      industry: { cn: "上门服务 / 冷气维修", en: "On-site service / aircon repair" } as Bilingual,
      img: "/assets/portfolio/landing-aircon-desktop.webp",
      href: "/case-studies/cooltech-aircon",
      job: {
        cn: "这个页面只有一个任务，让一个「家里冷气刚坏」的陌生访客，在 60 秒内按下 WhatsApp 预约。",
        en: "This page has one job. Take a stranger whose aircon just died and get them to tap WhatsApp within 60 seconds.",
      } as Bilingual,
      goal: { cn: "热意向访客 → WhatsApp 预约", en: "Hot-intent visitor → WhatsApp booking" } as Bilingual,
      action: { cn: "一键 WhatsApp（预填讯息）", en: "One-tap WhatsApp (pre-filled)" } as Bilingual,
      palette: { cn: "冷静蓝 #1A73E8 + WhatsApp 绿", en: "Cool blue #1A73E8 + WhatsApp green" } as Bilingual,
    },
    {
      title: { cn: "Glow Seoul · 护肤产品落地页", en: "Glow Seoul · Skincare landing page" } as Bilingual,
      name: "Glow Seoul",
      tag: { cn: "落地页", en: "Landing page" } as Bilingual,
      industry: { cn: "护肤 / 美妆单品", en: "Skincare / beauty product" } as Bilingual,
      img: "/assets/portfolio/landing-beauty-desktop.webp",
      href: "/case-studies/glow-seoul-skincare",
      job: {
        cn: "一个任务，让一个怕踩雷的敏感肌客户，把每一个顾虑都解掉，直到「买这一瓶」感觉很安全。",
        en: "One job. Take a sceptical, sensitive-skin shopper and remove every doubt until buying one product feels safe.",
      } as Bilingual,
      goal: { cn: "将信将疑 → 放心下单", en: "Sceptic → confident buyer" } as Bilingual,
      action: { cn: "单一下单 / WhatsApp 订购", en: "One focused buy / WhatsApp order" } as Bilingual,
      palette: { cn: "柔粉 + 薄荷 + 玫瑰 #E8919A", en: "Soft blush + mint + rose #E8919A" } as Bilingual,
    },
    {
      title: { cn: "MUSE Apparel · Shopify 服装网店", en: "MUSE Apparel · Shopify store" } as Bilingual,
      name: "MUSE Apparel",
      tag: { cn: "Shopify", en: "Shopify" } as Bilingual,
      industry: { cn: "时尚 / 服装零售", en: "Fashion / apparel retail" } as Bilingual,
      img: "/assets/portfolio/shopify-fashion-desktop.webp",
      href: "/case-studies/muse-apparel-shopify",
      job: {
        cn: "它的任务不是一个 WhatsApp，而是「逛 → 加购 → 结账」，最好还会回头。所以它是网店，不是着陆页。",
        en: "The job isn't one WhatsApp. It's browse → add to cart → check out, and ideally come back. That's why it's a store, not a landing page.",
      } as Bilingual,
      goal: { cn: "逛 → 加购 → 结账 → 复购", en: "Browse → cart → checkout → repeat" } as Bilingual,
      action: { cn: "选购 / 加入购物车", en: "Shop / Add to cart" } as Bilingual,
      palette: { cn: "暖白 + 金 · Playfair Display", en: "Warm ivory + gold · Playfair Display" } as Bilingual,
    },
    {
      title: { cn: "Wok & Flame · 餐厅落地页", en: "Wok & Flame · Restaurant landing page" } as Bilingual,
      name: "Wok & Flame",
      tag: { cn: "餐饮", en: "F&B" } as Bilingual,
      industry: { cn: "餐饮 / 餐厅", en: "F&B / restaurant" } as Bilingual,
      img: "/assets/portfolio/landing-fnb-1-desktop.webp",
      href: "/case-studies/wok-and-flame-fnb",
      job: {
        cn: "一个任务，让一个正在滑手机找「Bangsar 晚餐」的饿客，在一次滑动里 WhatsApp 订位。",
        en: "One job. Take a hungry visitor scrolling for \"dinner in Bangsar\" and get them to WhatsApp a reservation in one scroll.",
      } as Bilingual,
      goal: { cn: "勾起食欲 → WhatsApp 订位", en: "Appetite → WhatsApp reservation" } as Bilingual,
      action: { cn: "一键 WhatsApp（预填讯息）", en: "One-tap WhatsApp (pre-filled)" } as Bilingual,
      palette: { cn: "暗黑 #1A1A1A + 火焰橙 #E85D2C + 金", en: "Dark #1A1A1A + flame #E85D2C + gold" } as Bilingual,
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
