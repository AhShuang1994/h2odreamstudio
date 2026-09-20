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
 * **桌面** —— 右边一列圆角方块排成向右鼓出的弧，左边出当前那一档。整段
 * **滚动钉住**：外层是一块 `100vh + (n-1)×STEP_VH` 的高舞台，里面那屏
 * `position: sticky` 咬住视口；多出来的行程切成 n 段，人往下滚，档位从最上面
 * 那个依次点亮，滚完最后一档才放行。
 *
 * **手机** —— 方块收掉，六张卡叠成一副**牌堆**：当前那张平放，后面的往右扇开
 * （`rotateY` + 缩小），底下一排前后钮加计数，可横滑。取自
 * `public/demos/wedding-premium-2.html` 的相册。
 *
 * 两种壳共用同一份卡片 DOM，只换外观 —— 不是各写一套再用 `hidden` 藏一半，
 * 那样同一段正文会在页面上出现两次。
 *
 * 用 CSS `sticky` 而不是 ScrollTrigger 的 `pin` —— 与 HeroScrub 同一条理由：
 * pin 会插 pin-spacer 并接管高度，跟 Lenis 的惯性叠在一起容易抖。
 *
 * ⚠️ 钉住这件事有一个隐形前提：**祖先不能是 `overflow: hidden`**，那会造出一个
 * 滚动容器，sticky 就改为贴着它而不是视口。services 区块因此用 `overflow-x-clip`
 * —— clip 只裁切，不造滚动容器。改那行之前先看这段。
 *
 * ⚠️ **手机版卡片有投影**，这是 sections.tsx 那条「层级不用投影」的**明确破例**
 * —— 牌堆靠投影分前后，没有它六张卡糊成一片。桌面那一侧仍然不用投影。
 *
 * 卡片**等高**靠 grid 叠放，不靠 JS 量：六张卡全落在同一个 `grid-area: 1/1`，
 * 行高自然取最高那张的内容高度，其余被 `stretch` 拉平。绝对定位做不到这点
 * —— 它撑不起容器，反过来又要读容器高度，是个死循环。底部那行用 `mt-auto`
 * 压到卡底，短卡才不会吊在半空。
 */

/** 弧的鼓出幅度（px）。首尾缩进这么多，中间不缩。 */
const ARC = 56;

/** 每一档占多少视口高度的滚动行程。小了扫过去没人看清，大了滚得烦。 */
const STEP_VH = 55;

/** 钉住的条件。与 Tailwind 的 `lg:` 断点对齐 —— 两边错开会钉住却不换档。 */
const PIN_QUERY = "(min-width: 1024px)";

/**
 * 牌堆里后面那几张的姿态，下标 = 离当前第几张。第 4 张往后一律用最后这组，
 * 叠在同一个位置 —— 再往外扇只会溢出屏幕，看不出区别。
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
    /** public/js/motion.js 挂出来的 Lenis 实例；没开平滑滚动时是 null。 */
    __h2odLenis?: {
      scrollTo: (target: number, opts?: { immediate?: boolean }) => void;
    } | null;
  }
}

