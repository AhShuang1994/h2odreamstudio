"use client";

import { useEffect } from "react";
import { HERO_RIVER } from "@/content/parallax";
import { motionAllowed } from "@/lib/motion";

/**
 * 首屏星河：滚动即拉进度条。
 *
 * 一整块 260svh 的舞台里，视口那一屏 `position: sticky` 定住不动，多出来的
 * 1.6 屏行程被映射成视频的 0~10 秒。人往下滚，球体裂开、液滴四散、汇成星河。
 * 往回滚，星河退回一颗球。文案在星河成形那一段（进度 0.58~0.86）浮上来。
 *
 * 用 CSS `sticky` 而不是 ScrollTrigger 的 `pin`: pin 会往 DOM 里插一层
 * pin-spacer 并接管高度，和 Lenis 的惯性叠在一起容易抖。sticky 由浏览器合成器
 * 直接处理，滚动线程上零成本。
 *
 * 渲染 null，与 Reveal / Parallax 一样是扫描器，不往版面里加盒子。
 */

/** ADR-0008：视频严格延到 LCP 之后，首屏由 poster 顶着，1.3MB 等页面空了再拉。 */
function primeAfterLoad(video: HTMLVideoElement) {
  const go = () => {
    video.preload = "auto";
    video.load();
  };
  // Safari 17 之前没有 requestIdleCallback，退回一个短延时就够：这里要的
  // 只是「别和首屏抢带宽」，不是精确的空闲调度。
  const idle = () => {
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") ric(go, { timeout: 1500 });
    else window.setTimeout(go, 200);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/**
 * 自动演示：替停在顶部不动的人把星河滚一遍，停在舞台末端（文案已到齐）。
 *
 * 只动滚动位置，画面仍由上面那条 ScrollTrigger 映射出来：自动与手动是同一条路，
 * 人中途接手不会跳帧。等视频 `canplaythrough` 才开滚，不然滚过去的只是一张 poster。
 *
 * ⚠️ 桌面必须走 Lenis 的 `scrollTo`，原因同 ServicesPicker 的 `select`。
 *
 * 返回清理函数。
 */
function autoplay(stage: HTMLElement, video: HTMLVideoElement, wake: () => void) {
  const { waitMs, durationS, flagKey } = HERO_RIVER.autoplay;
  try {
    if (sessionStorage.getItem(flagKey)) return () => {};
  } catch {
    // 隐私模式读不到就当首访
  }
  // 带锚点进来（/#services）或刷新时停在半路的，都不是「停在顶部」
  if (location.hash || window.scrollY > 4) return () => {};

  let timer = 0;
  let raf = 0;
  const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const stop = () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(raf);
    video.removeEventListener("canplaythrough", arm);
    for (const e of inputs) window.removeEventListener(e, stop);
  };
  for (const e of inputs) window.addEventListener(e, stop, { passive: true });

  const run = () => {
    if (window.scrollY > 4) return stop();
    try {
      sessionStorage.setItem(flagKey, "1");
    } catch {}
    wake(); // iOS：没被碰过的 video 不解码，拉进度也只看到 poster

    const from = window.scrollY;
    const to = stage.getBoundingClientRect().top + window.scrollY + stage.offsetHeight - window.innerHeight;
    const t0 = performance.now();
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / (durationS * 1000));
      const e = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; // easeInOutQuad
      const y = from + (to - from) * e;
      const lenis = window.__h2odLenis;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      if (x < 1) raf = requestAnimationFrame(step);
      else stop();
    };
    raf = requestAnimationFrame(step);
  };

  function arm() {
    timer = window.setTimeout(run, waitMs);
  }
  if (video.readyState >= 4) arm();
  else video.addEventListener("canplaythrough", arm, { once: true });

  return stop;
}

