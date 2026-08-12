import { localize, pathsFor, t, type Lang } from "@/lib/i18n";
import { Button, Container } from "@/components/ui";
import {
  CtaPanel,
  PageHeader,
  PageSection,
  QuickAnswerCard,
  SectionTitle,
} from "@/components/page";
import { JsonLd } from "@/components/JsonLd";
import { businessNode, pageNode } from "@/lib/jsonld";
import { site } from "@/content/site";
import {
  aboutMeta,
  aboutHeader,
  aboutQuickAnswer,
  aboutFounder,
  aboutQuote,
  aboutStory,
  aboutWhy,
  aboutCta,
} from "@/content/about";

/** 关于页主体。中英两份路由（`/about` 与 `/zh/about`）共用它。 */
export function AboutPage({ lang }: { lang: Lang }) {
  const path = pathsFor("/about")[lang];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(),
      pageNode("AboutPage", path, lang, t(aboutMeta.title, lang), t(aboutMeta.description, lang)),
      {
        "@type": "Person",
        "@id": `${site.domain}/about#founder`,
        name: "Hui Huang Ong",
        alternateName: "Ah Shuang",
        jobTitle: "Founder, Designer & Developer",
        image: `${site.domain}/assets/founder-avatar.webp`,
        worksFor: { "@id": `${site.domain}/#business` },
        knowsLanguage: ["en", "zh"],
        description: aboutFounder.bio.en,
      },
    ],
  };

  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader lang={lang} {...aboutHeader} />

      <QuickAnswerCard lang={lang}>{t(aboutQuickAnswer, lang)}</QuickAnswerCard>

      <PageSection>
        <Container>
          <div className="grid items-start gap-10 rounded-xl border border-hairline bg-surface-1 p-7 sm:p-10 md:grid-cols-[220px_1fr] md:gap-14">
            {/* 与首页创始人区同一处理：遮罩视差的裁切框 */}
            <div
              data-mask-parallax
              className="aspect-[4/5] w-44 overflow-hidden rounded-xl border border-hairline md:w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aboutFounder.avatar}
                alt={t(aboutFounder.name, lang)}
                width={220}
                height={275}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="text-xl tracking-[-0.01em] text-ink">
                {t(aboutFounder.name, lang)}
              </div>
              <div className="mt-1.5 text-sm text-ink-subtle">
                {t(aboutFounder.role, lang)}
              </div>
              <p
                data-reveal
                className="mt-6 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-ink-muted"
              >
                {t(aboutFounder.bio, lang)}
              </p>
            </div>
          </div>
        </Container>
      </PageSection>

      {/* 引言是这一页的视觉重音。左对齐、衬线、大字 —— 居中的引言块太像
          模板里的 testimonial。 */}
      <PageSection className="border-y border-hairline bg-surface-1">
        <Container>
          <blockquote className="max-w-[34ch] font-serif text-[clamp(1.5rem,3.2vw,2.25rem)] leading-[1.35] text-ink">
            {aboutQuote.map((line, i) => (
              <span key={i} className="block">
                {t(line, lang)}
              </span>
            ))}
          </blockquote>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>{t(aboutStory.heading, lang)}</SectionTitle>
          <p
            data-reveal
            className="mt-6 max-w-[62ch] text-[1.0625rem] leading-[1.7] text-ink-muted"
          >
            {t(aboutStory.body, lang)}
          </p>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>{t(aboutWhy.heading, lang)}</SectionTitle>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
            {aboutWhy.items.map((w, i) => (
              <div key={i} className="bg-surface-1 p-7">
                <div className="text-lg text-accent" aria-hidden>
                  {w.icon}
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-[-0.01em] text-ink">
                  {t(w.title, lang)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {t(w.body, lang)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </PageSection>

      <PageSection>
        <CtaPanel lang={lang} heading={aboutCta.heading}>
          <Button href={site.waLink(t(aboutCta.whatsappMessage, lang))} external>
            {t(aboutCta.whatsapp, lang)}
          </Button>
          <Button href={localize("/contact", lang)} variant="secondary">
            {t(aboutCta.secondary, lang)}
          </Button>
        </CtaPanel>
      </PageSection>
    </main>
  );
}
