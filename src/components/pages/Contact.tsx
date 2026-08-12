import { pathsFor, t, type Lang } from "@/lib/i18n";
import { Button, Container } from "@/components/ui";
import {
  CtaPanel,
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
          {/* 四张渠道卡原本各挂一个 emoji（💬📧📕📸）。emoji 当图示在自家
              反 AI 清单上，四个不同风格的彩色符号也把「单一 accent」破了 ——
              去掉之后靠渠道名与账号本身识别，安静得多。 */}
          <div className="grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
            {contactMethods.map((m, i) => (
              <a
                key={i}
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-surface-1 p-7 transition-colors duration-150 hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-lg font-medium tracking-[-0.01em] text-ink">
                    {t(m.name, lang)}
                  </span>
                  <span
                    aria-hidden
                    className="text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-ink"
                  >
                    ↗
                  </span>
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
        <CtaPanel lang={lang} heading={contactCtaBlock.heading}>
          <Button href={site.waLink(t(contactCtaBlock.whatsappMessage, lang))} external>
            {t(contactCtaBlock.whatsapp, lang)}
          </Button>
          <Button href="mailto:H2Odreamer@outlook.com" variant="secondary" external>
            {t(contactCtaBlock.email, lang)}
          </Button>
        </CtaPanel>
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
