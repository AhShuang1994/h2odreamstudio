# GEO Checklist — H2ODreamer Studio

**GEO = Generative Engine Optimization.** Goal: structure the site so AI answer engines (ChatGPT, Claude, Perplexity, Google AI Overviews, Microsoft Copilot) can crawl it, understand it, and **cite it as the source**. SEO wins clicks; GEO wins citations.

> **House rule:** every new page, and every HTML change, passes this checklist before it is committed.
> New blog post → run all sections. Editing existing HTML → run the sections you touched + §1, §8 and §10.

**SEO companions — read these too:**
- [`docs/seo-lessons.md`](docs/seo-lessons.md) — SEO mistakes this site really made, and the rule for each. **Read it before touching URLs, canonical, hreflang, sitemap, robots.txt or hosting.**
- [`docs/seo-action-plan.md`](docs/seo-action-plan.md) — current SEO to-dos (GSC, Google Business Profile, Bing, backlinks). Tick items there when done.

---

## 1 · Crawlability — let the AI in
- `robots.txt` explicitly welcomes AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Bytespider). Never silently block them.
- **Never Disallow what a page needs to render**: `/css/`, `/js/`, `/_next/`, `/fonts/`. Google renders the page with them; blocked, Googlebot sees an unstyled page (`docs/seo-lessons.md` §6, `test/export/seo.test.ts`).
- Private media stays under `Disallow: /assets/`. Anything meant to be **seen / cited** goes in a crawlable folder:
  - `/og/` — OG images, logo, author avatar (referenced by schema).
  - `/assets/blog/` — blog illustrations (`Allow: /assets/blog/` is set in **both** UA groups).
