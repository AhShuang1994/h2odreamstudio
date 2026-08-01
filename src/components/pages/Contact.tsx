import { pathsFor, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import {
  PageHeader,
  PageSection,
  QuickAnswerCard,
  SectionTitle,
  FaqList,
} from "@/components/page";
import { JsonLd } from "@/components/JsonLd";
import { businessNode, pageNode, faqNode } from "@/lib/jsonld";
import { site } from "@/content/site";
import {
  contactMeta,
  contactHeader,
  contactQuickAnswer,
  contactMethods,
  studioInfo,
  contactCtaBlock,
  contactFaq,
} from "@/content/contact";

/** 联系页主体。中英两份路由（`/contact` 与 `/zh/contact`）共用它。 */
export function ContactPage({ lang }: { lang: Lang }) {
  const path = pathsFor("/contact")[lang];

  // 这一页的 FAQ 在页面上是可见的（下面 FaqList 渲染出来了），所以 FAQPage 合规。
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(),
      pageNode(
        "ContactPage",
        path,
        lang,
        t(contactMeta.title, lang),
        t(contactMeta.description, lang),
      ),
      faqNode(contactFaq.items, lang),
    ],
  };

  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader lang={lang} {...contactHeader} />

      <QuickAnswerCard lang={lang}>{t(contactQuickAnswer, lang)}</QuickAnswerCard>

      <PageSection>
        <Container>
          <div className="grid gap-4 sm:grid-cols-2">
            {contactMethods.map((m, i) => (
              <a
                key={i}
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-hairline bg-surface-1 p-7 transition-colors hover:border-hairline-strong hover:bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden>
                    {m.icon}
                  </span>
                  <span className="text-lg font-semibold text-ink">{t(m.name, lang)}</span>
                </div>
                <div className="mt-3 text-[15px] text-accent">{m.value}</div>
                <p className="mt-2 text-sm text-ink-subtle">{t(m.note, lang)}</p>
              </a>
            ))}
          </div>
        </Container>
      </PageSection>

      <PageSection className="border-y border-hairline bg-surface-1">
        <Container>
          <SectionTitle>{t(studioInfo.heading, lang)}</SectionTitle>
          <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {studioInfo.rows.map((r, i) => (
              <div
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-4"
              >
                <dt className="text-sm text-ink-subtle">{t(r.key, lang)}</dt>
                <dd className="text-[15px] text-ink">{t(r.value, lang)}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <div className="rounded-3xl border border-hairline bg-surface-1 px-8 py-14 text-center sm:px-16">
            <Eyebrow className="text-center">
              {t({ cn: "开始", en: "Get started" }, lang)}
            </Eyebrow>
            <SectionTitle>
              <span className="mt-3 block">{t(contactCtaBlock.heading, lang)}</span>
            </SectionTitle>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={site.waLink(t(contactCtaBlock.whatsappMessage, lang))} external>
                {t(contactCtaBlock.whatsapp, lang)}
              </Button>
              <Button href="mailto:H2Odreamer@outlook.com" variant="secondary" external>
                {t(contactCtaBlock.email, lang)}
              </Button>
            </div>
          </div>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>{t(contactFaq.heading, lang)}</SectionTitle>
          <FaqList lang={lang} items={contactFaq.items} />
        </Container>
      </PageSection>
    </main>
  );
}
