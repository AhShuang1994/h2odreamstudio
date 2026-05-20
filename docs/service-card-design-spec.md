# Service Card Redesign — Design Spec

> Date: 2026-05-15
> Scope: Services section card component only
> Cards: 4 (Wedding Basic, Wedding Premium, Landing Page, Shopify Migration)

---

## 1. Design Spec

### Style Direction

Retains the existing **glassmorphism + gradient glow** card language. Cards gain vertical density through a structured feature checklist and delivery meta line, replacing the old badge-only layout. The two Wedding tiers share a visual "tier ribbon" to signal progression.

### Colors (all existing variables)

| Element | Token | Value |
|---|---|---|
| Card background | `--color-bg-deep` | #030B1A |
| Card border | `--color-border` | #1A3352 |
| Heading text | `--color-text` | #F0F6FF |
| Body text | `--color-text-secondary` | #8BA4C4 |
| Muted text / labels | `--color-text-muted` | #7A8FA6 |
| Check marks | `--color-secondary` | #06D6A0 |
| Tier accent (Premium) | `--color-accent` | #7B61FF |
| Price highlight | `--color-primary` | #00E5FF |
| CTA button bg | `--color-wa` | #25D366 |
| CTA button hover | `--color-secondary` | #06D6A0 |

### Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Service name | `--font-display` | 20px (desktop) / 18px (mobile) | 700 |
| Tagline | `--font-body` | 13px | 400 italic |
| Description | `--font-body` | 14px | 400 |
| Feature items | `--font-body` | 13px | 400 |
| Delivery meta | `--font-body` | 12px | 500 |
| Price "From" | `--font-body` | 13px | 400 |
| Price amount | `--font-display` | 24px (desktop) / 20px (mobile) | 700 |
| CTA button | `--font-display` | 14px | 600 |

### Contrast Verification

- `#F0F6FF` on `#030B1A` = ~16.5:1 (AAA)
- `#8BA4C4` on `#030B1A` = ~6.8:1 (AA)
- `#06D6A0` on `#030B1A` = ~9.2:1 (AAA)
- `#7A8FA6` on `#030B1A` = ~5.3:1 (AA)
- All pass WCAG AA 4.5:1 minimum.

---

## 2. HTML Structure — Card Template

One card shown. All four follow this pattern; differences noted in Section 5.

```html
<article class="service-card" data-tier="basic">
  <!-- Tier indicator (Wedding cards only) -->
  <div class="service-tier" data-lang-en="Basic" data-lang-cn="基础版">Basic</div>

  <!-- Icon -->
  <div class="service-icon">
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Wedding ring icon — inline SVG -->
      <circle cx="24" cy="32" r="14" stroke="var(--color-primary)" stroke-width="2" fill="none"/>
      <circle cx="40" cy="32" r="14" stroke="var(--color-secondary)" stroke-width="2" fill="none"/>
    </svg>
  </div>

  <!-- Name + Tagline -->
  <h3 class="service-name"
      data-lang-en="Wedding E-Invitation"
      data-lang-cn="电子喜帖">Wedding E-Invitation</h3>
  <p class="service-tagline"
     data-lang-en="Your love story, beautifully online."
     data-lang-cn="你们的爱情故事，线上美美呈现。">
    Your love story, beautifully online.
  </p>

  <!-- Description -->
  <p class="service-desc"
     data-lang-en="A clean, mobile-friendly e-invitation that shares your big day details — ready in days, not weeks."
     data-lang-cn="简约手机友好的电子喜帖，几天内搞定 — 不用等几个星期。">
    A clean, mobile-friendly e-invitation that shares your big day details — ready in days, not weeks.
  </p>

  <!-- Feature checklist -->
  <ul class="service-features">
    <li data-lang-en="Single-page template customized to your style"
        data-lang-cn="单页模板，依你风格定制">
      Single-page template customized to your style
    </li>
    <li data-lang-en="Mobile-friendly — looks great on any phone"
        data-lang-cn="手机友好 — 任何手机打开都好看">
      Mobile-friendly — looks great on any phone
    </li>
    <li data-lang-en="Date, venue &amp; Google Maps integration"
        data-lang-cn="日期、地点 &amp; Google Maps 导航">
      Date, venue &amp; Google Maps integration
    </li>
    <li data-lang-en="Your photos &amp; custom color palette"
        data-lang-cn="你的照片 &amp; 专属配色">
      Your photos &amp; custom color palette
    </li>
  </ul>

  <!-- Delivery meta -->
  <div class="service-meta"
       data-lang-en="⏱ 3–5 days · 🔄 1 revision round"
       data-lang-cn="⏱ 3–5 天 · 🔄 1 次修改">
    ⏱ 3–5 days · 🔄 1 revision round
  </div>

  <!-- Price -->
  <div class="service-price">
    <span data-lang-en="From" data-lang-cn="起价">From</span>
    <strong>RM 500</strong>
  </div>

  <!-- CTA -->
  <a class="service-cta"
     href="https://wa.me/60XXXXXXXXX?text=Hi%20H2ODreamer!%20I'm%20interested%20in%20the%20Basic%20Wedding%20E-Invitation%20(from%20RM%20500).%20My%20wedding%20date%20is%20%5Bdate%5D.%20Can%20we%20chat%20about%20the%20design?"
     target="_blank" rel="noopener"
     data-lang-en="Get My E-Invite"
     data-lang-cn="获取我的电子喜帖">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.478-.67-6.32-1.82l-.44-.27-2.633.883.883-2.633-.27-.44A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
    Get My E-Invite
  </a>
</article>
```

