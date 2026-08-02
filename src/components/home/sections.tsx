import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { site } from "@/content/site";
import {
  quickAnswer,
  services,
  selectedWork,
  founder,
  faq,
  contactCta,
} from "@/content/home";

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`}>
      {children}
    </section>
  );
}

export function QuickAnswer({ lang }: { lang: Lang }) {
  return (
    <Section id="what">
      <Container>
        <div className="rounded-2xl border border-hairline bg-surface-1 p-8 sm:p-10">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            <span aria-hidden>⚡</span>
            {t({ cn: "快速答案", en: "Quick answer" }, lang)}
          </div>
          <h2
            data-reveal
            className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold tracking-tight text-ink"
          >
            {t(quickAnswer.heading, lang)}
          </h2>
          <p data-reveal className="mt-4 max-w-3xl leading-relaxed text-ink-muted">
            {t(quickAnswer.body, lang)}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-hairline pt-8 sm:grid-cols-4">
            {quickAnswer.stats.map((s, i) => (
              <div key={i}>
                <dt className="text-2xl font-semibold text-ink">{t(s.value, lang)}</dt>
                <dd className="mt-1 text-xs text-ink-subtle">{t(s.label, lang)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}

export function Services({ lang }: { lang: Lang }) {
  return (
    <Section id="services">
      <Container>
        <Eyebrow>{t(services.eyebrow, lang)}</Eyebrow>
        <h2
          data-reveal
          className="mt-3 max-w-2xl text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight text-ink"
        >
          {t(services.heading, lang)}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {services.items.map((s, i) => (
            <a
              key={i}
              href={localize(s.href, lang)}
              className="group rounded-2xl border border-hairline bg-surface-1 p-7 transition-colors hover:border-hairline-strong hover:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink">{t(s.title, lang)}</h3>
                <span className="shrink-0 text-sm text-accent">{t(s.price, lang)}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(s.desc, lang)}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm text-ink-subtle transition-colors group-hover:text-ink">
                {t({ cn: "了解更多", en: "Learn more" }, lang)} →
              </span>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function SelectedWork({ lang }: { lang: Lang }) {
  return (
    <Section id="work">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <div>
            <Eyebrow>{t(selectedWork.eyebrow, lang)}</Eyebrow>
            <h2
              data-reveal
              className="mt-3 max-w-2xl text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight text-ink"
            >
              {t(selectedWork.heading, lang)}
            </h2>
          </div>
          <a
            href="/case-studies/"
            className="hidden shrink-0 text-sm text-ink-muted hover:text-ink sm:inline"
          >
            {t(selectedWork.cta, lang)} →
          </a>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {selectedWork.items.map((w, i) => (
            <a
              key={i}
              href={w.href}
              className="group overflow-hidden rounded-2xl border border-hairline bg-surface-1"
            >
              <div className="aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.img}
                  alt={t(w.title, lang)}
                  width={800}
                  height={500}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <span className="text-xs text-accent">{t(w.tag, lang)}</span>
                  <h3 className="mt-1 text-[15px] font-medium text-ink">{t(w.title, lang)}</h3>
                </div>
                <span
                  className="text-ink-subtle transition-colors group-hover:text-ink"
                  aria-hidden
                >
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Founder({ lang }: { lang: Lang }) {
  return (
    <Section id="founder" className="border-y border-hairline bg-surface-1">
      <Container>
        <div className="grid items-center gap-10 md:grid-cols-[280px_1fr]">
          <div className="mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={founder.avatar}
              alt={t(founder.name, lang)}
              width={240}
              height={240}
              loading="lazy"
              className="h-48 w-48 rounded-2xl object-cover md:h-60 md:w-60"
            />
          </div>
          <div>
            <Eyebrow>{t(founder.eyebrow, lang)}</Eyebrow>
            <div className="mt-3 text-xl font-semibold text-ink">{t(founder.name, lang)}</div>
            <div className="text-sm text-ink-subtle">{t(founder.role, lang)}</div>
            <p data-reveal className="mt-5 max-w-2xl leading-relaxed text-ink-muted">
              {t(founder.bio, lang)}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function Faq({ lang }: { lang: Lang }) {
  return (
    <Section id="faq">
      <Container>
        <Eyebrow>{t(faq.eyebrow, lang)}</Eyebrow>
        <h2
          data-reveal
          className="mt-3 text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight text-ink"
        >
          {t(faq.heading, lang)}
        </h2>
        <div className="mt-8 divide-y divide-hairline border-y border-hairline">
          {faq.items.map((f, i) => (
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
      </Container>
    </Section>
  );
}

export function ContactCta({ lang }: { lang: Lang }) {
  return (
    <Section id="contact">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface-1 px-8 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-accent/15 blur-[100px]"
          />
          <div className="relative">
            <Eyebrow className="text-center">{t(contactCta.eyebrow, lang)}</Eyebrow>
            <h2
              data-reveal
              className="mx-auto mt-3 max-w-2xl text-[clamp(1.7rem,3.6vw,2.6rem)] font-semibold tracking-tight text-ink"
            >
              {t(contactCta.heading, lang)}
            </h2>
            <p data-reveal className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-muted">
              {t(contactCta.body, lang)}
            </p>
            <div className="mt-8 flex justify-center">
              <Button href={site.waLink(t(contactCta.waMessage, lang))} external>
                {t(contactCta.cta, lang)}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
