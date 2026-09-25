"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { t, localize, type Lang } from "@/lib/i18n";
import { motionAllowed, REDUCED_MOTION } from "@/lib/motion";
import { selectedWork } from "@/content/home";

/**
 * 精选作品。同一份卡片 DOM，两种壳：
 *
 * **背景 = 当前那张卡的截图，放大模糊铺满**，换卡时交叉淡入：整块跟着作品换气氛。
 *
 * **iPad 与桌面（≥768px）**：整段**滚动钉住**。外层是
 * `100vh + (n-1)×STEP_VH` 的高舞台，里面那屏 `position: sticky` 咬住视口。
 * 每张卡是一扇左右撑满的浏览器窗口，放整张桌面版截图，文字信息浮在左下角。
 * 人往下滚，下一张从右边滑进来盖住上一张，上一张缩小淡出。卡片**在动的时候
 * 文字整块藏掉**，停稳了才浮出来。
 *
 * **手机**，不钉住，卡片排成一行横滑轮播（原生 scroll-snap），底下一排圆点。
 *
 * 钉住的写法照 ServicesPicker：CSS `sticky` 而不是 ScrollTrigger 的 pin，
 * IntersectionObserver 当开关，区块可见时起一个 rAF 读 `getBoundingClientRect()`，
 * 这个站跑着 Lenis，window 上的 scroll 事件收不到。
 *
 * 每帧只写 CSS 变量（`--x` `--s` `--o` `--dv`），不走 React state。state 只在
 * 「当前是哪一张」变了才更新一次。变量只在 `md:motion-safe:` 下被读：手机与
 * 减弱动态偏好下写了也没人用，版面就是那条轮播。
 *
 * 细节栏的文字全部摘自各案例页的「一眼看懂」表。这些是概念 demo，
 * 不编数据、不编客户见证。
 */

/** 每换一张卡占多少视口高度的滚动行程。 */
const STEP_VH = 70;

/**
 * 每段行程里，卡片只在中间这一截动，前后各停一段，不停的话细节栏永远在
 * 淡入淡出，没有一刻读得完。0.25 = 前 25% 停、中间 50% 滑、后 25% 停。
 */
const HOLD = 0.25;

