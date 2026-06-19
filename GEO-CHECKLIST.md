# GEO Checklist — H2ODreamer Studio

**GEO = Generative Engine Optimization.** Goal: structure the site so AI answer engines (ChatGPT, Claude, Perplexity, Google AI Overviews, Microsoft Copilot) can crawl it, understand it, and **cite it as the source**. SEO wins clicks; GEO wins citations.

> **House rule:** every new page, and every HTML change, passes this checklist before it is committed.
> New blog post → run all sections. Editing existing HTML → run the sections you touched + §1 and §8.

---

## 1 · Crawlability — let the AI in
- `robots.txt` explicitly welcomes AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Bytespider). Never silently block them.
- Private media stays under `Disallow: /assets/`. Anything meant to be **seen / cited** goes in a crawlable folder:
  - `/og/` — OG images, logo, author avatar (referenced by schema).
  - `/assets/blog/` — blog illustrations (`Allow: /assets/blog/` is set in **both** UA groups).
- Add every new URL to **`sitemap.xml`** (loc must equal the canonical; service pages extensionless, blog `.html`, blog index `/blog/`).
- Add every new page/post to **`llms.txt`** — the AI sitemap. One bullet: absolute URL + one-line description. *Treat it like sitemap.xml: stale = useless.*

## 2 · Page meta — every page
- Unique `<title>`, unique meta `description`, `<link rel="canonical">`.
- Open Graph + Twitter card; `og:image` / `twitter:image` → a crawlable `/og/*` image.
- `<html lang>` set; every text node carries `data-lang-en` + `data-lang-cn` (zh is the default rendered text).

## 3 · Structured data (JSON-LD) — must `JSON.parse` cleanly + pass Google Rich Results Test
- **Homepage**: `@graph` = `ProfessionalService` (`#business`) + `WebSite` (`#website`). Keep `sameAs` filled (Xiaohongshu + any new socials), plus `priceRange`, `contactPoint`.
- **Blog post**: a `BlogPosting` block **and** a second `FAQPage` block.
- **Author = `Person`** — never `Organization`. Hui Huang Ong, `jobTitle: Founder`, `worksFor`, crawlable `image` (`/og/founder-avatar.webp`), `description`, `sameAs`. Keep the same Person across all posts → builds a recognised author entity.
- **Blog index**: `Blog` with a `blogPost[]` list of all posts.

## 4 · Content structure — how AI lifts your answer
- **Answer-first.** A visible "⚡ 快速答案 / Quick Answer" box at the very top: the direct, liftable answer in 2–4 lines or bullets. Single biggest GEO lever.
- **Question-shaped headings.** Phrase H2s the way a real person asks an AI; put a direct answer in the first sentence under each heading.
- **Citable specifics.** Concrete numbers, prices (RM …), dates (2026), named places (Malaysia). AI cites specifics, not vague claims.
- **Comparisons as HTML** (tables / lists) — **never** baked into an image. AI cannot read text inside images.
- **FAQ mirrors the page.** Every Q&A in the `FAQPage` schema must be substantively answered in visible content (Quick Answer box + body). Don't invent FAQ that isn't on the page.
- **Internal links.** Link to ≥1 related post (topical authority + crawl path).
- Bottom **summary box** restating the takeaway.

## 5 · Author & E-E-A-T — every blog post is written by a person
- **Every post is authored as a named real Person** (Hui Huang Ong, Founder). No faceless brand posts.
- Visible **byline** (`✍ Hui Huang Ong`) + a visible **author bio card** at the end (avatar, name, role, bilingual bio, Xiaohongshu link).
- **Copywriter rule:** blog copy must carry the author's first-person voice and lived experience ("我跟很多小生意主聊下来发现…"). When `/copywriter` Blog Mode runs for this project, the **person element is mandatory** — that lived voice is what makes content E-E-A-T / GEO-compliant, not the byline alone.

