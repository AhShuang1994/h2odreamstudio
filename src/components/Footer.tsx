import Link from "next/link";
import { Bi } from "@/lib/i18n";
import { site, nav } from "@/content/site";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface-1">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="text-[15px] font-semibold text-ink">
              H2O<span className="text-accent">Dreamer</span> Studio
            </div>
            <p className="mt-3 text-sm text-ink-subtle">
              <Bi
                cn="马来西亚柔佛的网站设计工作室。从一滴水，到一片海。"
                en="A web design studio in Johor, Malaysia. From a single drop, to an ocean."
              />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                <Bi {...nav.services.label} />
              </div>
              <ul className="space-y-2">
                {nav.services.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="text-sm text-ink-muted hover:text-ink">
                      <Bi {...it.label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                <Bi cn="站点" en="Site" />
              </div>
              <ul className="space-y-2">
                {nav.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-muted hover:text-ink">
                      <Bi {...l.label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 text-xs font-medium tracking-wide text-ink-subtle">
                <Bi cn="联系" en="Contact" />
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
              <Bi cn="隐私政策" en="Privacy" />
            </Link>
            <Link href="/terms" className="hover:text-ink-muted">
              <Bi cn="条款" en="Terms" />
            </Link>
            {/* SIL OFL 第 2 条：随字体分发必须附带许可证全文并可被取得。
                两份都要列 —— 思源黑体版权方是 Adobe，宋体是 Google。
                见 docs/adr/0004-noto-cjk-self-hosted-subset.md。 */}
            <a
              href="/fonts/LICENSES.txt"
              className="hover:text-ink-muted"
              rel="license"
            >
              <Bi cn="字体授权" en="Font license" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
