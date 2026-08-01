import { localize, pathsFor, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { PageHeader, PageSection, QuickAnswerCard, SectionTitle } from "@/components/page";
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
          <div className="grid items-center gap-10 rounded-2xl border border-hairline bg-surface-1 p-8 sm:p-10 md:grid-cols-[220px_1fr]">
            <div className="mx-auto md:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aboutFounder.avatar}
                alt={t(aboutFounder.name, lang)}
                width={220}
                height={220}
                className="h-44 w-44 rounded-2xl object-cover md:h-52 md:w-52"
              />
            </div>
            <div>
              <div className="text-xl font-semibold text-ink">
                {t(aboutFounder.name, lang)}
              </div>
              <div className="mt-1 text-sm text-ink-subtle">{t(aboutFounder.role, lang)}</div>
              <p className="mt-5 leading-relaxed text-ink-muted">
                {t(aboutFounder.bio, lang)}
              </p>
            </div>
          </div>
        </Container>
      </PageSection>

      <PageSection className="border-y border-hairline bg-surface-1">
        <Container>
          <blockquote className="mx-auto max-w-2xl text-center text-lg leading-loose text-ink sm:text-xl">
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
          <p className="mt-5 max-w-3xl leading-relaxed text-ink-muted">
            {t(aboutStory.body, lang)}
          </p>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>{t(aboutWhy.heading, lang)}</SectionTitle>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {aboutWhy.items.map((w, i) => (
              <div key={i} className="rounded-2xl border border-hairline bg-surface-1 p-7">
                <div className="text-xl text-accent" aria-hidden>
                  {w.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{t(w.title, lang)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {t(w.body, lang)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <div className="rounded-3xl border border-hairline bg-surface-1 px-8 py-14 text-center sm:px-16">
            <Eyebrow className="text-center">
              {t({ cn: "开始", en: "Get started" }, lang)}
            </Eyebrow>
            <SectionTitle>
              <span className="mt-3 block">{t(aboutCta.heading, lang)}</span>
            </SectionTitle>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={site.waLink(t(aboutCta.whatsappMessage, lang))} external>
                {t(aboutCta.whatsapp, lang)}
              </Button>
              <Button href={localize("/contact", lang)} variant="secondary">
                {t(aboutCta.secondary, lang)}
              </Button>
            </div>
          </div>
        </Container>
      </PageSection>
    </main>
  );
}
