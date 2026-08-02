import type { ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Container, Eyebrow } from "@/components/ui";
import type { Bilingual } from "@/content/site";

/** 内容页顶部：眉标 + 标题 + 导语。三个核心页共用。 */
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
    <header className="pt-28 pb-10 sm:pt-36 sm:pb-14">
      <Container>
        <Eyebrow>{t(eyebrow, lang)}</Eyebrow>
        <h1
          data-reveal
          className="mt-3 max-w-3xl text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.1] tracking-tight text-ink"
        >
          {t(title, lang)}
        </h1>
        {lede && (
          <p data-reveal className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
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
      <div className="rounded-2xl border border-hairline bg-surface-1 p-8 sm:p-10">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
          <span aria-hidden>⚡</span>
          {t({ cn: "快速答案", en: "Quick answer" }, lang)}
        </div>
        <div className="max-w-3xl leading-relaxed text-ink-muted">{children}</div>
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
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

/** 内容页的二级标题。 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      data-reveal
      className="text-[clamp(1.5rem,3.2vw,2.2rem)] font-semibold tracking-tight text-ink"
    >
      {children}
    </h2>
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
    <div className="mt-8 divide-y divide-hairline border-y border-hairline">
      {items.map((f, i) => (
        <details key={i} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
            <span>{t(f.q, lang)}</span>
            <span
              className="text-xl leading-none text-ink-subtle transition-transform group-open:rotate-45"
              aria-hidden
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {t(f.a, lang)}
          </p>
        </details>
      ))}
    </div>
  );
}
