"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type Item = { id: string; num: string | null; label: string };

/** 读哪些标题：正文里的 h2，加上 FAQ 区的标题。CTA 的 h2 不算 —— 它不是章节。 */
const HEADINGS = ".legacy-content .article-content h2, .legacy-content .detail-faq h2";

/** 导航栏高度。hero 的底边滚过这条线，目录才出现。 */
const NAV = 80;

/**
 * 文章页左侧的「本页目录」。
 *
 * 正文 HTML 冻结（#65），所以不在原稿里写锚点，而是挂载后从 DOM 里读 h2、
 * 缺 id 的补一个 `sec-N`。点击走的是 `<a href="#id">`，由 main.js 那段
 * 锚点拦截接手（扣掉导航高度、扛住懒加载图片撑高页面）。
 *
 * 外观照正文的 `.summary-box` 卡片与 h2 的竖条、编号来 —— 同一张底色、
 * 同一条描边、同一个 16px 圆角、同一种靛紫竖条。
 *
 * 只在 ≥1280px 出现 —— 正文 720px 居中，窄于这个宽度左边放不下。
 * hero 还在屏幕上时隐藏：hero 的标题是满宽居中的，目录会压在标题上。
 *
 * 同一个滚动监听还驱动两样东西，所有宽度都有：
 * · 屏幕顶端的阅读进度条 —— 从正文开始算，到 CTA 露出屏幕底部为 100%。
 *   目录卡片里再写一句「还剩约 N 分钟」，N 按原稿 hero 上的「6 min read」折算。
 * · 左下角的「回到顶部」。右下角已经叠了 WhatsApp 与手机菜单，不再往上堆。
 */
export function ArticleToc({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const hs = Array.from(document.querySelectorAll<HTMLElement>(HEADINGS));
    const list = hs.map((h, i) => {
      if (!h.id) h.id = `sec-${i + 1}`;
      const num = h.querySelector(".h2-num")?.textContent?.trim() ?? null;
      const clone = h.cloneNode(true) as HTMLElement;
      clone.querySelector(".h2-num")?.remove();
      // 「⚡ Quick answer」前面的 emoji 在窄栏里只是噪音
      const label = (clone.textContent ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
      return { id: h.id, num, label };
    });
    setItems(list);

    // 原稿 hero 上写着「⏱ 6 min read」/「⏱ 阅读约 6 分钟」
    const meta = document.querySelector(".legacy-content .article-meta")?.textContent ?? "";
    const m = /(\d+)\s*(?:min|分钟)/.exec(meta);
    setMinutes(m ? Number(m[1]) : null);

    const body = document.querySelector<HTMLElement>(".legacy-content .article-body-section");
    const hero = document.querySelector<HTMLElement>(".legacy-content .detail-hero");
    const cta = document.querySelector<HTMLElement>(".legacy-content .article-cta");

    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let cur: string | null = null;
      for (const h of hs) {
        if (h.getBoundingClientRect().top <= line) cur = h.id;
        else break;
      }
      setActive(cur ?? hs[0]?.id ?? null);
      const past = hero ? hero.getBoundingClientRect().bottom < NAV : true;
      const end = cta ? cta.getBoundingClientRect().top < window.innerHeight * 0.8 : false;
      setShown(past && !end);

      if (body) {
        const start = body.getBoundingClientRect().top + window.scrollY - NAV;
        const stop = cta
          ? cta.getBoundingClientRect().top + window.scrollY - window.innerHeight
          : document.documentElement.scrollHeight - window.innerHeight;
        const p = (window.scrollY - start) / Math.max(1, stop - start);
        setProgress(Math.min(1, Math.max(0, p)));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const title = lang === "zh" ? "本页目录" : "On this page";
  const pct = Math.round(progress * 100);
  const left = minutes === null ? null : Math.max(0, Math.ceil(minutes * (1 - progress)));
  const status =
    pct >= 100
      ? lang === "zh" ? "读完了" : "Finished"
      : left === null
        ? `${pct}%`
        : lang === "zh" ? `${pct}% · 还剩约 ${left} 分钟` : `${pct}% · ~${left} min left`;
  const pastHero = shown || progress > 0;

  return (
    <>
      {/* 阅读进度条。装饰性的 —— 同样的信息在目录卡片里有文字版。 */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
        <div
          className="h-full origin-left bg-gradient-to-r from-accent to-accent-hover"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <button
        type="button"
        aria-label={lang === "zh" ? "回到顶部" : "Back to top"}
        onClick={() => {
          const lenis = window.__h2odLenis;
          if (lenis) lenis.scrollTo(0);
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-[calc(1.25rem+env(safe-area-inset-left))] z-40
          flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink-muted
          transition-[opacity,translate,color,background-color] duration-300 hover:bg-surface-3 hover:text-ink
          ${pastHero ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      {items.length >= 2 && (
        <nav
          aria-label={title}
          className={`fixed top-24 z-10 hidden w-[232px] rounded-2xl border border-hairline bg-surface-2 p-5
            transition-[opacity,translate] duration-300 xl:block
            left-[max(24px,calc(50%-360px-32px-232px))]
            ${shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
        >
          <p className="relative mb-3 pl-3.5 text-[15px] font-bold tracking-[-0.01em] text-ink
            before:absolute before:inset-y-[3px] before:left-0 before:w-1 before:rounded before:bg-accent">
            {title}
          </p>
          <ol className="max-h-[calc(100vh-220px)] space-y-0.5 overflow-y-auto">
            {items.map((it) => {
              const on = it.id === active;
              return (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    onClick={() => {
                      // main.js 已经 preventDefault 并用 window.scrollTo 滚过去了；但桌面上
                      // Lenis 接管着滚动，会把 window.scrollTo 写回去（见 ServicesPicker），
                      // 所以再交给它滚一次。偏移与 main.js 同一个算法：导航高度 + 18。
                      const lenis = window.__h2odLenis;
                      const el = document.getElementById(it.id);
                      if (!lenis || !el) return;
                      const nav = document.querySelector<HTMLElement>("header, .navbar");
                      const top = el.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 64) - 18;
                      lenis.scrollTo(Math.max(0, top));
                    }}
                    aria-current={on ? "location" : undefined}
                    className={`flex gap-2 rounded-lg px-2.5 py-2 text-[13px] leading-snug transition-colors
                      ${on ? "bg-accent/10 text-ink" : "text-ink-subtle hover:bg-surface-3 hover:text-ink-muted"}`}
                  >
                    {it.num && (
                      <span className={`shrink-0 font-semibold tabular-nums ${on ? "text-accent" : "text-accent/60"}`}>
                        {it.num}
                      </span>
                    )}
                    <span className="line-clamp-2">{it.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 border-t border-hairline pt-4">
            <div className="h-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full origin-left rounded-full bg-accent"
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
            <p className="mt-2 text-[12px] tabular-nums text-ink-subtle">{status}</p>
          </div>
        </nav>
      )}
    </>
  );
}
