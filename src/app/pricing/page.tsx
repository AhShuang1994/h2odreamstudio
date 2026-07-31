import type { Metadata } from "next";
import { Bi } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { PageHeader, PageSection, QuickAnswerCard, SectionTitle } from "@/components/page";
import { JsonLd } from "@/components/JsonLd";
import { businessNode, pageNode } from "@/lib/jsonld";
import { site, type Bilingual } from "@/content/site";
import {
  pricingMeta,
  pricingHeader,
  pricingQuickAnswer,
  webTiers,
  webFeatures,
  otherServices,
  pricingNotes,
  pricingGuides,
  pricingCta,
} from "@/content/pricing";

export const metadata: Metadata = {
  title: { absolute: pricingMeta.title },
  description: pricingMeta.description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: pricingMeta.title,
    description: pricingMeta.description,
    url: "/pricing",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    businessNode(),
    pageNode("WebPage", "/pricing", pricingMeta.title, pricingMeta.description),
    {
      "@type": "OfferCatalog",
      "@id": `${site.domain}/pricing#catalog`,
      name: "H2ODreamer Studio — services and starting prices",
      itemListElement: [
        ...webTiers.map((t) => ({
          "@type": "Offer",
          name: `Website Design — ${t.name.en}`,
          price: t.price.replace(/[^0-9]/g, ""),
          priceCurrency: "MYR",
          url: `${site.domain}${t.href}`,
          availability: "https://schema.org/InStock",
        })),
        ...otherServices.map((s) => ({
          "@type": "Offer",
          name: s.name.en,
          price: s.price.replace(/[^0-9]/g, ""),
          priceCurrency: "MYR",
          url: `${site.domain}${s.href}`,
          availability: "https://schema.org/InStock",
        })),
      ],
    },
  ],
};

/** 表格单元格：布尔值渲染成 ✓ / —，双语文本正常渲染。 */
function Cell({ v }: { v: Bilingual | boolean }) {
  if (typeof v === "boolean") {
    return v ? (
      <span className="text-accent" aria-label="包含">
        ✓
      </span>
    ) : (
      <span className="text-ink-subtle" aria-label="不包含">
        —
      </span>
    );
  }
  return <Bi {...v} />;
}

export default function PricingPage() {
  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader {...pricingHeader} />

      <QuickAnswerCard>
        <Bi {...pricingQuickAnswer} />
      </QuickAnswerCard>

      <PageSection>
        <Container>
          <SectionTitle>
            <Bi cn="网站设计" en="Website Design" />
          </SectionTitle>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th scope="col" className="py-5 pr-4 font-normal text-ink-subtle" />
                  {webTiers.map((t) => (
                    <th key={t.id} scope="col" className="py-5 pr-4 align-bottom">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-ink">
                          <Bi {...t.name} />
                        </span>
                        {t.popular && "badge" in t && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                            <Bi {...t.badge} />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-ink">{t.price}</div>
                      <div className="text-xs text-ink-subtle">
                        <Bi cn="起" en="from" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {webFeatures.map((row, i) => (
                  <tr key={i}>
                    <th scope="row" className="py-4 pr-4 font-normal text-ink-subtle">
                      <Bi {...row.label} />
                    </th>
                    {row.values.map((v, j) => (
                      <td
                        key={j}
                        className={`py-4 pr-4 text-ink ${webTiers[j].popular ? "bg-surface-1" : ""}`}
                      >
                        <Cell v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td />
                  {webTiers.map((t) => (
                    <td key={t.id} className="py-5 pr-4">
                      <a href={t.href} className="text-sm text-accent hover:underline">
                        <Bi cn="详情 →" en="Details →" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Container>
      </PageSection>

      <PageSection className="border-y border-hairline bg-surface-1">
        <Container>
          <SectionTitle>
            <Bi cn="婚礼喜帖 & 电商" en="Wedding & E-Commerce" />
          </SectionTitle>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline-strong text-ink-subtle">
                  <th scope="col" className="py-4 pr-4 font-normal">
                    <Bi cn="服务" en="Service" />
                  </th>
                  <th scope="col" className="py-4 pr-4 font-normal">
                    <Bi cn="起价" en="From" />
                  </th>
                  <th scope="col" className="py-4 pr-4 font-normal">
                    <Bi cn="交付" en="Delivery" />
                  </th>
                  <th scope="col" className="py-4 font-normal">
                    <Bi cn="重点" en="Highlights" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {otherServices.map((s, i) => (
                  <tr key={i}>
                    <th scope="row" className="py-5 pr-4 font-normal">
                      <a href={s.href} className="text-accent hover:underline">
                        <Bi {...s.name} />
                      </a>
                    </th>
                    <td className="py-5 pr-4 text-base font-semibold text-ink">{s.price}</td>
                    <td className="py-5 pr-4 text-ink">
                      <Bi {...s.delivery} />
                    </td>
                    <td className="py-5 text-ink-muted">
                      <Bi {...s.highlights} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </PageSection>

      <PageSection>
        <Container>
          <ul className="max-w-3xl space-y-3 text-sm leading-relaxed text-ink-muted">
            {pricingNotes.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-ink-subtle" aria-hidden>
                  ·
                </span>
                <span>
                  <Bi {...n} />
                </span>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span>
                <Bi {...pricingGuides.intro} />
                {pricingGuides.links.map((l, i) => (
                  <a key={i} href={l.href} className="ml-2 text-accent hover:underline">
                    <Bi {...l.label} />
                  </a>
                ))}
              </span>
            </li>
          </ul>
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
                <Bi {...pricingCta.heading} />
              </span>
            </SectionTitle>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={site.waLink(pricingCta.whatsappMessage)} external>
                <Bi {...pricingCta.whatsapp} />
              </Button>
              <Button href="/contact" variant="secondary">
                <Bi {...pricingCta.secondary} />
              </Button>
            </div>
          </div>
        </Container>
      </PageSection>
    </main>
  );
}
