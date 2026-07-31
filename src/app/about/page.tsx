import type { Metadata } from "next";
import { Bi } from "@/lib/i18n";
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

export const metadata: Metadata = {
  title: { absolute: aboutMeta.title },
  description: aboutMeta.description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: aboutMeta.title,
    description: aboutMeta.description,
    url: "/about",
    type: "profile",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    businessNode(),
    pageNode("AboutPage", "/about", aboutMeta.title, aboutMeta.description),
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

export default function AboutPage() {
  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader {...aboutHeader} />

      <QuickAnswerCard>
        <Bi {...aboutQuickAnswer} />
      </QuickAnswerCard>

      <PageSection>
        <Container>
          <div className="grid items-center gap-10 rounded-2xl border border-hairline bg-surface-1 p-8 sm:p-10 md:grid-cols-[220px_1fr]">
            <div className="mx-auto md:mx-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aboutFounder.avatar}
                alt={aboutFounder.name}
                width={220}
                height={220}
                className="h-44 w-44 rounded-2xl object-cover md:h-52 md:w-52"
              />
            </div>
            <div>
              <div className="text-xl font-semibold text-ink">{aboutFounder.name}</div>
              <div className="mt-1 text-sm text-ink-subtle">
                <Bi {...aboutFounder.role} />
              </div>
              <p className="mt-5 leading-relaxed text-ink-muted">
                <Bi {...aboutFounder.bio} />
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
                <Bi {...line} />
              </span>
            ))}
          </blockquote>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>
            <Bi {...aboutStory.heading} />
          </SectionTitle>
          <p className="mt-5 max-w-3xl leading-relaxed text-ink-muted">
            <Bi {...aboutStory.body} />
          </p>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <SectionTitle>
            <Bi {...aboutWhy.heading} />
          </SectionTitle>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {aboutWhy.items.map((w, i) => (
              <div key={i} className="rounded-2xl border border-hairline bg-surface-1 p-7">
                <div className="text-xl text-accent" aria-hidden>
                  {w.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">
                  <Bi {...w.title} />
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  <Bi {...w.body} />
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
              <Bi cn="开始" en="Get started" />
            </Eyebrow>
            <SectionTitle>
              <span className="mt-3 block">
                <Bi {...aboutCta.heading} />
              </span>
            </SectionTitle>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={site.waLink(aboutCta.whatsappMessage)} external>
                <Bi {...aboutCta.whatsapp} />
              </Button>
              <Button href="/contact" variant="secondary">
                <Bi {...aboutCta.secondary} />
              </Button>
            </div>
          </div>
        </Container>
      </PageSection>
    </main>
  );
}