- **`sitemap.xml` and `llms.txt` are build artifacts** — `scripts/gen-sitemap.mjs` and `scripts/gen-llms.mjs` write them straight into `out/` after `next build` (#77). They are not in `public/` and not in git; run `npm run build` to see them.
  - The sitemap is derived by scanning `out/` and reading each page's own `<link rel="canonical">`, so **a new page enters the sitemap automatically**. Nothing to add by hand. Just make sure the new page declares a canonical.
  - `llms.txt` = `src/content/llms.template.txt` (hand-written English entries + descriptions) + prices from `src/content/prices.json` (`{{starter}}`-style tokens) + a generated Chinese list of every `/zh` page. **A new English page must get a bullet in the template** — the build fails if an exported page has no entry, or if an entry points at a page that doesn't exist.
  - **A `noindex` page never goes in the sitemap** (privacy, terms). `gen-sitemap.mjs` skips any page whose `<meta name="robots">` says noindex; llms.txt still lists them (`docs/seo-lessons.md` §5).
  - Exclusions live in `scripts/lib/exported-pages.mjs`: any `404.html` (root **and** `/zh`, see #93), `demos/**` and `app/**` (both Disallowed in robots.txt), `xhs.html`.

## 2 · Page meta — every page
- Unique `<title>`, unique meta `description`, `<link rel="canonical">`.
- **Canonical, hreflang, og:url, sitemap and internal links must use the address that returns 200 with no redirect** — `/about`, `/blog/x` (no `.html`: Cloudflare Pages 308s it), `/blog/`. See `docs/seo-lessons.md` §1; `test/export/urls.test.ts` enforces it.
- Open Graph + Twitter card; `og:image` / `twitter:image` → a crawlable `/og/*` image.
- `<html lang>` set, and it must match the language actually rendered on the page.
- **One language per URL.** English is the primary language and lives at the root; Chinese is the additional language under `/zh`. A page never ships both languages — declare the counterpart with `hreflang` (`en`, `zh-CN`, `x-default`), bidirectionally, and make sure both addresses exist. See ADR-0002.
  - **The only exception is the 404 page** (`/404` and `/zh/404`, #93): it ships both languages, visibly. Any unmatched address falls back to the root `404.html`, so that one page has to catch a Chinese visitor too. It is `noindex` and has no canonical, so neither the duplicate-content nor the hreflang rule applies to it.
  - Core pages (Next-rendered) and content pages (blog, case studies) already work this way. Content pages are **generated** — edit the bilingual source in `src/content/pages/`, never `public/blog/**`, `public/case-studies/**` or `public/zh/**`; `scripts/split-content-lang.mjs` writes both languages at build time.
  - The four hand-written service pages (`landing-page`, `shopify-migration`, `wedding-basic`, `wedding-premium`) still carry the old `data-lang-en` / `data-lang-cn` pairs and a runtime toggle. Keep both attributes in step when editing them, until they get split too.

## 3 · Structured data (JSON-LD) — must `JSON.parse` cleanly + pass Google Rich Results Test
- **Homepage**: `@graph` = `ProfessionalService` (`#business`) + `WebSite` (`#website`). Keep `sameAs` filled (Xiaohongshu + any new socials), plus `priceRange`, `contactPoint`.
- **Blog post**: a `BlogPosting` block **and** a second `FAQPage` block — the latter is generated at build time from the visible FAQ section, see §4.
- **Author = `Person`** — never `Organization`. Hui Huang Ong, `jobTitle: Founder`, `worksFor`, crawlable `image` (`/og/founder-avatar.webp`), `description`, `sameAs`. Keep the same Person across all posts → builds a recognised author entity.
- **Blog index**: `Blog` with a `blogPost[]` list of all posts.
- **Blog post + case study**: a `BreadcrumbList` (Home › Blog / Case Studies › title), generated by `LegacyArticle.tsx` from the page's own URL and title. Nothing to write by hand.

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
- Concept illustrations: one series in the **3D miniature-diorama** style (clay-like figurines, night scene). Palette follows the site theme: near-black `#07080B`/`#0E1015`/`#14161D`, graphite `#191B23`/`#2B2F3A`, off-white `#F3F5F9`, and **one accent only: indigo `#7C82F0`** (soft, contained light — no neon, no teal/cyan). **No text, numbers or brand logos inside the image**, descriptive `alt` + bilingual `<figcaption>` (captions get cited). Full style bible + per-post prompts: `assets/blog-3d/SPEC.md`.
- Image pipeline: **Codex** (`codex exec` + built-in image tool, style reference via `--image`) generates from the SPEC → raw `.raw.png` kept in `assets/blog-3d/` → `sharp` cover/centre → WebP **1440×804**, q82 → copy into `public/assets/blog/` under the same semantic kebab filename. No watermark to remove.
- Every `<img>`: `loading="lazy"` + explicit `width`/`height` (no layout shift).
- Perf budget: critical CSS stays inlined; infinite animations off on mobile ≤768px.
- **After editing `public/css/style.css`, regenerate the minified copy** — content pages link `style.min.css`, not the source:
  `npx clean-css-cli -o public/css/style.min.css public/css/style.css`
  (The old `node build.js` still says `css/style.css` at the repo root; #81 moved those into `public/`, so that script no longer runs. Don't reach for it.)

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
- [ ] Images: crawlable dir, WebP, lazy + dimensions, no text baked in, matches the SPEC palette
- [ ] One language per URL, `<html lang>` matches it, `hreflang` pair declared both ways (legacy `public/` pages: keep `data-lang-*` in step until #76)
- [ ] Canonical + meta + OG present
- [ ] `public/css/style.min.css` regenerated if `public/css/style.css` changed (see §6)
- [ ] Content pages link `/css/fonts.css` — no page outside `demos/` and `xhs.html` may reach for Google Fonts (#94)
- [ ] `npm test` passes — it runs every automatic check in §10
- [ ] Changed URLs, canonical, robots.txt or hosting? Run the live self-check in `docs/seo-lessons.md` after deploy

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

## 10 · Technical SEO — can Google crawl, render and index every page?
GEO sits on top of SEO: an AI engine can only cite a page its search index already has (§9 layer 2). These are the plumbing checks.

**Automatic — `npm test` fails if any breaks** (every indexable page, both languages):

| Check | Guarded by |
|---|---|
| Canonical present and self-referencing; og:url = canonical | `discovery.test.ts`, `seo.test.ts` |
| Canonical / hreflang / sitemap / internal links use the 200 address (no `.html`, no redirect) | `urls.test.ts` |
| hreflang `en` + `zh-CN` + `x-default`, both ways, targets exist | `discovery.test.ts` |
| Sitemap = exactly the indexable pages, **no `noindex` page in it**, no dead entries | `discovery.test.ts` |
| Unique `<title>` and meta description on every page | `seo.test.ts` |
| Exactly one `<h1>` per page | `seo.test.ts` |
| `<meta charset>` + `viewport` (mobile-first indexing) | `seo.test.ts` |
| Every `<img>` has `alt`, `width`, `height` (image search + CLS) | `seo.test.ts` |
| No `http://` resources on https pages | `seo.test.ts` |
| Every JSON-LD block parses, on every page | `seo.test.ts` |
| Blog posts + case studies carry a 3-level `BreadcrumbList` ending at the canonical | `seo.test.ts` |
| robots.txt: `Sitemap:` line, no site-wide Disallow, never blocks `/css/` `/js/` `/_next/` `/fonts/` | `seo.test.ts` |
| Every internal link resolves; no broken assets | `urls.test.ts`, `assets.test.ts` |
| Page weight budget | `budget.test.ts` |

**By hand — when writing a page (Google won't error, it just truncates):**
- `<title>` about **≤ 60 characters** (English) / **≤ 30 Chinese characters**, keyword first, ` · H2ODreamer Studio` last. Longer titles get cut or rewritten by Google.
- Meta description about **≤ 155 characters** (English) / **≤ 80 Chinese characters**. It's the sales line under the link, so write it, don't let it be cut mid-sentence.
- Descriptive link text ("website cost in Malaysia"), not "click here".

**Live — after a deploy that touches URLs, robots.txt or hosting** (commands in `docs/seo-lessons.md` → 上线后自检):
- Every sitemap URL returns **200**; `http://`, bare domain and trailing-slash forms reach the canonical in **one** 301/308 hop.
- An unknown address returns a real **404** status (not a 200 "soft 404").
- **GSC monthly**: Page indexing (watch "Submitted URL marked noindex", "Duplicate, Google chose different canonical", "Blocked by robots.txt"), Core Web Vitals, HTTPS, and Enhancements (Breadcrumbs, FAQ) — all green.

---

*GEO ≠ SEO: SEO optimises for ranking (clicks); GEO optimises for being the **quoted source** in an AI answer. The levers above — clean structured data, a real Person author, answer-first blocks, citable specifics, and crawlable content (not images-as-text) — are what make an AI pick you as the source.*
