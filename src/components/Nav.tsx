"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bi } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { nav } from "@/content/site";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-hairline bg-bg/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-ink">
          H2O<span className="text-accent">Dreamer</span> Studio
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
              <Bi {...nav.services.label} />
              <span className="text-[10px]" aria-hidden>
                ▾
              </span>
            </button>
            <div className="invisible absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100">
              <div className="min-w-[190px] rounded-xl border border-hairline bg-surface-1 p-2 shadow-xl">
                {nav.services.items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Bi {...it.label} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <Bi {...l.label} />
            </Link>
          ))}

          <LangToggle className="text-sm" />
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
                href={it.href}
                onClick={() => setOpen(false)}
                className="py-2 text-ink-muted"
              >
                <Bi {...it.label} />
              </Link>
            ))}
            {nav.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-ink-muted"
              >
                <Bi {...l.label} />
              </Link>
            ))}
            <LangToggle className="mt-2 self-start text-sm" />
          </div>
        </div>
      )}
    </header>
  );
}