/** 与 Tailwind 的 `md:` 对齐。两边错开会出现「钉住了却不换卡」。 */
const PIN_QUERY = "(min-width: 768px)";

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function WorkShowcase({ lang, header }: { lang: Lang; header: ReactNode }) {
  const items = selectedWork.items;
  const labels = selectedWork.labels;
  const n = items.length;

  const [active, setActive] = useState(0);
  const [canPin, setCanPin] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const detailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const railRef = useRef<HTMLUListElement>(null);

  // 能不能钉，跟着媒体查询走：平板转方向、桌面拖窄都要跟上。
  useEffect(() => {
    const wide = window.matchMedia(PIN_QUERY);
    const still = window.matchMedia(REDUCED_MOTION);
    const sync = () => setCanPin(motionAllowed() && wide.matches);
    sync();
    wide.addEventListener("change", sync);
    still.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
    };
  }, []);

  // ── 滚动进度 → 卡片位置、细节显隐 ─────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !canPin) return;

    let raf = 0;
    let last = -1;
    const tick = () => {
      const span = stage.offsetHeight - window.innerHeight;
      if (span > 0) {
        const r = clamp01(-stage.getBoundingClientRect().top / span);

        // 原始进度 → 带停顿的卡片进度 e（0 … n-1）
        const q = r * (n - 1);
        const k = Math.min(n - 2, Math.floor(q));
        const e = k + smooth(clamp01((q - k - HOLD) / (1 - 2 * HOLD)));


        const lane = stage.clientWidth;
        const now = Math.round(e);
        for (let i = 0; i < n; i++) {
          const d = i - e;
          const card = cardRefs.current[i];
          if (card) {
            // 往后排的在右边屏外候着。已经翻过去的往左缩小淡出
            const x = d >= 0 ? d * lane : d * 160;
            card.style.setProperty("--x", `${x}px`);
            card.style.setProperty("--s", String(d >= 0 ? 1 : 1 + d * 0.1));
            card.style.setProperty("--o", String(d >= 0 ? 1 : clamp01(1 + d * 1.4)));
          }
          const detail = detailRefs.current[i];
          if (detail) {
            const dv = i === now ? clamp01(1 - Math.abs(e - i) * 5) : 0;
            detail.style.setProperty("--dv", String(dv));
          }
        }
        if (now !== last) {
          last = now;
          setActive(now);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) raf = requestAnimationFrame(tick);
        else if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(stage);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canPin, n]);

  // 钉住时只有当前那张可以 Tab 进去。轮播时每张都可以。
  useEffect(() => {
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      if (canPin && i !== active) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }, [canPin, active]);

  // ── 手机轮播：滑到第几张 → 圆点 ─────────────────────────────────────
  const onRailScroll = () => {
    const rail = railRef.current;
    const first = itemRefs.current[0];
    if (!rail || !first || canPin) return;
    const step = first.offsetWidth + 16; // gap-4
    setActive(Math.min(n - 1, Math.max(0, Math.round(rail.scrollLeft / step))));
  };

  return (
    <div
      ref={stageRef}
      className="md:motion-safe:h-[var(--stage-h)]"
      style={{ "--stage-h": `calc(100vh + ${(n - 1) * STEP_VH}vh)` } as React.CSSProperties}
    >
      <div
        className={
          "relative overflow-hidden py-20 sm:py-28 " +
          "md:motion-safe:sticky md:motion-safe:top-0 md:motion-safe:flex md:motion-safe:h-screen " +
          "md:motion-safe:flex-col md:motion-safe:pb-8 md:motion-safe:pt-20"
        }
      >
        {/* 背景：每张卡的截图各一层，放大、重度模糊，只亮当前那层（交叉淡入）。
            跟卡片用同一个 src，浏览器缓存里已经有，不多下载。纯装饰，读屏跳过。
            只轻轻糊一下，看得出是哪个网站。scale 把模糊在边缘留下的透明晕推出画面外。 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {items.map((w, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={w.href}
              src={w.img}
              alt=""
              width={1440}
              height={900}
              loading="lazy"
              decoding="async"
              className={
                "absolute inset-0 h-full w-full scale-105 object-cover object-top blur-[6px] " +
                "transition-opacity duration-700 ease-out motion-reduce:transition-none " +
                (i === active ? "opacity-100" : "opacity-0")
              }
            />
          ))}
          {/* 暗罩。截图大多是白底亮色，不压一层会跟正文、卡片抢，只让颜色在背后透出来。
              实色半透明，不是氛围渐变。 */}
          <div className="absolute inset-0 bg-bg/60" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col px-5 sm:px-8 md:motion-safe:min-h-0 md:motion-safe:flex-1">
          {/* 毛玻璃外框，iPhone 那种：半透明白 + 背景模糊 + 顶边一道内高光。
              ⚠️ 这是站内两条规矩的**明确破例**，用户点名要的：
              ① 反 AI 清单禁 glassmorphism ② ≤768px 不开 backdrop-filter（手机性能）。
              所以模糊只在 md 以上开。手机只留半透明底与描边，不糊背景。
              内高光是 inset，不是投影：「层级不用投影」那条没破。 */}
          <div
            className={
              "flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 " +
              "[box-shadow:inset_0_1px_0_rgb(255_255_255/0.08)] sm:p-8 " +
              "md:backdrop-blur-md " +
              "md:motion-safe:min-h-0 md:motion-safe:flex-1 md:motion-safe:overflow-hidden md:motion-safe:p-8 lg:motion-safe:p-10"
            }
          >
          {header}

          <div className="relative mt-10 md:motion-safe:mt-8 md:motion-safe:min-h-0 md:motion-safe:flex-1">
            <ul
              ref={railRef}
              onScroll={onRailScroll}
              aria-label={t({ cn: "精选作品", en: "Selected work" }, lang)}
              className={
                "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] " +
                "sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden " +
                "md:motion-safe:mx-0 md:motion-safe:block md:motion-safe:h-full " +
                "md:motion-safe:overflow-visible md:motion-safe:p-0"
              }
            >
              {items.map((w, i) => (
                <li
                  key={w.href}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className={
                    "w-[85%] shrink-0 snap-center sm:w-[70%] md:w-[60%] " +
                    "md:motion-safe:absolute md:motion-safe:inset-0 md:motion-safe:flex md:motion-safe:w-auto " +
                    "md:motion-safe:flex-col md:motion-safe:justify-center"
                  }
                  style={{ zIndex: 10 + i }}
                >
                  {/* ── 一张卡 = 一扇浏览器窗口，左右撑满，放整张桌面版截图 ── */}
                  <div
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    style={
                      {
                        // 首帧（JS 还没跑）：第一张在位，其余在右边屏外
                        "--x": i === 0 ? "0px" : "100vw",
                        "--s": 1,
                        "--o": 1,
                      } as React.CSSProperties
                    }
                    className={
                      // 钉住时：比例贴着桌面截图（16:10 + 标题栏），高度不够才被 max-h 压矮，
                      // 压矮只会裁掉截图下半截，左右永远完整。直接 h-full 的话竖屏 iPad
                      // 框子又高又窄，cover 就去裁左右了。
                      // 轮播时 h-full：li 被 flex 拉成同高，卡也跟着撑满，每张卡一样高
                      "relative flex h-full origin-left flex-col overflow-hidden rounded-xl border border-hairline-strong bg-surface-1 " +
                      "md:motion-safe:aspect-[16/10.4] md:motion-safe:h-auto md:motion-safe:max-h-full " +
                      "md:motion-safe:opacity-[var(--o)] md:motion-safe:will-change-transform " +
                      "md:motion-safe:[transform:translate3d(var(--x),0,0)_scale(var(--s))]"
                    }
                  >
                    {/* 窗口标题栏。纯装饰，让截图读作「一个网站」而不是一张图。 */}
                    <div
                      aria-hidden
                      className="flex h-7 shrink-0 items-center gap-1.5 border-b border-hairline bg-surface-2 px-3 md:h-8 md:px-4"
                    >
                      <span className="h-2 w-2 rounded-full bg-hairline-strong" />
                      <span className="h-2 w-2 rounded-full bg-hairline-strong" />
                      <span className="h-2 w-2 rounded-full bg-hairline-strong" />
                    </div>

                    {/* 截图贴顶、左右不裁，只裁掉页面下半截，读起来就是窗口里的首屏 */}
                    <a
                      href={localize(w.href, lang)}
                      tabIndex={-1}
                      aria-hidden
                      className="group relative block aspect-[16/10] overflow-hidden md:motion-safe:aspect-auto md:motion-safe:min-h-0 md:motion-safe:flex-1"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.img}
                        alt={t(w.title, lang)}
                        width={1440}
                        height={900}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.015] motion-reduce:transition-none"
                      />
                    </a>

                    {/* ── 文字信息 ── 手机排在截图下面。钉住时浮在左下角，卡片动的时候先藏 */}
                    <div
                      ref={(el) => {
                        detailRefs.current[i] = el;
                      }}
                      style={{ "--dv": i === 0 ? 1 : 0 } as React.CSSProperties}
                      className={
                        "flex flex-1 flex-col items-start border-t border-hairline p-5 " +
                        "md:motion-safe:absolute md:motion-safe:bottom-6 md:motion-safe:left-6 " +
                        "md:motion-safe:w-[min(27rem,calc(100%-3rem))] md:motion-safe:rounded-xl md:motion-safe:border " +
                        "md:motion-safe:border-hairline-strong md:motion-safe:bg-surface-1 md:motion-safe:p-6 " +
                        "md:motion-safe:opacity-[var(--dv)] " +
                        "md:motion-safe:[transform:translate3d(0,calc((1_-_var(--dv))*12px),0)]"
                      }
                    >
                      <p className="text-xs tabular-nums tracking-[0.06em] text-accent">
                        <span className="hidden md:motion-safe:inline">
                          {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} ·{" "}
                        </span>
                        {t(w.tag, lang)}
                      </p>
                      <h3 className="mt-1.5 text-lg font-medium tracking-[-0.01em] text-ink md:motion-safe:text-xl">
                        {w.name}
                      </h3>
                      <p className="mt-2 inline-block rounded-md border border-hairline-strong px-2 py-1 text-[11px] text-ink-muted">
                        {t(w.industry, lang)}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(w.job, lang)}</p>
                      <dl className="hidden border-t border-hairline md:motion-safe:mt-4 md:motion-safe:grid md:motion-safe:gap-3 md:motion-safe:pt-4">
                        {(["goal", "action", "palette"] as const).map((key) => (
                          <div key={key} className="flex gap-3 text-[13px]">
                            <dt className="w-24 shrink-0 text-ink-subtle">{t(labels[key], lang)}</dt>
                            <dd className="text-ink">{t(w[key], lang)}</dd>
                          </div>
                        ))}
                      </dl>
                      <a
                        href={localize(w.href, lang)}
                        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm text-accent transition-colors hover:text-accent-hover"
                      >
                        {t(labels.read, lang)}
                        <span aria-hidden>→</span>
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 钉住时：四条进度条。轮播时：圆点。 */}
          <div aria-hidden className="mt-6 hidden gap-1.5 md:motion-safe:flex">
            {items.map((w, i) => (
              <span
                key={w.href}
                className={
                  "h-1 flex-1 rounded-sm transition-colors duration-300 " +
                  (i <= active ? "bg-accent" : "bg-hairline-strong")
                }
              />
            ))}
          </div>
          <div aria-hidden className="mt-6 flex justify-center gap-1.5 md:motion-safe:hidden">
            {items.map((w, i) => (
              <span
                key={w.href}
                className={
                  "h-1.5 rounded-sm transition-all duration-300 " +
                  (i === active ? "w-5 bg-accent" : "w-1.5 bg-hairline-strong")
                }
              />
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
