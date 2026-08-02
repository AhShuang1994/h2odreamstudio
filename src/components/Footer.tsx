import Link from "next/link";
import { localize, t, type Lang } from "@/lib/i18n";
import { site, nav } from "@/content/site";

export function Footer({ lang }: { lang: Lang }) {
  // 页脚踩底色而不是 surface-1 —— 页脚是页面最沉的一层，抬起来反而像又一张卡片。
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-xs">
            <div className="text-[15px] font-medium tracking-[-0.01em] text-ink">
              H2O<span className="text-accent">Dreamer</span> Studio
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-subtle">
              {t(
                {
                  cn: "马来西亚柔佛的网站设计工作室。从一滴水，到一片海。",
                  en: "A web design studio in Johor, Malaysia. From a single drop, to an ocean.",
                },
                lang,
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                {t(nav.services.label, lang)}
              </div>
              <ul className="space-y-2">
                {nav.services.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={localize(it.href, lang)}
                      className="text-sm text-ink-muted hover:text-ink"
                    >
                      {t(it.label, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                {t({ cn: "站点", en: "Site" }, lang)}
              </div>
              <ul className="space-y-2">
                {nav.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={localize(l.href, lang)}
                      className="text-sm text-ink-muted hover:text-ink"
                    >
                      {t(l.label, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                {t({ cn: "联系", en: "Contact" }, lang)}
              </div>
              <ul className="space-y-2">
                <li>
                  <a
                    href={site.waLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-muted hover:text-ink"
                  >
                    WhatsApp {site.whatsappDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={site.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-muted hover:text-ink"
                  >
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 text-xs text-ink-subtle sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} H2ODreamer Studio · Johor, Malaysia</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink-muted">
              {t({ cn: "隐私政策", en: "Privacy" }, lang)}
            </Link>
            <Link href="/terms" className="hover:text-ink-muted">
              {t({ cn: "条款", en: "Terms" }, lang)}
            </Link>
            {/* SIL OFL 第 2 条：随字体分发必须附带许可证全文并可被取得。
                两份都要列 —— 思源黑体版权方是 Adobe，宋体是 Google。
                见 docs/adr/0004-noto-cjk-self-hosted-subset.md。 */}
            <a href="/fonts/LICENSES.txt" className="hover:text-ink-muted" rel="license">
              {t({ cn: "字体授权", en: "Font license" }, lang)}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
