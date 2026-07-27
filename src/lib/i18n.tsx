import type { Bilingual } from "@/content/site";

/**
 * Renders both languages into the DOM (crawlable for GEO/SEO); CSS in
 * globals.css shows the active one. zh is the default, EN toggled client-side.
 */
export function Bi({ cn, en }: Bilingual) {
  return (
    <>
      <span className="lang-cn" lang="zh">
        {cn}
      </span>
      <span className="lang-en" lang="en">
        {en}
      </span>
    </>
  );
}