export function HeroScrub() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-hero-stage]");
    const video = document.querySelector<HTMLVideoElement>("[data-hero-river]");
    const copy = document.querySelector<HTMLElement>("[data-hero-copy]");
    const hint = document.querySelector<HTMLElement>("[data-hero-hint]");
    if (!stage || !video || !copy) return;

    const lines = [...copy.querySelectorAll<HTMLElement>("[data-reveal]")];

    // 减弱动态偏好：不拉进度条、不藏文案，视频直接停在星河成形那一帧。
    // 这时 head-inline 也没加 .reveal-armed，文案本来就是可见的。
    if (!motionAllowed()) {
      const rest = () => {
        if (Number.isFinite(video.duration)) video.currentTime = video.duration - 1 / 24;
      };
      video.addEventListener("loadedmetadata", rest, { once: true });
      primeAfterLoad(video);
      // 没有 scrub 就没有「要滚才看得到」这回事，提示反而是错的信息
      if (hint) hint.style.display = "none";
      return;
    }

    // 预备态要在 gsap 到位之前就锁成行内样式：`.reveal-armed` 四秒后会被
    // head-inline 的兜底摘掉，只靠那个类的话，没滚动的人会看着文案自己冒出来。
    for (const el of lines) el.style.opacity = "0";

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      primeAfterLoad(video);

      // iOS 不给没被用户碰过的 video 解码，不催一下，滚半天还是那张 poster。
      // 播一帧立刻暂停就够唤醒解码器，muted + playsInline 下不会有任何动静。
      // React 的 SSR 不会把 `muted` 写进标记（长期已知问题），而 iOS 只肯给
      // 静音视频免手势播放，所以这里自己补一次，不能只靠 JSX 上那个属性。
      const wake = () => {
        video.muted = true;
        void video.play().then(() => video.pause()).catch(() => {});
      };
      window.addEventListener("touchstart", wake, { once: true, passive: true });

      /**
       * 上一次跳转还没落地就先记着，等 `seeked` 再补。
       *
       * 每帧无脑给 `currentTime` 赋值会在 Safari 上堆出一串排队的 seek，
       * 表现是手指停了画面还在追。全关键帧编码解决的是「跳得快」，
       * 这里解决的是「别跳太多次」。
       */
      let want = -1;
      const apply = () => {
        const d = video.duration;
        if (want < 0 || video.readyState < 1 || !Number.isFinite(d) || d === 0) return;
        const t = Math.min(want * d, d - 1 / 24); // 差半帧，不去踩 ended
        want = -1;
        video.currentTime = t;
      };
      const onSeeked = () => apply();
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("loadedmetadata", onSeeked, { once: true });

      const ctx = gsap.context(() => {
        const progress = { p: 0 };
        const { start, span, stagger } = HERO_RIVER.copyIn;
        const hintOut = HERO_RIVER.hintOut;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            // 舞台顶边贴上视口顶边时开始（正是 sticky 咬住的那一刻），
            // 舞台底边追上视口底边时结束（正是 sticky 松口的那一刻）。
            start: "top top",
            end: "bottom bottom",
            // ⚠️ `true` 而不是数字。数字会在滚动位置之上再加一层缓动，而这个站
            // 桌面端本来就跑着 Lenis 的平滑滚动：两层滞后串起来，实测手指停了
            // 画面还要一两秒才追上目标帧（0.6 那版是指数收敛，14 秒才落到位）。
            // 惯性交给 Lenis 一家出，这里只做忠实映射。
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        tl.to(
          progress,
          {
            p: 1,
            ease: "none",
            duration: 1,
            onUpdate: () => {
              want = progress.p;
              if (!video.seeking) apply();
            },
          },
          0,
        );

        tl.fromTo(
          lines,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: span, ease: "power2.out", stagger },
          start,
        );

        // 提示先走，文案后到，中间隔着一大段只有画面的路
        if (hint) {
          tl.to(hint, { opacity: 0, duration: hintOut.span, ease: "power1.in" }, hintOut.start);
        }
      }, stage);

      const stopAuto = autoplay(stage, video, wake);

      cleanup = () => {
        stopAuto();
        window.removeEventListener("touchstart", wake);
        video.removeEventListener("seeked", onSeeked);
        ctx.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
