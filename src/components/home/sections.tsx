import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow, OrbSlot } from "@/components/ui";
import { site } from "@/content/site";
import {
  quickAnswer,
  services,
  selectedWork,
  founder,
  faq,
  contactCta,
} from "@/content/home";

/**
 * 七个区块的视觉外壳。**结构与文案冻结**（#90）：一个不加不减、顺序不动、
 * 文案一字不改，这里只换视觉。
 *
 * 三条贯穿全篇的规矩，改动时别破：
 *   1. 层级靠「底色 → surface-1 → surface-2」这条阶梯加发丝描边，**不用投影**
 *   2. accent 只出现在眉标、主按钮、序号这几处，不做底色、不做光晕
 *   3. 圆角 12px（卡片）/ 8px（按钮），不用胶囊、不用 24px
 */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-24 sm:py-32 ${className}`}>
      {children}
    </section>
  );
}

/** 区块标题。负字距、衬线、左对齐 —— 全站没有居中对称的区块头。 */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      data-reveal
      className="mt-4 max-w-[22ch] text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.12] text-ink"
    >
      {children}
    </h2>
  );
}

/**
 * 序号。01 / 02 / 03 这种编号是「有人排过版」的痕迹，不是装饰。
 *
 * 用 ink-subtle 而不是更暗的 ink-faint：实测 ink-faint 对底色只有 3.47:1，
 * 达不到正文 4.5:1 的对比度下限。ink-faint 只留给 aria-hidden 的纯装饰字符。
 */
function Ordinal({ n }: { n: number }) {
  return (
    <span className="font-sans text-xs tabular-nums tracking-[0.08em] text-ink-subtle">
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function QuickAnswer({ lang }: { lang: Lang }) {
  return (
    <Section id="what">
      <Container>
        <div className="rounded-xl border border-hairline bg-surface-1 p-7 sm:p-10">
          {/* 重画前这里是一个 ⚡ emoji 加胶囊底色。emoji 当图示在自家反 AI
              清单上；换成一小段 accent 竖线 + 标签，安静得多也更像排版。 */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-3.5 w-0.5 bg-accent" />
            <span className="text-[13px] font-medium tracking-[0.03em] text-accent">
              {t({ cn: "快速答案", en: "Quick answer" }, lang)}
            </span>
          </div>
          <h2
            data-reveal
            className="mt-5 max-w-[26ch] text-[clamp(1.5rem,3vw,2.125rem)] leading-[1.15] text-ink"
          >
            {t(quickAnswer.heading, lang)}
          </h2>
          <p
            data-reveal
            className="mt-5 max-w-[62ch] text-[1.0625rem] leading-[1.65] text-ink-muted"
          >
            {t(quickAnswer.body, lang)}
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline pt-8 sm:grid-cols-4">
            {quickAnswer.stats.map((s, i) => (
              <div key={i}>
                <dt className="text-[1.75rem] leading-none tracking-[-0.02em] text-ink">
                  {t(s.value, lang)}
                </dt>
                <dd className="mt-2.5 text-xs leading-relaxed text-ink-subtle">
                  {t(s.label, lang)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}

export function Services({ lang }: { lang: Lang }) {
  return (
    <Section id="services" className="relative overflow-hidden">
      {/* 靛紫球体两处，素材归 #67。位置与合成方式已定死，版面不依赖它。 */}
      <OrbSlot id="services-left" className="-left-[12%] top-[8%] h-[26rem] w-[26rem]" />
      <OrbSlot
        id="services-right"
        className="-right-[10%] bottom-[4%] h-[22rem] w-[22rem]"
      />
      <Container className="relative">
        <Eyebrow>{t(services.eyebrow, lang)}</Eyebrow>
        <SectionHeading>{t(services.heading, lang)}</SectionHeading>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
          {services.items.map((s, i) => (
            <a
              key={i}
              href={localize(s.href, lang)}
              className="group flex flex-col bg-surface-1 p-7 transition-colors duration-150 hover:bg-surface-2"
            >
              <div className="flex items-center justify-between gap-4">
                <Ordinal n={i + 1} />
                <span className="text-sm tabular-nums text-accent">
                  {t(s.price, lang)}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-medium tracking-[-0.01em] text-ink">
                {t(s.title, lang)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {t(s.desc, lang)}
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-subtle transition-colors group-hover:text-ink">
                {t({ cn: "了解更多", en: "Learn more" }, lang)}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function SelectedWork({ lang }: { lang: Lang }) {
  return (
    <Section id="work">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>{t(selectedWork.eyebrow, lang)}</Eyebrow>
            <SectionHeading>{t(selectedWork.heading, lang)}</SectionHeading>
          </div>
          <a
            href="/case-studies/"
            className="group hidden shrink-0 items-center gap-1.5 border-b border-hairline-strong pb-1 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink sm:inline-flex"
          >
            {t(selectedWork.cta, lang)}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {selectedWork.items.map((w, i) => (
            <a
              key={i}
              href={w.href}
              className="group overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-colors duration-150 hover:border-hairline-strong"
            >
              {/* 这个裁切框就是 #88 遮罩视差要用的框：图比框大，滚动时框内位移。 */}
              <div className="aspect-[16/10] overflow-hidden border-b border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.img}
                  alt={t(w.title, lang)}
                  width={800}
                  height={500}
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-6">
                <div>
                  <span className="text-xs tracking-[0.03em] text-accent">
                    {t(w.tag, lang)}
                  </span>
                  <h3 className="mt-2 text-[15px] font-medium text-ink">
                    {t(w.title, lang)}
                  </h3>
                </div>
                <span
                  className="text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden
                >
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Founder({ lang }: { lang: Lang }) {
  return (
    <Section id="founder" className="border-y border-hairline bg-surface-1">
      <Container>
        <div className="grid items-start gap-10 md:grid-cols-[260px_1fr] md:gap-16">
          {/* 真实照片是这一屏的锚点，不用抽象示意图。#88 的遮罩视差也挂在这。 */}
          <div className="overflow-hidden rounded-xl border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={founder.avatar}
              alt={t(founder.name, lang)}
              width={260}
              height={325}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div>
            <Eyebrow>{t(founder.eyebrow, lang)}</Eyebrow>
            <div className="mt-4 text-xl tracking-[-0.01em] text-ink">
              {t(founder.name, lang)}
            </div>
            <div className="mt-1.5 text-sm text-ink-subtle">{t(founder.role, lang)}</div>
            <p
              data-reveal
              className="mt-7 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-ink-muted"
            >
              {t(founder.bio, lang)}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function Faq({ lang }: { lang: Lang }) {
  return (
    <Section id="faq">
      <Container>
        <Eyebrow>{t(faq.eyebrow, lang)}</Eyebrow>
        <SectionHeading>{t(faq.heading, lang)}</SectionHeading>
        <div className="mt-12 border-t border-hairline">
          {faq.items.map((f, i) => (
            <details key={i} className="group border-b border-hairline py-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[15px] font-medium text-ink transition-colors hover:text-accent-hover">
                <span className="flex gap-5">
                  <Ordinal n={i + 1} />
                  <span>{t(f.q, lang)}</span>
                </span>
                <span
                  className="mt-0.5 shrink-0 text-lg leading-none text-ink-faint transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-[62ch] pl-[2.9rem] text-sm leading-relaxed text-ink-muted">
                {t(f.a, lang)}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function ContactCta({ lang }: { lang: Lang }) {
  return (
    <Section id="contact">
      <Container>
        {/* 左对齐，不居中 —— 居中对称的收尾 CTA 是模板骨架里最眼熟的一块。
            重画前这里还压着一团 blur-[100px] 的 accent 光晕，一并拿掉，
            位置留给靛紫球体（#67）。 */}
        <div className="relative overflow-hidden rounded-xl border border-hairline bg-surface-1 px-7 py-14 sm:px-14 sm:py-20">
          <OrbSlot
            id="contact"
            className="-right-[6%] -top-[20%] h-[24rem] w-[24rem]"
          />
          <div className="relative max-w-[38rem]">
            <Eyebrow>{t(contactCta.eyebrow, lang)}</Eyebrow>
            <h2
              data-reveal
              className="mt-4 text-[clamp(1.875rem,4vw,3rem)] leading-[1.1] text-ink"
            >
              {t(contactCta.heading, lang)}
            </h2>
            <p
              data-reveal
              className="mt-6 max-w-[46ch] text-[1.0625rem] leading-[1.65] text-ink-muted"
            >
              {t(contactCta.body, lang)}
            </p>
            <div className="mt-10">
              <Button href={site.waLink(t(contactCta.waMessage, lang))} external>
                {t(contactCta.cta, lang)}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
