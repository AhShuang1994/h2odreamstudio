import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { site } from "@/content/site";
import { hero } from "@/content/home";

export function Hero({ lang }: { lang: Lang }) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-15%] h-[600px] w-[600px] rounded-full bg-accent/20 blur-[130px]"
      />
      <Container className="relative">
        <div className="max-w-3xl">
          <Eyebrow>{t(hero.eyebrow, lang)}</Eyebrow>
          <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
            {t(hero.h1, lang)}
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-ink-muted">
            {t(hero.sub, lang)}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={site.waLink(t(hero.waMessage, lang))} external>
              {t(hero.ctaPrimary, lang)}
            </Button>
            <Button href={localize("/#services", lang)} variant="secondary">
              {t(hero.ctaSecondary, lang)}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
