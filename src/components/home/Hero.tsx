import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { HeroStage } from "@/components/home/HeroStage";
import { HeroScrub } from "@/components/home/HeroScrub";
import { HeroDive } from "@/components/home/HeroDive";
import { HERO_RIVER } from "@/content/parallax";
import { site } from "@/content/site";
import { hero } from "@/content/home";

/**
 * 首屏。
 *
 * 结构是「高盒子 + 定住的一屏」：外层 260svh 只用来提供滚动行程，里面那屏
 * `sticky` 钉在视口上不动。多出来的行程被 `HeroScrub` 映射成星河视频的播放
 * 进度 —— 人往下滚，球体裂开、汇成星河；星河成形时文案才浮上来。
 *
 * 版面仍按 ADR-0001 分两半：**左侧是永远干净的暗区**，标题与行动按钮住在
 * 这里。星河从左上斜贯到右下，本身会压到左侧，所以那块干净暗区现在由
 * `HeroStage` 的暗罩保证，不是靠构图留白 —— 数字见 `HERO_RIVER.scrim`。
 *
 * 文案上的 `data-reveal` 只用来**吃 `.reveal-armed` 的首帧隐藏**，动画本身归
 * `HeroScrub`：`Reveal` 那套一进视口就演完，而这里要的是跟着滚动进度慢慢浮，
 * 所以 `Reveal` 主动跳过了 `[data-hero-copy]` 里的元素。
 */
export function Hero({ lang }: { lang: Lang }) {
  return (
    <section
      data-hero-stage
      className="relative"
      style={{ height: `${HERO_RIVER.scrollVh}svh` }}
    >
      <HeroScrub />
      <HeroDive />

      {/* pt-14 是给固定导航让位 —— 视口高的盒子里居中，短屏上标题会顶到导航。 */}
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden pt-14">
        <HeroStage />
        <Container className="relative z-10">
          <div data-hero-copy className="max-w-[42rem] lg:max-w-[36rem]">
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
            <div data-reveal className="mt-10 flex flex-wrap items-center gap-3">
              <Button href={site.waLink(t(hero.waMessage, lang))} external>
                {t(hero.ctaPrimary, lang)}
              </Button>
              <Button href={localize("/#services", lang)} variant="secondary">
                {t(hero.ctaSecondary, lang)}
              </Button>
            </div>
          </div>
        </Container>

        {/* 滚动提示。开场那几屏文案还没浮上来，画面上只有一颗球 —— 没有这个
            东西，人不知道这一屏要滚，也就永远看不到星河。
            它跟文案是此消彼长的：一开始滚就淡出（HERO_RIVER.hintOut）。 */}
        <div
          data-hero-hint
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-2 text-ink-muted"
        >
          <span className="text-[11px] tracking-[0.18em]">
            {t(hero.scrollHint, lang)}
          </span>
          {/* 一下一下往下点的箭头，动画在 globals.css 里 */}
          <svg
            width="14"
            height="18"
            viewBox="0 0 14 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 2v13M2.5 10.5 7 15l4.5-4.5" />
          </svg>
        </div>
      </div>

      {/* 首屏底部的发丝线 —— 让第一屏与第二屏之间有一道明确的界，
          而不是靠一段空白含糊过去。挂在外层盒子上，不跟着 sticky 那屏走。 */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-hairline" />
    </section>
  );
}
