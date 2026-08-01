import type { Metadata } from "next";
import { pathsFor, t, type Lang } from "./i18n";
import type { Bilingual } from "@/content/site";

/**
 * 核心页的 metadata。
 *
 * canonical 指向自己那一份；hreflang 中英**双向互指**，另加 x-default 指向
 * 主语言（英文）。两个地址必须成对存在 —— test/export/lang.test.ts 会验。
 */
export function pageMetadata({
  lang,
  path,
  title,
  description,
}: {
  lang: Lang;
  /** 英文版的路径，如 "/about"；中文版由它推出来。 */
  path: string;
  title: Bilingual;
  description: Bilingual;
}): Metadata {
  const paths = pathsFor(path);
  const self = paths[lang];
  const heading = t(title, lang);
  const summary = t(description, lang);

  return {
    title: { absolute: heading },
    description: summary,
    alternates: {
      canonical: self,
      languages: { en: paths.en, "zh-CN": paths.zh, "x-default": paths.en },
    },
    openGraph: {
      title: heading,
      description: summary,
      url: self,
      type: "website",
      locale: lang === "zh" ? "zh_CN" : "en_US",
    },
  };
}
