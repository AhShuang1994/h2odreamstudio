"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { otherLangHref, type Lang } from "@/lib/i18n";

/**
 * 语言切换 —— 跳到**当前页面**的另一语言版本，不是回首页（ADR-0002）。
 *
 * 语言现在由地址本身决定，刷新自然保持。这里额外把选择记进 localStorage，
 * 留给以后需要「记住语言」的地方用；**不做自动跳转** —— 根路径是全站权重
 * 最高的地址，在它上面做 JS 跳转会被搜索引擎当成重定向。
 */
export function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const pathname = usePathname();
  const href = otherLangHref(pathname, lang);

  return (
    <Link
      href={href}
      hrefLang={lang === "zh" ? "en" : "zh-CN"}
      onClick={() => {
        try {
          localStorage.setItem("h2od-lang", lang === "zh" ? "en" : "zh");
        } catch {}
      }}
      aria-label="Toggle language / 切换语言"
      className={`${className} tracking-wide`}
    >
      <span className={lang === "zh" ? "text-ink" : "text-ink-subtle"}>中文</span>
      <span className="text-ink-subtle"> / </span>
      <span className={lang === "en" ? "text-ink" : "text-ink-subtle"}>EN</span>
    </Link>
  );
}
