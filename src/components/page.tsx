import type { ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Container, Eyebrow } from "@/components/ui";
import type { Bilingual } from "@/content/site";

/**
 * 三个核心页共用的原语。视觉规矩与首页七区块完全一致（#90）——
 * 层级走表面阶梯 + 发丝描边、不用投影、圆角 12px、accent 只做强调。
 */

/** 内容页顶部：眉标 + 标题 + 导语。 */
export function PageHeader({
  lang,
  eyebrow,
  title,
  lede,
}: {
  lang: Lang;
  eyebrow: Bilingual;
  title: Bilingual;
  lede?: Bilingual;
}) {
  return (
    <header className="border-b border-hairline pt-32 pb-14 sm:pt-40 sm:pb-20">
      <Container>
        <Eyebrow>{t(eyebrow, lang)}</Eyebrow>
        <h1
          data-reveal
          className="mt-5 max-w-[20ch] text-[clamp(2.25rem,5.2vw,3.75rem)] leading-[1.06] tracking-[-0.03em] text-ink"
        >
          {t(title, lang)}
        </h1>
        {lede && (
          <p
            data-reveal
            className="mt-7 max-w-[52ch] text-[1.125rem] leading-[1.65] text-ink-muted"
          >
            {t(lede, lang)}
          </p>
        )}
      </Container>
    </header>
  );
}

/**
 * 「快速答案」块 —— 每页开头一段自足的直述性回答，专供 AI 检索时整段引用。
 * 这是本站流量策略的核心结构，见 CONTEXT.md 的「快速答案」词条，不要删。
 */
export function QuickAnswerCard({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <Container>
      <div className="rounded-xl border border-hairline bg-surface-1 p-7 sm:p-10">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-3.5 w-0.5 bg-accent" />
          <span className="text-[13px] font-medium tracking-[0.03em] text-accent">
            {t({ cn: "快速答案", en: "Quick answer" }, lang)}
          </span>
        </div>
        <div className="mt-5 max-w-[62ch] text-[1.0625rem] leading-[1.65] text-ink-muted">
          {children}
        </div>
      </div>
    </Container>
  );
}

/** 内容页的区块容器。 */
export function PageSection({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`}>
      {children}
    </section>
  );
}

/** 内容页的二级标题。 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      data-reveal
      className="max-w-[24ch] text-[clamp(1.625rem,3.4vw,2.375rem)] leading-[1.14] text-ink"
    >
      {children}
    </h2>
  );
}

/**
 * 三个核心页收尾都用同一块行动面板 —— 抽出来是为了三处长一个样。
 *
 * 左对齐、不居中：居中对称的收尾 CTA 是模板骨架里最眼熟的一块，
 * 首页的 ContactCta 也是同一个处理。
 */
export function CtaPanel({
  lang,
  eyebrow,
  heading,
  children,
}: {
  lang: Lang;
  eyebrow?: Bilingual;
  heading: Bilingual;
  children: ReactNode;
}) {
  return (
    <Container>
      <div className="rounded-xl border border-hairline bg-surface-1 px-7 py-14 sm:px-14 sm:py-20">
        <div className="max-w-[38rem]">
          <Eyebrow>{t(eyebrow ?? { cn: "开始", en: "Get started" }, lang)}</Eyebrow>
          <h2
            data-reveal
            className="mt-4 text-[clamp(1.75rem,3.6vw,2.625rem)] leading-[1.12] text-ink"
          >
            {t(heading, lang)}
          </h2>
          <div className="mt-9 flex flex-wrap gap-3">{children}</div>
        </div>
      </div>
    </Container>
  );
}

/** 折叠式问答，与首页 FAQ 用同一套视觉。 */
export function FaqList({
  lang,
  items,
}: {
  lang: Lang;
  items: { q: Bilingual; a: Bilingual }[];
}) {
  return (
    <div className="mt-10 border-t border-hairline">
      {items.map((f, i) => (
        <details key={i} className="group border-b border-hairline py-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[15px] font-medium text-ink transition-colors hover:text-accent-hover">
            <span className="flex gap-5">
              {/* ink-subtle 而不是 ink-faint —— 后者对底色只有 3.47:1，
                  达不到正文对比度下限，只能用在 aria-hidden 的装饰字符上。 */}
              <span className="font-sans text-xs tabular-nums tracking-[0.08em] text-ink-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
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
  );
}
