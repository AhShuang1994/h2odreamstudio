import type { Bilingual } from "./site";

export const contactMeta = {
  title: "联系我们 · Contact · H2ODreamer Studio",
  description:
    "联系 H2ODreamer Studio — WhatsApp +60 17-513 8694，通常 1 小时内回复，或电邮 H2Odreamer@outlook.com。服务全马来西亚，中英双语，每个项目从免费 30 分钟咨询开始。",
};

export const contactHeader = {
  eyebrow: { cn: "联系我们", en: "Contact" } as Bilingual,
  title: {
    cn: "聊聊你的项目",
    en: "Let's talk about your project",
  } as Bilingual,
  lede: {
    cn: "有梦想，却不知道从哪里开始？随时联系我们，我们会就你的生意真正需要什么给出诚实建议，绝不强推。",
    en: "Have a dream but not sure where to start? Reach out — we'll give you honest advice on what your business actually needs. No hard sell.",
  } as Bilingual,
};

export const contactQuickAnswer = {
  cn: "联系 H2ODreamer Studio 最快的方式是 WhatsApp +60 17-513 8694，我们通常在 1 小时内回复。也可以电邮 H2Odreamer@outlook.com。我们是马来西亚的网站设计工作室，提供中英双语服务，每个项目都从免费 30 分钟 WhatsApp 咨询开始。",
  en: "The fastest way to reach H2ODreamer Studio is WhatsApp at +60 17-513 8694 — we usually reply within 1 hour. You can also email H2Odreamer@outlook.com. We are a Malaysia-based web design studio, work in English and Chinese, and every project starts with a free 30-minute WhatsApp consultation.",
} as Bilingual;

export const contactMethods = [
  {
    icon: "💬",
    name: { cn: "WhatsApp", en: "WhatsApp" } as Bilingual,
    value: "+60 17-513 8694",
    href: "https://wa.me/60175138694?text=Hi%20H2ODreamer!%20%E6%88%91%E6%83%B3%E4%BA%86%E8%A7%A3%E6%9B%B4%E5%A4%9A%E5%85%B3%E4%BA%8E%E7%BD%91%E7%AB%99%E8%AE%BE%E8%AE%A1%E7%9A%84%E6%9C%8D%E5%8A%A1%E3%80%82",
    note: {
      cn: "最快 — 通常 1 小时内回复",
      en: "Fastest — usually replies within 1 hour",
    } as Bilingual,
  },
  {
    icon: "📧",
    name: { cn: "电邮", en: "Email" } as Bilingual,
    value: "H2Odreamer@outlook.com",
    href: "mailto:H2Odreamer@outlook.com",
    note: {
      cn: "适合详细需求和文件",
      en: "For detailed briefs & documents",
    } as Bilingual,
  },
  {
    icon: "📕",
    name: { cn: "小红书", en: "Xiaohongshu" } as Bilingual,
    value: "阿爽（网页设计MY）",
    href: "https://xhslink.com/m/1U2Ou01jY2E",
    note: { cn: "看作品和建议", en: "See our work & tips" } as Bilingual,
  },
  {
    icon: "📸",
    name: { cn: "Instagram", en: "Instagram" } as Bilingual,
    value: "@h2odreamer.studio",
    href: "https://www.instagram.com/h2odreamer.studio/",
    note: { cn: "看作品和建议", en: "See our work & tips" } as Bilingual,
  },
];

export const studioInfo = {
  heading: { cn: "工作室资料", en: "Studio details" } as Bilingual,
  rows: [
    {
      key: { cn: "公司名称", en: "Business name" } as Bilingual,
      value: { cn: "H2ODreamer Studio", en: "H2ODreamer Studio" } as Bilingual,
    },
    {
      key: { cn: "创办人", en: "Founder" } as Bilingual,
      value: { cn: "Hui Huang Ong", en: "Hui Huang Ong" } as Bilingual,
    },
    {
      key: { cn: "所在地", en: "Based in" } as Bilingual,
      value: { cn: "马来西亚 柔佛", en: "Johor, Malaysia" } as Bilingual,
    },
    {
      key: { cn: "服务地区", en: "Service area" } as Bilingual,
      value: {
        cn: "马来西亚全国 + 远程服务海外客户",
        en: "Malaysia (nationwide) + remote worldwide",
      } as Bilingual,
    },
    {
      key: { cn: "沟通语言", en: "Languages" } as Bilingual,
      value: { cn: "中文 / English", en: "English / 中文" } as Bilingual,
    },
    {
      key: { cn: "营业时间", en: "Business hours" } as Bilingual,
      value: {
        cn: "周一至周六 9:00–19:00（GMT+8）",
        en: "Mon–Sat, 9:00am–7:00pm (GMT+8)",
      } as Bilingual,
    },
    {
      key: { cn: "WhatsApp", en: "WhatsApp" } as Bilingual,
      value: { cn: "+60 17-513 8694", en: "+60 17-513 8694" } as Bilingual,
    },
  ],
};

