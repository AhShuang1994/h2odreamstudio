import { Bi } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { site } from "@/content/site";
import { hero } from "@/content/home";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[-15%] h-[600px] w-[600px] rounded-full bg-accent/20 blur-[130px]"
      />
      <Container className="relative">
        <div className="max-w-3xl">
          <Eyebrow>
            <Bi {...hero.eyebrow} />
          </Eyebrow>
          <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
            <Bi {...hero.h1} />
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-ink-muted">
            <Bi {...hero.sub} />
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href={site.waLink("你好阿爽，我想咨询网站")} external>
              <Bi {...hero.ctaPrimary} />
            </Button>
            <Button href="/#services" variant="secondary">
              <Bi {...hero.ctaSecondary} />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
