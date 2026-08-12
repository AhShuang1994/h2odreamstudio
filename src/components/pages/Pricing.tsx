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

/** 表格单元格：布尔值渲染成 ✓ / —，双语文本按当前语言渲染。 */
function Cell({ v, lang }: { v: Bilingual | boolean; lang: Lang }) {
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
  return <>{t(v, lang)}</>;
}

/** 报价页主体。中英两份路由（`/pricing` 与 `/zh/pricing`）共用它。 */
export function PricingPage({ lang }: { lang: Lang }) {
  const path = pathsFor("/pricing")[lang];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(),
      pageNode(
        "WebPage",
        path,
        lang,
        t(pricingMeta.title, lang),
        t(pricingMeta.description, lang),
      ),
      {
        "@type": "OfferCatalog",
        "@id": `${site.domain}/pricing#catalog`,
        name: "H2ODreamer Studio — services and starting prices",
        itemListElement: [
          ...webTiers.map((tier) => ({
            "@type": "Offer",
            name: `Website Design — ${tier.name.en}`,
            price: tier.price.replace(/[^0-9]/g, ""),
            priceCurrency: "MYR",
            url: `${site.domain}${tier.href}`,
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

  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageHeader lang={lang} {...pricingHeader} />

      <QuickAnswerCard lang={lang}>{t(pricingQuickAnswer, lang)}</QuickAnswerCard>

      <PageSection>
        <Container>
          <SectionTitle>{t({ cn: "网站设计", en: "Website Design" }, lang)}</SectionTitle>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th scope="col" className="py-5 pr-4 font-normal text-ink-subtle" />
                  {webTiers.map((tier) => (
                    <th key={tier.id} scope="col" className="py-5 pr-4 align-bottom">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-ink">
                          {t(tier.name, lang)}
                        </span>
                        {tier.popular && "badge" in tier && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                            {t(tier.badge, lang)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-ink">{tier.price}</div>
                      <div className="text-xs text-ink-subtle">
                        {t({ cn: "起", en: "from" }, lang)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {webFeatures.map((row, i) => (
                  <tr key={i}>
                    <th scope="row" className="py-4 pr-4 font-normal text-ink-subtle">
                      {t(row.label, lang)}
                    </th>
                    {row.values.map((v, j) => (
                      <td
                        key={j}
                        className={`py-4 pr-4 text-ink ${webTiers[j].popular ? "bg-surface-1" : ""}`}
                      >
                        <Cell v={v} lang={lang} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td />
                  {webTiers.map((tier) => (
                    <td key={tier.id} className="py-5 pr-4">
                      <a href={tier.href} className="text-sm text-accent hover:underline">
                        {t({ cn: "详情 →", en: "Details →" }, lang)}
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
            {t({ cn: "婚礼喜帖 & 电商", en: "Wedding & E-Commerce" }, lang)}
          </SectionTitle>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hairline-strong text-ink-subtle">
                  <th scope="col" className="py-4 pr-4 font-normal">
                    {t({ cn: "服务", en: "Service" }, lang)}
                  </th>
                  <th scope="col" className="py-4 pr-4 font-normal">
                    {t({ cn: "起价", en: "From" }, lang)}
                  </th>
                  <th scope="col" className="py-4 pr-4 font-normal">
                    {t({ cn: "交付", en: "Delivery" }, lang)}
                  </th>
                  <th scope="col" className="py-4 font-normal">
                    {t({ cn: "重点", en: "Highlights" }, lang)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {otherServices.map((s, i) => (
                  <tr key={i}>
                    <th scope="row" className="py-5 pr-4 font-normal">
                      <a href={s.href} className="text-accent hover:underline">
                        {t(s.name, lang)}
                      </a>
                    </th>
                    <td className="py-5 pr-4 text-base font-semibold text-ink">{s.price}</td>
                    <td className="py-5 pr-4 text-ink">{t(s.delivery, lang)}</td>
                    <td className="py-5 text-ink-muted">{t(s.highlights, lang)}</td>
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
                <span>{t(n, lang)}</span>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span>
                {t(pricingGuides.intro, lang)}
                {pricingGuides.links.map((l, i) => (
                  <a key={i} href={l.href} className="ml-2 text-accent hover:underline">
                    {t(l.label, lang)}
                  </a>
                ))}
              </span>
            </li>
          </ul>
        </Container>
      </PageSection>

      <PageSection>
        <CtaPanel lang={lang} heading={pricingCta.heading}>
          <Button href={site.waLink(t(pricingCta.whatsappMessage, lang))} external>
            {t(pricingCta.whatsapp, lang)}
          </Button>
          <Button href={localize("/contact", lang)} variant="secondary">
            {t(pricingCta.secondary, lang)}
          </Button>
        </CtaPanel>
      </PageSection>
    </main>
  );
}