export const contactCtaBlock = {
  heading: {
    cn: "准备好迈出第一步了吗？",
    en: "Ready to take your first step?",
  } as Bilingual,
  whatsapp: {
    cn: "💬 WhatsApp 咨询，免费顾问",
    en: "💬 WhatsApp Us — Free Consultation",
  } as Bilingual,
  whatsappMessage: "Hi H2ODreamer! 我想了解更多关于网站设计的服务。",
  email: { cn: "📧 发送邮件", en: "📧 Email Us" } as Bilingual,
};

/**
 * 这 6 条在页面上是可见的，所以配套的 FAQPage 结构化数据合规。
 * about 与 pricing 的 FAQ 结构化数据在旧站上**页面不可见**，属于 Google
 * 明令禁止的用法，迁移时已移除；补可见 FAQ 另有一张票。
 */
export const contactFaq = {
  heading: { cn: "联系常见问题", en: "Contact FAQ" } as Bilingual,
  items: [
    {
      q: {
        cn: "怎样联系 H2ODreamer Studio？",
        en: "How do I contact H2ODreamer Studio?",
      } as Bilingual,
      a: {
        cn: "最快的方式是 WhatsApp +60 17-513 8694，营业时间内我们通常 1 小时内回复。也可以电邮 H2Odreamer@outlook.com，或在小红书和 Instagram（@h2odreamer.studio）上找我们。",
        en: "The fastest way is WhatsApp at +60 17-513 8694 — we usually reply within 1 hour during business hours. You can also email H2Odreamer@outlook.com or reach us on Xiaohongshu and Instagram (@h2odreamer.studio).",
      } as Bilingual,
    },
    {
      q: { cn: "咨询要收费吗？", en: "Is the consultation free?" } as Bilingual,
      a: {
        cn: "不收费。每个项目都从免费 30 分钟 WhatsApp 咨询开始。我们会就你的生意真正需要什么给出诚实建议 — 不强推、无义务。",
        en: "Yes. Every project starts with a free 30-minute WhatsApp consultation. We give honest advice on what your business actually needs — no hard sell and no obligation.",
      } as Bilingual,
    },
    {
      q: {
        cn: "你们用什么语言沟通？",
        en: "What languages do you communicate in?",
      } as Bilingual,
      a: {
        cn: "我们提供中英双语服务，你用哪种语言都可以，怎么舒服怎么来。",
        en: "We work in both English and Chinese (中文), so you can talk to us in whichever you're most comfortable with.",
      } as Bilingual,
    },
    {
      q: {
        cn: "你们服务马来西亚以外的客户吗？",
        en: "Do you work with clients outside Malaysia?",
      } as Bilingual,
      a: {
        cn: "我们位于马来西亚，服务全国客户。我们也通过 WhatsApp、电邮和视频远程协作，所以海外客户同样欢迎。",
        en: "We are based in Malaysia and serve clients nationwide. We also work remotely over WhatsApp, email and video call, so overseas clients are welcome too.",
      } as Bilingual,
    },
    {
      q: { cn: "多快会收到回复？", en: "How fast will I get a reply?" } as Bilingual,
      a: {
        cn: "营业时间内（周一至周六）我们通常 1 小时内回复。晚上发来的信息，我们会在隔天上班时间回复。",
        en: "We usually reply within 1 hour during business hours (Monday to Saturday). Messages sent at night are answered the next working morning.",
      } as Bilingual,
    },
    {
      q: {
        cn: "联系之后的流程是怎样的？",
        en: "What happens after I reach out?",
      } as Bilingual,
      a: {
        cn: "先是免费 WhatsApp 咨询，了解你的需求和预算，然后给出报价和设计方向。你确认后我们开始制作 — 上线前你会先审阅。",
        en: "First a free WhatsApp consultation to understand your needs and budget, then a quote and design direction. Once you approve, we build — and you review before launch.",
      } as Bilingual,
    },
  ],
};
