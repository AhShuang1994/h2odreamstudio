"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { t, localize, type Lang } from "@/lib/i18n";
import { motionAllowed, REDUCED_MOTION } from "@/lib/motion";
import { site } from "@/content/site";
import type { ServiceCard } from "@/content/home";

/**
 * 服务档位选择器。同一堆卡片，两种壳：
 *
 * **桌面**，右边一条 S 形的线，六档是线上的小圆点，旁边写名字。滚到哪一档，
 * 那颗点就亮，线也从头亮到那里。左边出当前那一档。整段
 * **滚动钉住**：外层是一块 `100vh + (n-1)×STEP_VH` 的高舞台，里面那屏
 * `position: sticky` 咬住视口。多出来的行程切成 n 段，人往下滚，档位从最上面
 * 那个依次点亮，滚完最后一档才放行。
 *
 * **手机**，方块收掉，六张卡叠成一副**牌堆**：当前那张平放，后面的往右扇开
 * （`rotateY` + 缩小），底下一排前后钮加计数，可横滑。取自
 * `public/demos/wedding-premium-2.html` 的相册。
 *
 * 两种壳共用同一份卡片 DOM，只换外观，不是各写一套再用 `hidden` 藏一半，
 * 那样同一段正文会在页面上出现两次。
 *
 * 用 CSS `sticky` 而不是 ScrollTrigger 的 `pin`，与 HeroScrub 同一条理由：
 * pin 会插 pin-spacer 并接管高度，跟 Lenis 的惯性叠在一起容易抖。
 *
 * ⚠️ 钉住这件事有一个隐形前提：**祖先不能是 `overflow: hidden`**，那会造出一个
 * 滚动容器，sticky 就改为贴着它而不是视口。services 区块因此用 `overflow-x-clip`,
 * clip 只裁切，不造滚动容器。改那行之前先看这段。
 *
 * ⚠️ **手机版卡片有投影**，这是 sections.tsx 那条「层级不用投影」的**明确破例**
 * 牌堆靠投影分前后，没有它六张卡糊成一片。桌面那一侧仍然不用投影。
 *
 * 卡片**等高**靠 grid 叠放，不靠 JS 量：六张卡全落在同一个 `grid-area: 1/1`，
 * 行高自然取最高那张的内容高度，其余被 `stretch` 拉平。绝对定位做不到这点，
 * 它撑不起容器，反过来又要读容器高度，是个死循环。底部那行用 `mt-auto`
 * 压到卡底，短卡才不会吊在半空。
 */

/**
 * S 线：照用户手画的那条走，**不规则**，左右摆幅大小不一，点与点的间距也不一。
 *
 * 坐标写死在一个 360×640 的框里，线和点用同一套坐标，所以线一定穿过点的圆心。
 * （上一版是量 DOM 再画线，排版还没稳的时候量到就歪了。）
 *
 * 规则只有一条：**每颗点都是线往右摆到最远的地方**，前后的路径点都在它左边。
 * 标题写在点的右边，线就永远不会从字后面穿过去。改坐标时守住这条。
 */
const LINE_BOX = { w: 360, h: 640 };

/** 路径经过的所有点。`dot` 为 true 的六个依序对应六档，其余只是让线摆出去的弯。 */
const LINE_PTS: { x: number; y: number; dot?: true }[] = [
  { x: 60, y: 0 },
  { x: 150, y: 20 },
  { x: 160, y: 70, dot: true },
  { x: 40, y: 130 },
  { x: 120, y: 190, dot: true },
  { x: 95, y: 225 },
  { x: 175, y: 265, dot: true },
  { x: 20, y: 345 },
  { x: 60, y: 395 },
  { x: 140, y: 420, dot: true },
  { x: 80, y: 470 },
  { x: 110, y: 500, dot: true },
  { x: 10, y: 560 },
  { x: 150, y: 600, dot: true },
  { x: 90, y: 640 },
];

/** Catmull-Rom 穿点，转成三次贝塞尔段。 */
function toSegments(pts: { x: number; y: number }[]) {
  const segs: [number, number][][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    segs.push([
      [p1.x, p1.y],
      [p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6],
      [p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6],
      [p2.x, p2.y],
    ]);
  }
  return segs;
}

