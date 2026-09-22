import { localize, t, type Lang } from "@/lib/i18n";
import { Button, Container, Eyebrow } from "@/components/ui";
import { site } from "@/content/site";

const copy = {
  title: {
    en: "This page has drifted off.",
    cn: "这个页面走丢了。",
  },
  body: {
    en: "The link may be out of date, or the address slightly off. Here are the ways back.",
    cn: "链接可能过期了，或者地址打错了一点。下面是几条回去的路。",
  },
  home: { en: "Home", cn: "首页" },
  work: { en: "Work", cn: "作品" },
  blog: { en: "Blog", cn: "博客" },
};

/**
 * 404 页主体（#93）。中英两条路由（`/404` 与 `/zh/404`）共用它。
 *
 * **这一页刻意中英并排**，与 `src/lib/i18n.ts` 的「每个页面只渲染一种语言」相反，
 * 那条规矩的两个理由在这里都不成立：两种语言都**可见**（不是靠 CSS 显隐，逐行揭示
 * 量得到宽度），页面又是 noindex（不存在同页两套正文的收录问题）。
 *
 * 之所以要并排：全站**保证**被服务的只有根部那一份 `out/404.html`。Cloudflare Pages
 * 会不会拿 `/zh/404.html` 去接 `/zh/` 下的未匹配地址，只有在真的预览链接上才验证得了
 * （同 ADR-0003 的那句叮嘱）。所以根部那份必须自己就能接住中文访客。
 */
export function NotFoundPage({ lang }: { lang: Lang }) {
  const other: Lang = lang === "zh" ? "en" : "zh";

  return (
    <main className="flex min-h-[70vh] items-center pb-24 pt-32">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>404</Eyebrow>

          <h1
            data-reveal
            lang={lang}
            className="mt-4 text-[34px] leading-[1.15] sm:text-[46px]"
          >
            {t(copy.title, lang)}
          </h1>
          <p
            data-reveal
            lang={other}
            className="mt-3 text-[22px] leading-[1.4] text-ink-muted sm:text-[28px]"
          >
            {t(copy.title, other)}
          </p>

          <p
            data-reveal
            lang={lang}
            className="mt-8 text-[15px] leading-relaxed text-ink-muted"
          >
            {t(copy.body, lang)}
          </p>
          <p
            data-reveal
            lang={other}
            className="mt-2 text-[15px] leading-relaxed text-ink-subtle"
          >
            {t(copy.body, other)}
          </p>

          {/* ⚠️ 按钮行与下面那行链接**不挂 data-reveal**：逐行揭示会把元素内的
              文本切开再把内层标签逐块克隆一遍，中文按字切，`首页` 就变成两个
              各含一个字的 `<a>`（实测 `回中文首页` 裂成 5 条链接）。
              全站的约定就是这样：揭示只挂在标题与纯文本段落上，见 Hero.tsx。 */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href={localize("/", lang)}>{t(copy.home, lang)}</Button>
            <Button href={localize("/#work", lang)} variant="secondary">
              {t(copy.work, lang)}
            </Button>
            <Button href={lang === "zh" ? "/zh/blog/" : "/blog/"} variant="secondary">
              {t(copy.blog, lang)}
            </Button>
            <Button href={site.waLink()} variant="secondary" external>
              WhatsApp
            </Button>
          </div>

          <p lang={other} className="mt-8 text-sm text-ink-faint">
            {other === "zh" ? (
              <a href="/zh" className="text-accent hover:text-accent-hover">
                回中文首页
              </a>
            ) : (
              <a href="/" className="text-accent hover:text-accent-hover">
                Back to the English home page
              </a>
            )}
          </p>
        </div>
      </Container>
    </main>
  );
}
