"use client";

import { useEffect, useState } from "react";

type Lang = "zh" | "en";

function apply(l: Lang) {
  const el = document.documentElement;
  if (l === "en") {
    el.setAttribute("data-lang", "en");
    el.setAttribute("lang", "en");
  } else {
    el.removeAttribute("data-lang");
    el.setAttribute("lang", "zh");
  }
}

export function LangToggle({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<Lang>("zh");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("h2od-lang") as Lang | null;
      if (stored === "en") {
        setLang("en");
        apply("en");
      }
    } catch {}
  }, []);

  function toggle() {
    const next: Lang = lang === "zh" ? "en" : "zh";
    setLang(next);
    apply(next);
    try {
      localStorage.setItem("h2od-lang", next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle language / 切换语言"
      className={`${className} tracking-wide`}
    >
      <span className={lang === "zh" ? "text-ink" : "text-ink-subtle"}>中文</span>
      <span className="text-ink-subtle"> / </span>
      <span className={lang === "en" ? "text-ink" : "text-ink-subtle"}>EN</span>
    </button>
  );
}