/**
 * 线的 `d`，以及每颗点在线上走到了全长的几成（给「亮到这里」用）。
 * 长度靠采样贝塞尔自己算，不碰 DOM，服务端渲染出来就是对的。
 */
const LINE = (() => {
  const segs = toSegments(LINE_PTS);
  const d =
    `M${segs[0][0][0]},${segs[0][0][1]}` +
    segs.map(([, c1, c2, e]) => ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${e[0]},${e[1]}`).join("");
  const lens = segs.map(([a, b, c, e]) => {
    let len = 0;
    let px = a[0];
    let py = a[1];
    for (let k = 1; k <= 40; k++) {
      const t = k / 40;
      const u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1];
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
    return len;
  });
  const total = lens.reduce((a, b) => a + b, 0);
  const at: number[] = [];
  let run = 0;
  LINE_PTS.forEach((p, i) => {
    if (i > 0) run += lens[i - 1];
    if (p.dot) at.push(run / total);
  });
  const dots = LINE_PTS.filter((p) => p.dot);
  return { d, at, dots };
})();

/** 每一档占多少视口高度的滚动行程。小了扫过去没人看清，大了滚得烦。 */
const STEP_VH = 55;

/** 钉住的条件。与 Tailwind 的 `lg:` 断点对齐：两边错开会钉住却不换档。 */
const PIN_QUERY = "(min-width: 1024px)";

/**
 * 牌堆里后面那几张的姿态，下标 = 离当前第几张。第 4 张往后一律用最后这组，
 * 叠在同一个位置，再往外扇只会溢出屏幕，看不出区别。
 */
const FAN = [
  { x: 0, rot: 0, scale: 1, opacity: 1 },
  { x: 22, rot: -10, scale: 0.93, opacity: 0.9 },
  { x: 38, rot: -16, scale: 0.87, opacity: 0.72 },
  { x: 50, rot: -20, scale: 0.82, opacity: 0.55 },
];

/** 横滑多少 px 才算翻页。低于这个数当成点击，不误触。 */
const SWIPE = 48;

declare global {
  interface Window {
    /** public/js/motion.js 挂出来的 Lenis 实例。没开平滑滚动时是 null。 */
    __h2odLenis?: {
      scrollTo: (target: number, opts?: { immediate?: boolean }) => void;
    } | null;
  }
}

export function ServicesPicker({
  items,
  lang,
  header,
}: {
  items: ServiceCard[];
  lang: Lang;
  /** 区块标题。放进钉住的那一屏里，跟说明框、S 线一起停住：放在外面的话，
   *  还没钉住前标题与内容之间会隔出一大段空。 */
  header: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** 钉住是否真的生效。决定点方块是「改状态」还是「跳滚动位置」。 */
  const pinned = useRef(false);
  /** 亮起来的那条 accent 线。钉住时每帧直接写它的 dashoffset，不走 React。 */
  const litRef = useRef<SVGPathElement>(null);

  // ── 滚动进度 → 当前档位（只在桌面钉住时）──────────────────────────
  /**
   * 不挂 `scroll` 监听，这个站跑着 Lenis，实测 window 上的 scroll 事件
   * 一发都收不到（它自己驱动滚动位置）。改成：IntersectionObserver 当开关，
   * 区块进视口才起一个 rAF 循环读 `getBoundingClientRect()`。
   *
   * 好处是**跟谁在驱动滚动无关**: Lenis、原生、还是以后换别的，读的都是
   * 最终布局位置。代价是区块可见时每帧一次 rect 读取，离开视口立刻停。
   */
  /**
   * 能不能钉，跟着媒体查询走：**不能只在挂载时算一次**。
   *
   * 算一次的后果：桌面浏览器拖窄、开开发者工具切手机视图、平板转个方向，
   * 版面已经变成手机那套了，`pinned` 还停在 true：于是横滑一下页面真的去跳
   * 滚动位置，屏幕凭空往下掉一截。
   */
  const [canPin, setCanPin] = useState(false);
  /** 线画到第一颗点了没。钉住前第一档虽然已是 active（左边卡要有内容），
   *  点要等线碰到才亮。 */
  const [reached, setReached] = useState(false);
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

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !canPin) return;
    pinned.current = true;

    let raf = 0;
    const tick = () => {
      const span = stage.offsetHeight - window.innerHeight;
      if (span > 0) {
        const top = stage.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, -top / span));
        // floor 而不是 round：n 段等分，p=0 落在第一档，p=1 落在最后一档
        setActive(Math.min(items.length - 1, Math.floor(p * items.length)));
        // 线跟着滚动连续走，不等换档才跳：第 i 段里从第 i 颗点匀速亮到第 i+1 颗，
        // 最后一段亮到线尾。点在 p = i/n 亮，线也正好在那一刻碰到它。
        const f = p * items.length;
        const k = Math.min(items.length - 1, Math.floor(f));
        const from = LINE.at[k];
        const to = LINE.at[k + 1] ?? 1;
        // 还没钉住（区块正往上滚进来）时，线头到第一颗点这一小段也跟着画出来，
        // 不然一进场这段就是满的。钉住前最后半屏走完它。
        setReached(top <= 0);
        const lit =
          top > 0
            ? LINE.at[0] * Math.max(0, 1 - top / (window.innerHeight * 0.5))
            : from + (to - from) * (f - k);
        litRef.current?.style.setProperty("stroke-dashoffset", String(1 - lit));
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !raf) raf = requestAnimationFrame(tick);
        else if (!e.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(stage);

    return () => {
      pinned.current = false;
      litRef.current?.style.removeProperty("stroke-dashoffset");
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length, canPin]);

  /**
   * 选中某一档。
   *
   * 钉住时不能只改 state，滚动位置才是真相，下一帧的 rAF 会立刻把它盖回去。
   * 所以把页面跳到那一段的中点。区块正钉着，这一跳在屏幕上看不出位移。
   *
   * ⚠️ **必须走 Lenis 的 `scrollTo`。** 直接 `window.scrollTo` 会被 Lenis 下一帧
   * 用它自己的内部位置写回去：表现就是「闪一下又弹回原来那档」。没开平滑滚动
   * （手机、减弱动态偏好）时它是 null，那时原生跳转才是对的。
   */
  const select = useCallback(
    (i: number) => {
      const stage = stageRef.current;
      if (!pinned.current || !stage) {
        setActive(i);
        return;
      }
      const span = stage.offsetHeight - window.innerHeight;
      // ⚠️ 不能用 `offsetTop`，它是相对定位祖先（Container 是 relative）算的，
      // 不是相对页面。rect + scrollY 才是文档坐标。
      const docTop = stage.getBoundingClientRect().top + window.scrollY;
      const top = docTop + (span * (i + 0.5)) / items.length;
      const lenis = window.__h2odLenis;
      if (lenis) lenis.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: "auto" });
      setActive(i);
    },
    [items.length],
  );

  const step = useCallback(
    (dir: -1 | 1) => select((active + dir + items.length) % items.length),
    [active, items.length, select],
  );

  /** 桌面：上下方向键换档，并把焦点带过去，不带焦点，读屏跟不上。 */
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + items.length) % items.length;
    select(next);
    tabRefs.current[next]?.focus();
  };

  /**
   * 手机横滑翻页。
   *
   * 两道闸：位移要够长（`SWIPE`），而且**横向要压过纵向**，不比一下 dy，
   * 上下滚页面时带一点横向抖动就会莫名其妙翻到下一张。
   * 容器那边配一条 `touch-action: pan-y`：纵向照常交给浏览器滚，横向归我们。
   */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from) return;
    const dx = e.changedTouches[0].clientX - from.x;
    const dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) <= Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  };

  const current = items[active];

  return (
    <div
      ref={stageRef}
      className="lg:motion-safe:h-[var(--stage-h)]"
      style={
        {
          "--stage-h": `calc(100vh + ${(items.length - 1) * STEP_VH}vh)`,
        } as React.CSSProperties
      }
    >
      <div
        className={
          "grid gap-10 " +
          // 标题、说明框、S 线同一屏钉住。靠上不置中，pt 让开固定导航（h-14）。
          // content-center 不能省：min-h-screen 多出来的高度，grid 默认会平分给
          // 每一行：标题那一行被撑高，标题底下空一大段。content-start 又会让
          // 空白全掉到底下。置中 = 标题与内容黏在一起，多的高度上下平分。
          "lg:sticky lg:top-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:content-center lg:items-start " +
          "lg:gap-x-16 lg:gap-y-8 lg:motion-safe:min-h-screen lg:motion-safe:pb-8 lg:motion-safe:pt-20 " +
          "lg:short:gap-y-5 lg:motion-safe:short:pt-16 lg:motion-safe:short:pb-4"
        }
      >
        {/* 钉住时标题拉成一行（取消 SectionHeading 的 22ch 折行），省下一行高度 */}
        <div className="order-first lg:col-span-2 lg:[&_h2]:max-w-none">{header}</div>
        {/* ── 卡堆：手机扇开，桌面只留当前那张 ── */}
        <div className="order-2 lg:order-1">
          <div
            role="region"
            aria-roledescription={t({ cn: "轮播", en: "carousel" }, lang)}
            aria-label={t({ cn: "服务档位", en: "Service tiers" }, lang)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="grid select-none touch-pan-y [perspective:1100px] lg:select-auto lg:touch-auto lg:[perspective:none]"
          >
            {items.map((s, i) => (
              <DeckCard
                key={s.id}
                s={s}
                i={i}
                total={items.length}
                lang={lang}
                baseId={baseId}
                offset={i - active}
                onSelect={() => select(i)}
              />
            ))}
          </div>

          {/* 手机：小圆点，只标位置。翻页靠左右滑。桌面靠右边那排方块，不需要这个。 */}
          <div aria-hidden className="mt-7 flex justify-center gap-1.5 lg:hidden">
            {items.map((s, i) => (
              <span
                key={s.id}
                className={
                  "h-1.5 rounded-sm transition-all duration-300 " +
                  (i === active ? "w-5 bg-accent" : "w-1.5 bg-hairline-strong")
                }
              />
            ))}
          </div>

          {/* 圆点不播报，换了档读屏要有动静 */}
          <p aria-live="polite" className="sr-only">
            {t(current.pill, lang)} · {t(current.title, lang)}
          </p>
        </div>

        {/* ── 桌面：S 线上的六颗点 ── */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={t({ cn: "服务档位", en: "Service tiers" }, lang)}
          onKeyDown={onTabsKeyDown}
          className="relative order-1 hidden lg:order-2 lg:block lg:h-[min(72vh,38rem)] lg:w-[22.5rem] lg:short:h-[62vh]"
        >
          {/* S 线本体：底下一条发丝线，上面一条 accent 线从头亮到当前那一档。
              圆点是实底，盖在线上。 */}
          <svg
            aria-hidden
            viewBox={`0 0 ${LINE_BOX.w} ${LINE_BOX.h}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            <path
              d={LINE.d}
              fill="none"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              className="stroke-hairline-strong"
            />
            <path
              ref={litRef}
              d={LINE.d}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - LINE.at[active]}
              // 钉住时由滚动逐帧驱动，再叠一层 transition 反而拖着走、显得卡
              className={
                "stroke-accent " +
                (canPin
                  ? ""
                  : "transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none")
              }
            />
          </svg>
          {items.map((s, i) => {
            const on = i === active;
            // 点亮与否跟选中分开：选中（焦点、读屏）照 active。亮要等线碰到。
            // 没钉住（窄屏、减弱动态）时线不跟滚动走，当前那档直接亮。
            const lit = on && (reached || !canPin);
            const p = LINE.dots[i];
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`${baseId}-tab-${s.id}`}
                aria-selected={on}
                aria-controls={`${baseId}-card-${s.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(i)}
                // 按钮左缘 = 点的圆心往左半个点宽（6px），点就正好落在线上的那个坐标
                style={{
                  left: `calc(${(p.x / LINE_BOX.w) * 100}% - 6px)`,
                  top: `${(p.y / LINE_BOX.h) * 100}%`,
                }}
                className={
                  "group absolute z-10 flex -translate-y-1/2 items-center gap-3.5 rounded-md py-1 pr-2 text-left " +
                  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                }
              >
                {/* 点。亮 = accent 实心 + 一圈淡光环，并放大一点。
                    没亮的是描边空心、底色压住线。 */}
                <span
                  data-dot
                  aria-hidden
                  className={
                    "h-3 w-3 shrink-0 rounded-full border transition-[background-color,border-color,transform,box-shadow] " +
                    "duration-300 ease-out motion-reduce:transition-none " +
                    (lit
                      ? "scale-125 border-accent bg-accent [box-shadow:0_0_0_5px_rgb(124_130_240/0.2)]"
                      : "border-ink-faint bg-bg group-hover:border-ink-subtle")
                  }
                />
                <span className="flex flex-col">
                  <span
                    className={
                      "text-[11px] font-medium tracking-[0.03em] transition-colors duration-300 " +
                      (lit ? "text-accent" : "text-ink-subtle")
                    }
                  >
                    {t(s.pill, lang)}
                    {s.badge && (
                      <span className="ml-1.5 rounded-sm bg-accent/15 px-1 py-px text-[10px] text-accent">
                        {t(s.badge, lang)}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      "text-sm font-medium leading-snug tracking-[-0.01em] transition-colors duration-300 " +
                      (lit ? "text-ink" : "text-ink-muted group-hover:text-ink")
                    }
                  >
                    {t(s.short, lang)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 牌堆里的一张。
 *
 * 手机：当前那张平放在左，后面的按 `FAN` 往右扇。已经翻过去的（offset < 0）
 * 整张滑出左边。桌面：只有当前那张在，其余透明且 `inert`，卡片外壳的投影
 * 卸掉、换成毛玻璃框：桌面那一侧不用投影。
 */
function DeckCard({
  s,
  i,
  total,
  lang,
  baseId,
  offset,
  onSelect,
}: {
  s: ServiceCard;
  i: number;
  total: number;
  lang: Lang;
  baseId: string;
  offset: number;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = offset === 0;
  const behind = offset > 0;
  const fan = FAN[Math.min(offset, FAN.length - 1)] ?? FAN[0];

  // `inert` 到 React 19 才是标准属性，这版手动设，省得 TS 与 DOM 打架。
  // 不设的话 Tab 键会跑进看不见的卡里，焦点凭空消失。
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (current) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [current]);

  return (
    <div
      ref={ref}
      id={`${baseId}-card-${s.id}`}
      role="group"
      aria-roledescription={t({ cn: "第几张", en: "slide" }, lang)}
      aria-label={`${i + 1} / ${total}`}
      aria-hidden={!current}
      onClick={behind ? onSelect : undefined}
      style={
        {
          // 整条 transform 走变量，桌面那边整条覆盖掉：逐个 Tailwind 变换类
          // 拼不出「手机 3D 扇开、桌面完全不变换」这两种状态。
          "--t": current
            ? "none"
            : behind
              ? `translateX(${fan.x}%) rotateY(${fan.rot}deg) scale(${fan.scale})`
              : "translateX(-60%)",
          "--op": current ? 1 : behind ? fan.opacity : 0,
          zIndex: total - Math.abs(offset),
        } as React.CSSProperties
      }
      className={
        // 六张全落同一格 → 行高 = 最高那张，其余被拉平，天然等高
        "col-start-1 row-start-1 w-[84%] origin-left " +
        "[transform:var(--t)] opacity-[var(--op)] " +
        "transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none " +
        (behind ? "cursor-pointer " : "") +
        // 桌面：扇形收掉，只留当前那张，占满整列
        "lg:w-full lg:[transform:none] " +
        (current ? "lg:opacity-100" : "lg:pointer-events-none lg:opacity-0")
      }
    >
      <div
        className={
          "h-full rounded-xl border border-hairline-strong bg-surface-1 " +
          // ⚠️ 投影是 sections.tsx 那条规矩的明确破例，只给手机牌堆用，
          // 六张卡叠在一起，没有投影就分不出前后。
          // 写成 `[box-shadow:…]` 而不是 `shadow-[…]`：v4 的 shadow-* 走
          // `--tw-shadow` 变量组合，逗号分隔的两层阴影会被吃掉，实测整条失效。
          "[box-shadow:0_24px_44px_-12px_rgb(0_0_0/0.85),0_6px_14px_rgb(0_0_0/0.5)] " +
          // 桌面：毛玻璃框，跟作品区（WorkShowcase）那个同一套，半透明白 +
          // 背景模糊 + 顶边内高光（inset，不是投影）。用户点名要的，是反 AI 清单
          // 禁 glassmorphism 那条的明确破例。模糊只给当前那张：六张叠在同一格，
          // 看不见的五张没必要各背一层 backdrop-filter。
          "lg:rounded-[1.75rem] lg:border-white/10 lg:bg-white/[0.04] " +
          "lg:[box-shadow:inset_0_1px_0_rgb(255_255_255/0.08)] " +
          (current ? "lg:backdrop-blur-md" : "")
        }
      >
        {/*
          正文与卡面分开两层：后面那几张只露右边一条，**正文必须藏掉**, 
          参考站那边叠的是照片，糊在一起是纹理。换成文字就是一片乱码。
          藏的是这一层，卡面（底色、描边、投影）留着，牌堆的前后关系才还在。
        */}
        <div
          className={
            "flex h-full flex-col p-5 transition-opacity duration-300 sm:p-7 " +
            "lg:p-10 lg:short:p-7 lg:opacity-100 " +
            (behind ? "opacity-0" : "opacity-100")
          }
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium tracking-[0.03em] text-accent">
              {t(s.group, lang)} · {t(s.pill, lang)}
            </p>
            {s.badge && (
              <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium leading-none text-accent lg:hidden">
                {t(s.badge, lang)}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-xl font-medium tracking-[-0.02em] text-ink sm:text-2xl lg:text-3xl xl:text-4xl lg:short:text-3xl">
            {t(s.title, lang)}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink lg:mt-4 lg:text-lg">
            {t(s.tagline, lang)}
          </p>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted lg:mt-3 lg:text-[15px]">
            {t(s.desc, lang)}
          </p>

          <ul className="mt-5 grid gap-2.5 border-t border-hairline pt-5 lg:mt-7 lg:pt-7 lg:short:mt-4 lg:short:gap-2 lg:short:pt-4">
            {s.features.map((f, k) => (
              <li key={k} className="flex gap-2.5 text-[13px] text-ink-muted lg:text-sm">
                <span aria-hidden className="mt-[3px] shrink-0 text-accent">
                  ✓
                </span>
                <span>{t(f, lang)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[13px] text-ink-subtle lg:mt-6 lg:short:mt-3">
            {t(s.delivery, lang)} · {t(s.revisions, lang)}
          </p>

          {/* mt-auto：卡等高，短的那几张底部这行才不会吊在半空 */}
          {/* 窄屏排成两行（价格一行、按钮一行）：挤在一行会把 CTA 的字断掉。
              到 lg 回到一行，跟桌面原来的样子一致。 */}
          <div className="mt-auto flex flex-col items-start gap-3 border-t border-hairline pt-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-4 lg:pt-7 lg:short:pt-4">
            <p className="text-xl tabular-nums text-ink lg:text-2xl">
              {t(s.price, lang)}
            </p>
            {/* flex-wrap 不能省：两个按钮的宽度加起来超过卡内宽度，不让换行
                「了解更多」就直接冲出卡外（`whitespace-nowrap` 只管单个不断词）。 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <a
                href={site.waLink(t(s.waMessage, lang))}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover active:bg-accent-press lg:px-5 lg:py-2.5"
              >
                {t(s.cta, lang)}
              </a>
              <Link
                href={localize(s.href, lang)}
                className="whitespace-nowrap text-sm text-ink-subtle transition-colors hover:text-ink"
              >
                {t({ cn: "了解更多", en: "Learn more" }, lang)}
                <span aria-hidden> →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