export function ServicesPicker({
  items,
  lang,
}: {
  items: ServiceCard[];
  lang: Lang;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** 钉住是否真的生效。决定点方块是「改状态」还是「跳滚动位置」。 */
  const pinned = useRef(false);

  // ── 滚动进度 → 当前档位（只在桌面钉住时）──────────────────────────
  /**
   * 不挂 `scroll` 监听 —— 这个站跑着 Lenis，实测 window 上的 scroll 事件
   * 一发都收不到（它自己驱动滚动位置）。改成：IntersectionObserver 当开关，
   * 区块进视口才起一个 rAF 循环读 `getBoundingClientRect()`。
   *
   * 好处是**跟谁在驱动滚动无关** —— Lenis、原生、还是以后换别的，读的都是
   * 最终布局位置；代价是区块可见时每帧一次 rect 读取，离开视口立刻停。
   */
  /**
   * 能不能钉，跟着媒体查询走 —— **不能只在挂载时算一次**。
   *
   * 算一次的后果：桌面浏览器拖窄、开开发者工具切手机视图、平板转个方向，
   * 版面已经变成手机那套了，`pinned` 还停在 true —— 于是横滑一下页面真的去跳
   * 滚动位置，屏幕凭空往下掉一截。
   */
  const [canPin, setCanPin] = useState(false);
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
        const p = Math.min(
          1,
          Math.max(0, -stage.getBoundingClientRect().top / span),
        );
        // floor 而不是 round：n 段等分，p=0 落在第一档，p=1 落在最后一档
        setActive(Math.min(items.length - 1, Math.floor(p * items.length)));
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
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length, canPin]);

  /**
   * 选中某一档。
   *
   * 钉住时不能只改 state —— 滚动位置才是真相，下一帧的 rAF 会立刻把它盖回去。
   * 所以把页面跳到那一段的中点。区块正钉着，这一跳在屏幕上看不出位移。
   *
   * ⚠️ **必须走 Lenis 的 `scrollTo`。** 直接 `window.scrollTo` 会被 Lenis 下一帧
   * 用它自己的内部位置写回去 —— 表现就是「闪一下又弹回原来那档」。没开平滑滚动
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
      // ⚠️ 不能用 `offsetTop` —— 它是相对定位祖先（Container 是 relative）算的，
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

  /** 桌面：上下方向键换档，并把焦点带过去 —— 不带焦点，读屏跟不上。 */
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
   * 两道闸：位移要够长（`SWIPE`），而且**横向要压过纵向** —— 不比一下 dy，
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
      className="mt-14 lg:mt-20 lg:motion-safe:h-[var(--stage-h)]"
      style={
        {
          "--stage-h": `calc(100vh + ${(items.length - 1) * STEP_VH}vh)`,
        } as React.CSSProperties
      }
    >
      <div
        className={
          "grid gap-10 " +
          "lg:sticky lg:top-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center " +
          "lg:gap-16 lg:motion-safe:min-h-screen lg:motion-safe:py-16"
        }
      >
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

          {/* 手机翻页控件。桌面靠右边那排方块，不需要这个。 */}
          <div className="mt-7 flex items-center justify-center gap-5 lg:hidden">
            <RoundButton
              dir="prev"
              label={t({ cn: "上一个服务", en: "Previous service" }, lang)}
              onClick={() => step(-1)}
            />
            <p className="min-w-[4.5rem] text-center text-sm tabular-nums tracking-[0.12em] text-ink-subtle">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </p>
            <RoundButton
              dir="next"
              label={t({ cn: "下一个服务", en: "Next service" }, lang)}
              onClick={() => step(1)}
            />
          </div>

          {/* 前后钮本身没有文字，不播报的话换了档读屏毫无动静 */}
          <p aria-live="polite" className="sr-only">
            {t(current.pill, lang)} · {t(current.title, lang)}
          </p>
        </div>

        {/* ── 桌面：弧形排开的六个方块 ── */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={t({ cn: "服务档位", en: "Service tiers" }, lang)}
          onKeyDown={onTabsKeyDown}
          className="order-1 hidden lg:order-2 lg:flex lg:flex-col lg:items-end lg:gap-[clamp(0.5rem,1.4vh,0.875rem)]"
        >
          {items.map((s, i) => {
            const on = i === active;
            // 首尾往左缩 ARC，中间不缩 —— sin 曲线给出中间的那道鼓
            const inset = Math.round(
              ARC * (1 - Math.sin((Math.PI * i) / (items.length - 1))),
            );
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
                style={{ "--inset": `-${inset}px` } as React.CSSProperties}
                className={
                  "group relative flex aspect-square w-full flex-col justify-end overflow-hidden " +
                  "rounded-xl border p-3 text-left transition-[background-color,border-color,opacity,transform] " +
                  "duration-300 ease-out motion-reduce:transition-none " +
                  // 方块跟着视口高度缩：六个加间距要塞进一屏，钉住才成立
                  "lg:w-[clamp(6rem,11.5vh,8rem)] lg:translate-x-[var(--inset)] " +
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
                  (on
                    ? "border-accent bg-surface-2"
                    : "border-hairline bg-surface-1 opacity-75 hover:bg-surface-2 hover:opacity-100")
                }
              >
                {s.badge && (
                  <span
                    className={
                      "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none " +
                      (on ? "bg-accent text-white" : "bg-accent/15 text-accent")
                    }
                  >
                    {t(s.badge, lang)}
                  </span>
                )}
                <span
                  className={
                    "text-[11px] font-medium tracking-[0.03em] " +
                    (on ? "text-accent" : "text-ink-subtle")
                  }
                >
                  {t(s.pill, lang)}
                </span>
                <span
                  className={
                    "mt-1 text-[13px] font-medium leading-snug tracking-[-0.01em] " +
                    (on ? "text-ink" : "text-ink-muted")
                  }
                >
                  {t(s.short, lang)}
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
 * 手机：当前那张平放在左，后面的按 `FAN` 往右扇；已经翻过去的（offset < 0）
 * 整张滑出左边。桌面：只有当前那张在，其余透明且 `inert`，卡片外壳（描边、
 * 圆角、内边距、投影）全部卸掉 —— 桌面那一侧不用投影。
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
          // 整条 transform 走变量，桌面那边整条覆盖掉 —— 逐个 Tailwind 变换类
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
          // ⚠️ 投影是 sections.tsx 那条规矩的明确破例，只给手机牌堆用 ——
          // 六张卡叠在一起，没有投影就分不出前后。
          // 写成 `[box-shadow:…]` 而不是 `shadow-[…]`：v4 的 shadow-* 走
          // `--tw-shadow` 变量组合，逗号分隔的两层阴影会被吃掉，实测整条失效。
          "[box-shadow:0_24px_44px_-12px_rgb(0_0_0/0.85),0_6px_14px_rgb(0_0_0/0.5)] " +
          "lg:rounded-none lg:border-0 lg:bg-transparent lg:[box-shadow:none]"
        }
      >
        {/*
          正文与卡面分开两层：后面那几张只露右边一条，**正文必须藏掉** ——
          参考站那边叠的是照片，糊在一起是纹理；换成文字就是一片乱码。
          藏的是这一层，卡面（底色、描边、投影）留着，牌堆的前后关系才还在。
        */}
        <div
          className={
            "flex h-full flex-col p-5 transition-opacity duration-300 sm:p-7 " +
            "lg:p-0 lg:opacity-100 " +
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

          <h3 className="mt-2 text-xl font-medium tracking-[-0.02em] text-ink sm:text-2xl lg:text-3xl xl:text-4xl">
            {t(s.title, lang)}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink lg:mt-4 lg:text-lg">
            {t(s.tagline, lang)}
          </p>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted lg:mt-3 lg:text-[15px]">
            {t(s.desc, lang)}
          </p>

          <ul className="mt-5 grid gap-2.5 border-t border-hairline pt-5 lg:mt-7 lg:pt-7">
            {s.features.map((f, k) => (
              <li key={k} className="flex gap-2.5 text-[13px] text-ink-muted lg:text-sm">
                <span aria-hidden className="mt-[3px] shrink-0 text-accent">
                  ✓
                </span>
                <span>{t(f, lang)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[13px] text-ink-subtle lg:mt-6">
            {t(s.delivery, lang)} · {t(s.revisions, lang)}
          </p>

          {/* mt-auto：卡等高，短的那几张底部这行才不会吊在半空 */}
          {/* 窄屏排成两行（价格一行、按钮一行）—— 挤在一行会把 CTA 的字断掉。
              到 lg 回到一行，跟桌面原来的样子一致。 */}
          <div className="mt-auto flex flex-col items-start gap-3 border-t border-hairline pt-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-4 lg:pt-7">
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

function RoundButton({
  dir,
  label,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        "flex h-11 w-11 items-center justify-center rounded-full border border-hairline-strong " +
        "bg-surface-1 text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      }
    >
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dir === "prev" ? <path d="M10 3 5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
      </svg>
    </button>
  );
}
