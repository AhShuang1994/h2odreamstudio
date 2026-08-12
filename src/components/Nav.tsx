"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localize, t, type Lang } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { nav } from "@/content/site";

export function Nav({ lang }: { lang: Lang }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 滚动后是**实底**加一条发丝线，不是毛玻璃。backdrop-filter 在中低端安卓上
  // 会把 Style & Layout 拖到秒级（这个站以前真踩过），玻璃拟态本身也在自家
  // 反 AI 清单上。
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled ? "border-b border-hairline bg-bg" : "border-b border-transparent"
      }`}
    >
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
            <Link
              key={l.href}
              href={localize(l.href, lang)}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {t(l.label, lang)}
            </Link>
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
              <Link
                key={l.href}
                href={localize(l.href, lang)}
                onClick={() => setOpen(false)}
                className="py-2 text-ink-muted"
              >
                {t(l.label, lang)}
              </Link>
            ))}
            <LangToggle lang={lang} className="mt-2 self-start text-sm" />
          </div>
        </div>
      )}
    </header>
  );
}
