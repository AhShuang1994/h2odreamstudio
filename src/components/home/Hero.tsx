import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { HeroStage } from "@/components/home/HeroStage";
import { site } from "@/content/site";
import { hero } from "@/content/home";

/**
 * 首屏。
 *
 * 版面按 ADR-0001 分成两半：**左侧是永远干净的暗区**，标题与行动按钮住在
 * 这里；右侧从画面中线往外让给液态球体（视频与占位图归 #91）。重画前那颗
 * 球只是缩在右上角的一团 `blur-[130px]` 光晕 —— 渐变光晕在自家反 AI 清单
 * 上，而且 Linear 本身也明确不用氛围渐变。这里把它整块拿掉，位置留给真正
 * 的主视觉。
 *
 * 缺素材时右半边就是空的，版面照常成立，不塌。
 */
export function Hero({ lang }: { lang: Lang }) {
  return (
    <section
      data-hero-stage
      className="relative flex min-h-[92svh] items-center overflow-hidden pt-28 pb-20"
    >
      <HeroStage />
      <Container className="relative z-10">
        <div className="max-w-[42rem] lg:max-w-[36rem]">
          <Eyebrow>{t(hero.eyebrow, lang)}</Eyebrow>
          <h1
            data-reveal
            className="mt-6 text-[clamp(2.6rem,6.4vw,4.8rem)] leading-[1.02] tracking-[-0.03em] text-ink"
          >
            {t(hero.h1, lang)}
          </h1>
          <p
            data-reveal
            className="mt-7 max-w-[34rem] text-[1.0625rem] leading-[1.65] text-ink-muted"
          >
            {t(hero.sub, lang)}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button href={site.waLink(t(hero.waMessage, lang))} external>
              {t(hero.ctaPrimary, lang)}
            </Button>
            <Button href={localize("/#services", lang)} variant="secondary">
              {t(hero.ctaSecondary, lang)}
            </Button>
          </div>
        </div>
      </Container>

      {/* 首屏底部的发丝线 —— 让第一屏与第二屏之间有一道明确的界，
          而不是靠一段空白含糊过去。 */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-hairline" />
    </section>
  );
}