## 6 · Visuals & performance
- Concept illustrations: on-brand (deep navy `#030B1A`/`#071428` + cyan `#00E5FF` / teal `#06D6A0` / violet `#7B61FF` glow), **no text inside the image**, descriptive `alt` + bilingual `<figcaption>` (captions get cited).
- Image pipeline: **Nano Banana (Gemini)** generates → raw drops in `assets/blog/` → `sharp` → WebP, ~1440px wide, q82 → **cover/inpaint the bottom-right Gemini watermark with the surrounding background** (clone a clean adjacent same-row patch over the sparkle; keep the FULL composition + 16:9). **Do NOT asymmetrically crop** — it changes the aspect ratio and unbalances the image. A "no watermark" prompt line is unreliable. **Keep the original PNG until the processed image is approved** (covering needs the source pixels). → semantic kebab filename.
- Every `<img>`: `loading="lazy"` + explicit `width`/`height` (no layout shift).
- Perf budget: critical CSS stays inlined; infinite animations off on mobile ≤768px. Run `node build.js` after any CSS/JS/relative-referenced-image change.

## 7 · Per-post deliverable — what every new blog post ships with
1. The post HTML, passing §1–6.
2. **Xiaohongshu post** image prompts — cover + carousel, 3:4, brand-aligned.
3. **Inline blog illustration** prompt(s) — 16:9, brand-aligned, no text, "keep bottom-right corner empty" (so the watermark cover/clone is clean).
4. `sitemap.xml` + `llms.txt` updated; `dateModified` / `lastmod` set.

## 8 · Pre-commit gate
- [ ] All JSON-LD parses + Google Rich Results Test passes
- [ ] `sitemap.xml` + `llms.txt` updated; `dateModified`/`lastmod` bumped if content changed
- [ ] Person author + visible bio card (blog)
- [ ] Quick Answer box and FAQ schema say the same thing
- [ ] Images: crawlable dir, WebP, lazy + dimensions, no text baked in, Gemini watermark removed
- [ ] Bilingual `data-lang-*` on every new text node
- [ ] Canonical + meta + OG present
- [ ] `node build.js` run if assets / CSS / JS changed

## 9 · Measuring GEO impact — is it working?
GEO is not instant: AI engines must re-crawl and re-index (days to a few weeks), and citations grow as authority signals accumulate. Track these, ordered by how soon they show signal:

1. **Validate the foundation (same day).** Run each page through Google's [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema Markup Validator](https://validator.schema.org/) → confirm `BlogPosting`, `FAQPage`, `Person`, `ProfessionalService` + `WebSite` are detected, no errors. Confirm `/robots.txt` and `/llms.txt` load live.
2. **Ask the AI engines directly (days–weeks).** In ChatGPT (search on), Perplexity, Google AI Overviews, and Copilot, ask the questions each post targets and watch for H2ODreamer being named/linked, or your specific facts ("RM 590", "RM 2,500") appearing. Test queries (EN + 中文):
   - "马来西亚小生意网站要多少钱" / "how much does a small-business website cost in Malaysia 2026"
   - "WhatsApp 够做生意吗还要网站吗" / "is WhatsApp enough for a small business or do I need a website"
   - "有 IG 小红书还需要网站吗" / "do I need a website if I already have social media"
   Re-run monthly; note the first time you appear.
3. **AI-referral traffic in GA4 (ongoing — the clearest "it's working" signal).** GA4 (`G-45NTTZBZC4`) → Acquisition → Traffic acquisition (or an Exploration on session source). Watch for referrals from `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `bing.com`. A rising trend = AI engines are citing you and sending real visitors.
4. **Google Search Console (set up if not already).** Add the property, submit `sitemap.xml`, then track target-query impressions/clicks, AI-Overview appearances, indexing status, and the Rich Results report. Best long-horizon dashboard.

Rule of thumb: foundation = same day · first AI citations ≈ 2–6 weeks after crawl · meaningful referral traffic ≈ 1–3 months as authority builds.

---

*GEO ≠ SEO: SEO optimises for ranking (clicks); GEO optimises for being the **quoted source** in an AI answer. The levers above — clean structured data, a real Person author, answer-first blocks, citable specifics, and crawlable content (not images-as-text) — are what make an AI pick you as the source.*