---

## 3. CSS Changes

New and modified rules to add to `style.css`. Uses only existing CSS variables.

```css
/* ============ SERVICE CARD REDESIGN ============ */

/* Grid: 1 col mobile, 2x2 desktop */
.service-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  text-align: left;
  perspective: 1000px;
}

@media (min-width: 768px) {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 28px;
  }
}

/* Card base — unchanged bg/border, add min structure */
.service-card {
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border);
  padding: 32px 24px 24px;
  position: relative;
  overflow: hidden;
  transition: transform 400ms var(--ease-out-expo),
              box-shadow 400ms var(--ease-out-expo),
              border-color 400ms var(--ease-out-expo);
  transform-style: preserve-3d;
  will-change: transform;
  display: flex;
  flex-direction: column;
}

/* Organic border-radius for 4 cards */
.service-card:nth-child(1) { border-radius: 24px 48px 24px 48px; }
.service-card:nth-child(2) { border-radius: 48px 24px 48px 24px; }
.service-card:nth-child(3) { border-radius: 32px 40px 32px 40px; }
.service-card:nth-child(4) { border-radius: 40px 32px 40px 32px; }

/* — Tier indicator (Wedding cards only) — */
.service-tier {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 16px;
  width: fit-content;
}

/* Basic tier */
.service-card[data-tier="basic"] .service-tier {
  background: rgba(0, 229, 255, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(0, 229, 255, 0.2);
}

/* Premium tier */
.service-card[data-tier="premium"] .service-tier {
  background: rgba(123, 97, 255, 0.12);
  color: var(--color-accent);
  border: 1px solid rgba(123, 97, 255, 0.25);
}

/* Premium card gets accent-tinted glow on hover */
.service-card[data-tier="premium"]:hover {
  border-color: rgba(123, 97, 255, 0.3);
  box-shadow: 0 20px 60px rgba(123, 97, 255, 0.12),
              0 0 0 1px rgba(123, 97, 255, 0.1);
}

/* Premium card top bar uses accent gradient */
.service-card[data-tier="premium"]::before {
  background: linear-gradient(90deg,
    var(--color-accent), var(--color-primary), var(--color-secondary), var(--color-accent));
  background-size: 300% 100%;
}

/* — Feature checklist — */
.service-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-features li {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  padding-left: 22px;
  position: relative;
}

.service-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-secondary);
  font-weight: 700;
  font-size: 13px;
}

/* — Delivery meta line — */
.service-meta {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  padding: 10px 0;
  margin-bottom: 12px;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

/* — Price (updated) — */
.service-price {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.service-price span {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-muted);
}

/* — CTA button — */
.service-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-wa);
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 300ms var(--ease-out-expo),
              transform 200ms var(--ease-out-expo),
              box-shadow 300ms var(--ease-out-expo);
  margin-top: auto;
  min-height: 44px; /* touch target */
}

.service-cta:hover {
  background: var(--color-secondary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(6, 214, 160, 0.25);
}

.service-cta:active {
  transform: translateY(0);
}

.service-cta svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* — Mobile refinements — */
@media (max-width: 768px) {
  .service-card { padding: 24px 20px 20px; }
  .service-price { font-size: 20px; }
  .service-name { font-size: 18px; }
  .service-cta { font-size: 13px; padding: 11px 20px; }
}
```

