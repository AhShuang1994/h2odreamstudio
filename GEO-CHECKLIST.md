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
- **`sitemap.xml` and `llms.txt` are build artifacts** — `scripts/gen-sitemap.mjs` and `scripts/gen-llms.mjs` write them straight into `out/` after `next build` (#77). They are not in `public/` and not in git; run `npm run build` to see them.
  - The sitemap is derived by scanning `out/` and reading each page's own `<link rel="canonical">`, so **a new page enters the sitemap automatically**. Nothing to add by hand. Just make sure the new page declares a canonical.
  - `llms.txt` = `src/content/llms.template.txt` (hand-written English entries + descriptions) + prices from `src/content/prices.json` (`{{starter}}`-style tokens) + a generated Chinese list of every `/zh` page. **A new English page must get a bullet in the template** — the build fails if an exported page has no entry, or if an entry points at a page that doesn't exist.
  - Exclusions live in `scripts/lib/exported-pages.mjs`: `404.html`, `demos/**` (Disallowed in robots.txt), `xhs.html`.

## 2 · Page meta — every page
- Unique `<title>`, unique meta `description`, `<link rel="canonical">`.
- Open Graph + Twitter card; `og:image` / `twitter:image` → a crawlable `/og/*` image.
- `<html lang>` set, and it must match the language actually rendered on the page.
- **One language per URL.** English is the primary language and lives at the root; Chinese is the additional language under `/zh`. A page never ships both languages — declare the counterpart with `hreflang` (`en`, `zh-CN`, `x-default`), bidirectionally, and make sure both addresses exist. See ADR-0002.
  - Core pages (Next-rendered) and content pages (blog, case studies) already work this way. Content pages are **generated** — edit the bilingual source in `src/content/pages/`, never `public/blog/**`, `public/case-studies/**` or `public/zh/**`; `scripts/split-content-lang.mjs` writes both languages at build time.
  - The four hand-written service pages (`landing-page`, `shopify-migration`, `wedding-basic`, `wedding-premium`) still carry the old `data-lang-en` / `data-lang-cn` pairs and a runtime toggle. Keep both attributes in step when editing them, until they get split too.

## 3 · Structured data (JSON-LD) — must `JSON.parse` cleanly + pass Google Rich Results Test
- **Homepage**: `@graph` = `ProfessionalService` (`#business`) + `WebSite` (`#website`). Keep `sameAs` filled (Xiaohongshu + any new socials), plus `priceRange`, `contactPoint`.
- **Blog post**: a `BlogPosting` block **and** a second `FAQPage` block — the latter is generated at build time from the visible FAQ section, see §4.
- **Author = `Person`** — never `Organization`. Hui Huang Ong, `jobTitle: Founder`, `worksFor`, crawlable `image` (`/og/founder-avatar.webp`), `description`, `sameAs`. Keep the same Person across all posts → builds a recognised author entity.
- **Blog index**: `Blog` with a `blogPost[]` list of all posts.

## 4 · Content structure — how AI lifts your answer
- **Answer-first.** A visible "⚡ 快速答案 / Quick Answer" box at the very top: the direct, liftable answer in 2–4 lines or bullets. Single biggest GEO lever.
- **Question-shaped headings.** Phrase H2s the way a real person asks an AI; put a direct answer in the first sentence under each heading.
- **Citable specifics.** Concrete numbers, prices (RM …), dates (2026), named places (Malaysia). AI cites specifics, not vague claims.
- **Comparisons as HTML** (tables / lists) — **never** baked into an image. AI cannot read text inside images.
- **FAQ is generated from the page, never written into the schema alone.** Google forbids `FAQPage` markup for content a visitor cannot see. On content pages the Q&A lives in a visible `<details class="faq-item">` block and `scripts/split-content-lang.mjs` builds the `FAQPage` node from it at build time — so add the questions to the source page, not to a JSON-LD block. `test/export/geo.test.ts` fails the build if any page's schema carries a question or answer that isn't on the page.
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
- [ ] New page declares a canonical (that's what puts it in the sitemap) and has a bullet in `src/content/llms.template.txt`; `dateModified` bumped if content changed (`lastmod` is read from it)
- [ ] Person author + visible bio card (blog)
- [ ] Quick Answer box and FAQ schema say the same thing
- [ ] Images: crawlable dir, WebP, lazy + dimensions, no text baked in, Gemini watermark removed
- [ ] One language per URL, `<html lang>` matches it, `hreflang` pair declared both ways (legacy `public/` pages: keep `data-lang-*` in step until #76)
- [ ] Canonical + meta + OG present
- [ ] `node build.js` run if assets / CSS / JS changed

## 9 · Measuring GEO impact — is it working?
GEO is not instant: AI engines must re-crawl and re-index (days to a few weeks), and citations grow as authority signals accumulate. **Verify in layers — each layer is a prerequisite for the next.** Run layer 1 after every change, layers 2–3 every 2 weeks with the *same* question set (log results — trends, not vibes), layer 4 monthly.

1. **Layer 1 — foundation is live (same day, after every deploy).** `/robots.txt`, `/llms.txt`, `/sitemap.xml`, and the IndexNow key file (`35645bff….txt`) all load. New/changed pages pass Google's [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema Markup Validator](https://validator.schema.org/) → `BlogPosting`, `FAQPage`, `Person`, `ProfessionalService` + `WebSite` detected, no errors.
2. **Layer 2 — search engines have indexed you (the prerequisite AI retrieval depends on).** AI engines can only cite pages that are in their underlying index: **ChatGPT/Copilot → Bing, Gemini/AI Overviews → Google.** If a page isn't indexed, layer 3 will fail no matter how good the GEO is.
   - **Bing:** search `site:h2o-dreamer-studio.com` — page count should grow toward sitemap size. Bing Webmaster Tools → IndexNow panel shows submissions. After every deploy of new/changed pages, run `node scripts/indexnow-submit.js`.
   - **Google:** GSC → Page indexing report; new posts get a manual URL Inspection → Request Indexing (Google does **not** support IndexNow).
3. **Layer 3 — ask the AI engines (the real GEO test).** **Search/browsing mode must be ON** — without it you're testing the model's training data, which predates the site. Test Perplexity first (fastest to index new sites, clearest source display), then ChatGPT Search, Copilot, and last Gemini / AI Overviews (slowest). **Pass = your domain appears in the answer's cited sources**, not merely a name-drop. Climb the query ladder — each step needs more authority:
   - ① Brand: "H2ODreamer Studio 是做什么的" → proves indexing works (expect first)
   - ② Brand + domain: "h2o-dreamer-studio.com 提供什么服务" → proves content is readable
   - ③ Long-tail (the GEO battleground — what the blog is written for):
     - "马来西亚小生意网站要多少钱" / "how much does a small-business website cost in Malaysia 2026"
     - "WhatsApp 够做生意吗还要网站吗" / "is WhatsApp enough for a small business or do I need a website"
     - "有 IG 小红书还需要网站吗" / "do I need a website if I already have social media"
   - ④ Competitive: "Malaysia web design 推荐" → needs external authority (directories, GBP, backlinks); don't expect this early
4. **Layer 4 — passive signals (monthly).**
   - **AI-referral traffic in GA4 (the clearest "it's working" signal).** GA4 (`G-45NTTZBZC4`) → Acquisition → Traffic acquisition. Referrals from `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `bing.com` = AI engines are citing you and sending real visitors.
   - **GSC**: target-query impressions/clicks, AI-Overview appearances, indexing status, Rich Results report. Best long-horizon dashboard.

Rule of thumb: foundation = same day · indexed ≈ days (Bing/IndexNow) to 2–8 weeks (Google) · brand-query citations (①②) ≈ 2–4 weeks · long-tail citations (③) ≈ 1–3 months · competitive mentions (④) ≈ 3–6 months as authority builds.

---

*GEO ≠ SEO: SEO optimises for ranking (clicks); GEO optimises for being the **quoted source** in an AI answer. The levers above — clean structured data, a real Person author, answer-first blocks, citable specifics, and crawlable content (not images-as-text) — are what make an AI pick you as the source.*
