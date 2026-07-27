import type { Bilingual } from "./site";

export const aboutMeta = {
  title: "关于我们 · About · H2ODreamer Studio",
  description:
    "认识阿爽 —— H2ODreamer Studio 创办人，超过 5 年网站设计经验，专为马来西亚的小公司搭建第一个网站，让每个梦想都有一个家。Meet Ah Shuang, founder of H2ODreamer Studio.",
};

export const aboutHeader = {
  eyebrow: { cn: "关于我们", en: "About" } as Bilingual,
  title: { cn: "嗨，我是阿爽。", en: "Hi, I'm Ah Shuang." } as Bilingual,
  lede: {
    cn: "我帮马来西亚的小公司，搭建他们的第一个网站 —— 让每一个梦想，终于有一个可以生根成长的家。",
    en: "I help Malaysia's small businesses build their very first website — so every dream finally has a home to grow from.",
  } as Bilingual,
};

export const aboutQuickAnswer = {
  cn: "H2ODreamer Studio 由阿爽（Hui Huang Ong）经营 —— 一位拥有 5 年以上经验、扎根马来西亚的网站设计师。工作室专注为小公司、初次创业者和准新人搭建他们的第一个网站，注重转化、中英双语，并内建 SEO 与数据分析。我们相信：每个梦想，都该有一个家。",
  en: "H2ODreamer Studio is run by Ah Shuang (Hui Huang Ong), a Malaysia-based web designer with 5+ years of experience. The studio focuses on building first websites for small businesses, first-time founders and couples — conversion-focused, bilingual (English / 中文), with SEO and analytics built in. The belief: every dream deserves a home.",
} as Bilingual;

export const aboutFounder = {
  name: "阿爽 · Ah Shuang",
  avatar: "/assets/founder-avatar.webp",
  role: {
    cn: "创办人 · 设计师 · 开发者",
    en: "Founder · Designer · Developer",
  } as Bilingual,
  bio: {
    cn: "大家都叫我阿爽 —— 这个小名也方便别人记得我。我做网站设计这行超过 5 年：从在公司里帮大企业做项目，到后来决定自己出来。因为我发现，最让我有成就感的，是帮马来西亚的小生意主、初次创业的人，把脑海里的想法，变成一个真正属于他们的网站。每一个项目，都是某个人梦想的第一步 —— 而我想做的，是让这个梦想有一个能生根、能长大的家。",
    en: "Everyone calls me Ah Shuang — it's the name people remember me by. I've been designing and building websites for over 5 years: first for established companies, then on my own. Because what gives me the most meaning is helping Malaysia's small business owners and first-time founders turn an idea in their head into a website that's truly theirs. Every project is someone's first step — and what I really want is to give that dream a home where it can take root and grow.",
  } as Bilingual,
};

/** 品牌自述的三行签名句，是「水母题」的源头，见 CONTEXT.md。 */
export const aboutQuote: Bilingual[] = [
  { cn: "每个梦想，都该有一个家。", en: "Every dream deserves a home." },
  {
    cn: "重要的不只是踏出第一步，而是以始为终 ——",
    en: "It's not only about taking the first step — it's about seeing it through, from beginning to end.",
  },
  {
    cn: "从第一滴水开始，陪它细水长流，直到汇成一片海。",
    en: "From the very first drop, I stay with you, until it grows into an ocean.",
  },
];

export const aboutStory = {
  heading: { cn: "从一滴水，到一片海", en: "From one drop, to an ocean" } as Bilingual,
  body: {
    cn: "每一家大公司，都曾经是某人脑海里的一个小念头。我相信，每一个有梦想的人，都值得一个属于自己的起点。H2ODreamer Studio 就是那第一滴水 —— 帮你从零开始，打造品牌形象，细水长流地积累，直到你的存在，被那些重要的人看见。",
    en: "Every great company started as a small idea in someone's mind. I believe everyone with a dream deserves a starting point. H2ODreamer Studio is that first drop — we help you build from zero, shape your brand, and grow steadily, drop by drop, until your presence reaches the people who matter.",
  } as Bilingual,
};

export const aboutWhy = {
  heading: { cn: "为什么选我", en: "Why work with me" } as Bilingual,
  items: [
    {
      icon: "◆",
      title: { cn: "5 年以上经验", en: "5+ years of experience" } as Bilingual,
      body: {
        cn: "从企业项目到小生意网站，各种类型我都做过。",
        en: "From corporate projects to small-business sites — I've built across the board.",
      } as Bilingual,
    },
    {
      icon: "◇",
      title: { cn: "双语 · 一对一", en: "Bilingual & personal" } as Bilingual,
      body: {
        cn: "你直接和我沟通，中英都行 —— 没有中间人，没有客户经理转接。",
        en: "You talk directly to me, in English or 中文 — no middleman, no account managers.",
      } as Bilingual,
    },
    {
      icon: "○",
      title: { cn: "诚实建议", en: "Honest advice" } as Bilingual,
      body: {
        cn: "我会告诉你生意真正需要什么 —— 哪怕是更小的套餐。绝不强推。",
        en: "I tell you what your business actually needs — even if it's a smaller package. No hard sell.",
      } as Bilingual,
    },
    {
      icon: "◎",
      title: { cn: "为被看见而做", en: "Built to be found" } as Bilingual,
      body: {
        cn: "每个网站都标配 SEO 基础、Google 分析和 WhatsApp 整合。",
        en: "Every site ships with SEO basics, Google Analytics and WhatsApp built in as standard.",
      } as Bilingual,
    },
  ],
};

export const aboutCta = {
  heading: { cn: "让你的梦想，有个家", en: "Let's give your dream a home" } as Bilingual,
  whatsapp: {
    cn: "💬 WhatsApp 咨询，免费顾问",
    en: "💬 WhatsApp Us — Free Consultation",
  } as Bilingual,
  whatsappMessage: "Hi H2ODreamer! 我想了解更多关于网站设计的服务。",
  secondary: { cn: "📨 更多联系方式", en: "📨 Contact options" } as Bilingual,
};
