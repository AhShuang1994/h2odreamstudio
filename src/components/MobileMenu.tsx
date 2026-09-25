"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localize, t, type Lang } from "@/lib/i18n";
import { nav, site } from "@/content/site";
import { LangToggle } from "./LangToggle";
import { SiteLink } from "./SiteLink";

/**
 * 手机上的浮动菜单，叠在 WhatsAppFab 正上方。
 *
 * 手机上顶部导航不钉住（见 Nav.tsx），滚下去之后要换页全靠这颗。
 * md 以上导航本来就钉在顶上，这颗整个不出现。
 *
 * 位置：FAB 的 bottom（1.25rem）+ FAB 高度（3.5rem）+ 间距（0.75rem）
 * = 5.5rem，再加安全区，跟 WhatsAppFab 同一套算法，改一边要改另一边。
 */
export function MobileMenu({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "block rounded-lg px-3 py-2.5 text-[15px] text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink";

  return (
    <div className="md:hidden">
      {/* 遮罩：点外面就关。 */}
      {open && (
        <div aria-hidden onClick={close} className="fixed inset-0 z-40 bg-black/50" />
      )}

      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40">
        {open && (
          <div
            id="mobile-menu"
            className="absolute bottom-full right-0 mb-3 max-h-[70vh] w-[min(17rem,calc(100vw-2.5rem))] animate-[fade-in_180ms_ease-out] overflow-y-auto rounded-2xl border border-hairline-strong bg-surface-2 p-2"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] tracking-[0.14em] text-ink-subtle">
              {t(nav.services.label, lang)}
            </p>
            {nav.services.items.map((it) => (
              <Link key={it.href} href={localize(it.href, lang)} onClick={close} className={item}>
                {t(it.label, lang)}
              </Link>
            ))}

            <div className="my-2 h-px bg-hairline" />

            {nav.links.map((l) => (
              <SiteLink key={l.href} href={localize(l.href, lang)} onClick={close} className={item}>
                {t(l.label, lang)}
              </SiteLink>
            ))}

            <div className="my-2 h-px bg-hairline" />

            <div className="flex items-center justify-between px-3 py-1.5">
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center gap-2 py-1 text-[15px] text-ink-muted transition-colors hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                Instagram
              </a>
              <LangToggle lang={lang} className="text-sm" />
            </div>
          </div>
        )}

        <button
          type="button"
          aria-label={t({ cn: "菜单", en: "Menu" }, lang)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink transition-transform duration-150 active:scale-95"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
