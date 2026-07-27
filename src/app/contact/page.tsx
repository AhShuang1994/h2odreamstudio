import type { Metadata } from "next";
import { Bi } from "@/lib/i18n";
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

export const metadata: Metadata = {
  title: { absolute: contactMeta.title },
  description: contactMeta.description,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: contactMeta.title,
    description: contactMeta.description,
    url: "/contact",
    type: "website",
  },
};

// 这一页的 FAQ 在页面上是可见的（下面 FaqList 渲染出来了），所以 FAQPage 合规。
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    businessNode(),
    pageNode("ContactPage", "/contact", contactMeta.title, contactMeta.description),
    faqNode(contactFaq.items),
  ],
};

export default function ContactPage() {
  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader {...contactHeader} />

      <QuickAnswerCard>
        <Bi {...contactQuickAnswer} />
      </QuickAnswerCard>

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
                  <span className="text-lg font-semibold text-ink">
                    <Bi {...m.name} />
                  </span>
                </div>
                <div className="mt-3 text-[15px] text-accent">{m.value}</div>
                <p className="mt-2 text-sm text-ink-subtle">
                  <Bi {...m.note} />
                </p>
              </a>
            ))}
          </div>
        </Container>
      </PageSection>

      <PageSection className="border-y border-hairline bg-surface-1">
        <Container>
          <SectionTitle>
            <Bi {...studioInfo.heading} />
          </SectionTitle>
          <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {studioInfo.rows.map((r, i) => (
              <div
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-4"
              >
                <dt className="text-sm text-ink-subtle">
                  <Bi {...r.key} />
                </dt>
                <dd className="text-[15px] text-ink">
                  <Bi {...r.value} />
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <div className="rounded-3xl border border-hairline bg-surface-1 px-8 py-14 text-center sm:px-16">
            <Eyebrow className="text-center">
              <Bi cn="开始" en="Get started" />
            </Eyebrow>
            <SectionTitle>
              <span className="mt-3 block">
                <Bi {...contactCtaBlock.heading} />
              </span>
            </SectionTitle>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={site.waLink(contactCtaBlock.whatsappMessage)} external>
                <Bi {...contactCtaBlock.whatsapp} />
              </Button>
              <Button href="mailto:H2Odreamer@outlook.com" variant="secondary" external>
                <Bi {...contactCtaBlock.email} />
              </Button>
            </div>
          </div>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>
            <Bi {...contactFaq.heading} />
          </SectionTitle>
          <FaqList items={contactFaq.items} />
        </Container>
      </PageSection>
    </main>
  );
}