---

## 4. Grid Layout

### Mobile (< 768px)

```
┌──────────────────────────┐
│   Wedding Basic          │
├──────────────────────────┤
│   Wedding Premium        │
├──────────────────────────┤
│   Landing Page           │
├──────────────────────────┤
│   Shopify Migration      │
└──────────────────────────┘
```

Single column, full width, 24px gap. Cards stack in service-tier order.

### Desktop (>= 768px)

```
┌────────────────┐  ┌────────────────┐
│ Wedding Basic  │  │ Wedding Premium│
├────────────────┤  ├────────────────┤
│ Landing Page   │  │ Shopify Migra. │
└────────────────┘  └────────────────┘
```

2-column grid, 28px gap. `repeat(2, 1fr)` — all cards equal width.

The old `repeat(auto-fit, minmax(280px, 1fr))` is replaced with explicit breakpoint control so we get exactly 2x2 on desktop instead of unpredictable 3-across at wide viewports.

---

## 5. Card Variations

### Wedding Basic vs Premium — Visual Differentiation

| Property | Basic | Premium |
|---|---|---|
| `data-tier` attribute | `"basic"` | `"premium"` |
| Tier badge color | `--color-primary` (#00E5FF) | `--color-accent` (#7B61FF) |
| Tier badge bg | rgba(0,229,255,0.1) | rgba(123,97,255,0.12) |
| Top bar gradient | default (primary→secondary) | accent→primary→secondary |
| Hover glow | cyan glow (existing) | purple glow (accent) |
| Feature count | 4 items | 5 items |
| Price | RM 500 | RM 1,200 |

### Landing Page & Shopify Migration

These cards have **no** `.service-tier` element (omit it entirely). They use the default card styling with no `data-tier` attribute. The existing cyan hover glow applies.

### Icon Assignments

Since no SVG icons currently exist in the cards, here are suggested inline SVG concepts using only `--color-primary` and `--color-secondary` strokes:

| Card | Icon Concept | Description |
|---|---|---|
| Wedding Basic | Two overlapping rings | Simple interlocked circles |
| Wedding Premium | Rings + sparkle/star | Rings with radiating accent lines |
| Landing Page | Browser window + arrow up | Conversion/growth metaphor |
| Shopify Migration | Shopping bag + arrow right | Migration/movement metaphor |

All icons use `viewBox="0 0 64 64"`, `stroke-width="2"`, no fill. Keeps them lightweight and consistent with the line-art aesthetic.

---

## 6. Removed Elements

The following existing elements are **dropped** from the new card design:

- `.service-badges` — replaced by `.service-features` checklist (more informative)
- `.service-warning` — copyright warning moves to FAQ or contract, not card-level
- `.badge`, `.badge-yes`, `.badge-no` — no longer used in service cards

The CSS for these can remain (may be used elsewhere) but the HTML is removed from service cards.

---

## 7. Implementation Notes

- **Bilingual support**: All visible text elements retain `data-lang-en` / `data-lang-cn` attributes for the existing language toggle JS.
- **WhatsApp links**: Each card's CTA `href` uses the pre-filled messages from `service-card-copy.md`, URL-encoded.
- **Accessibility**: Feature list uses semantic `<ul>/<li>`. CTA links have `rel="noopener"`. Touch targets >= 44px.
- **Animation**: Existing `::before` gradient flow animation and `::after` gloss overlay carry over unchanged. No new animations added.
- **`margin-top: auto`** on `.service-cta` pushes the button to the card bottom, keeping all cards visually aligned regardless of content height differences.
