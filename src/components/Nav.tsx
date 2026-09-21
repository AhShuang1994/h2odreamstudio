"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { localize, t, type Lang } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { nav } from "@/content/site";
import { SiteLink } from "./SiteLink";

export function Nav({ lang }: { lang: Lang }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // 文档顶部 16px 处埋一个 1px 的哨兵：它离开视口，就等于滚过了
  // 16px。不用 window 的 scroll 监听 —— 那个滚动时每帧都要跑一次回调，
  // 还跟 Lenis 的 rAF 循环挤在同一帧。判定交给浏览器，主线程上不留监听。
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 滚动后是**实底**加一条发丝线，不是毛玻璃。backdrop-filter 在中低端安卓上
  // 会把 Style & Layout 拖到秒级（这个站以前真踩过），玻璃拟态本身也在自家
  // 反 AI 清单上。
  return (
    <>
      {/* 哨兵。absolute 不占位，不参与布局。 */}
      <div ref={sentinel} aria-hidden className="absolute top-4 h-px w-full" />
      {/*
        `pt-[env(safe-area-inset-top)]` 跟 layout 里的 `viewportFit: "cover"`
        是一套的，缺一不可：

        cover 让 layout viewport 铺满整屏，`fixed top-0` 才贴得到真正的顶边
        （不加的话 iOS Safari 把 fixed 关在状态栏下面，正文却满屏绘制，
        上面那条就一直漏字）；padding 再把导航自己的内容推回状态栏下面，
        于是这块 `bg-bg` 正好盖住状态栏那一条。

        WhatsAppFab 那边补的是 bottom —— 三处一起看。

        手机上**一直是实底**，不等滚动：iOS 26 Safari 的状态栏那条不画网页，
        是 Safari 自己画的 —— 它在屏幕顶端往里 8px 打一个点，找到 fixed 元素，
        读它的 background-color 来上色。页面刚载入时导航是透明的，Safari 读不到
        颜色，就把状态栏画成「模糊的正文」，而且冻住不再更新。所以透明态只留给
        md 以上（桌面没有这一条）。
      */}
      <header
        className={`fixed inset-x-0 top-0 z-50 bg-bg pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
          scrolled ? "border-b border-hairline" : "border-b border-transparent md:bg-transparent"
        }`}
      >
        {/*
          再往上垫一块实底，兜住安卓那条路：浏览器顶栏收合的那一下，`fixed`
          跟不上合成器，会闪出同样的缝。导航贴着屏幕顶的正常情况下这块整个在
          视口外，看不见也不占位。
        */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-full h-24 ${
            scrolled ? "bg-bg" : ""
          }`}
        />
        <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link
            href={localize("/", lang)}
            className="text-[15px] font-medium tracking-[-0.01em] text-ink"
          >
            H2O<span className="text-accent">Dreamer</span> Studio
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <div className="group relative">
              <button className="flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
                {t(nav.services.label, lang)}
                <span className="text-[10px]" aria-hidden>
                  ▾
                </span>
              </button>
              <div className="invisible absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100">
                {/* 抬起靠表面阶梯 + 发丝描边，不用投影 —— 暗色上的投影只会糊。 */}
                <div className="min-w-[190px] rounded-xl border border-hairline-strong bg-surface-2 p-1.5">
                  {nav.services.items.map((it) => (
                    <Link
                      key={it.href}
                      href={localize(it.href, lang)}
                      className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      {t(it.label, lang)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {nav.links.map((l) => (
              <SiteLink
                key={l.href}
                href={localize(l.href, lang)}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {t(l.label, lang)}
              </SiteLink>
            ))}

            <LangToggle lang={lang} className="text-sm" />
          </div>

          <button
            className="flex flex-col gap-1.5 md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-0.5 w-6 bg-ink" />
            <span className="block h-0.5 w-6 bg-ink" />
            <span className="block h-0.5 w-6 bg-ink" />
          </button>
        </nav>

        {open && (
          <div className="border-t border-hairline bg-bg px-5 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {nav.services.items.map((it) => (
                <Link
                  key={it.href}
                  href={localize(it.href, lang)}
                  onClick={() => setOpen(false)}
                  className="py-2 text-ink-muted"
                >
                  {t(it.label, lang)}
                </Link>
              ))}
              {nav.links.map((l) => (
                <SiteLink
                  key={l.href}
                  href={localize(l.href, lang)}
                  onClick={() => setOpen(false)}
                  className="py-2 text-ink-muted"
                >
                  {t(l.label, lang)}
                </SiteLink>
              ))}
              <LangToggle lang={lang} className="mt-2 self-start text-sm" />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
