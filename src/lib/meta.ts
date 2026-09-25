import type { Metadata } from "next";
import { pathsFor, t, type Lang } from "./i18n";
import type { Bilingual } from "@/content/site";

/**
 * 页面的 metadata。
 *
 * canonical 指向自己那一份。hreflang 中英**双向互指**，另加 x-default 指向
 * 主语言（英文）。两个地址必须成对存在，test/export/lang.test.ts 会验。
 *
 * 地址有两种给法：
 * · 核心页给 `path`（英文路径），中文版由 `pathsFor()` 推出来
 * · 内容页给 `urls`，它们的**已收录形态**推不出来：文章页带 `.html`
 *   （`/blog/x.html`），索引页带尾斜杠（`/blog/`）。一个字都不能动，
 *   所以直接给，不推。
 */
export function pageMetadata({
  lang,
  path,
  urls,
  title,
  description,
  og,
}: {
  lang: Lang;
  /** 英文版的路径，如 "/about"、中文版由它推出来。与 `urls` 二选一。 */
  path?: string;
  /** 两种语言的完整路径，用于推不出来的内容页地址。与 `path` 二选一。 */
  urls?: Record<Lang, string>;
  title: Bilingual;
  description: Bilingual;
  /** 文章页要 `type: "article"` 与封面图。核心页不传，默认 website。 */
  og?: {
    type?: "website" | "article";
    image?: string | null;
    publishedTime?: string | null;
    section?: string | null;
  };
}): Metadata {
  const paths = urls ?? pathsFor(path!);
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
      type: og?.type ?? "website",
      locale: lang === "zh" ? "zh_CN" : "en_US",
      ...(og?.image ? { images: [{ url: og.image }] } : {}),
      ...(og?.type === "article"
        ? {
            ...(og.publishedTime ? { publishedTime: og.publishedTime } : {}),
            ...(og.section ? { section: og.section } : {}),
          }
        : {}),
    },
  };
}

/** 内容页的 metadata：从原稿里已经抽好的字段填。 */
export function articleMetadata(
  doc: {
    urls: Record<Lang, string>;
    title: Record<Lang, string>;
    description: Record<Lang, string>;
    meta: {
      image: string | null;
      datePublished: string | null;
      section: string | null;
      ogType: "website" | "article";
    };
  },
  lang: Lang,
): Metadata {
  return pageMetadata({
    lang,
    urls: doc.urls,
    title: { cn: doc.title.zh, en: doc.title.en },
    description: { cn: doc.description.zh, en: doc.description.en },
    og: {
      // 原稿自己声明的，文章是 article，索引页与服务页是 website。
      // 别按目录推：服务页不在 pages/ 下，索引页与文章同目录。
      type: doc.meta.ogType,
      image: doc.meta.image,
      publishedTime: doc.meta.datePublished,
      section: doc.meta.section,
    },
  });
}
