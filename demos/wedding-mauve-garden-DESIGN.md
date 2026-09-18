# Hui Huang & Mayyi — invitation design spec

| | |
|---|---|
| Style | `mauve-curve-garden` (from a client-supplied reference, not yet in the style library) |
| Date | 2026-09-18 |
| Wireframe | `demos/wedding-mauve-garden-wireframe.html` |
| Replaces | the `pink-peony-garden` draft of `demos/wedding-premium-2.html` |
| Assets to generate | 6 (`ILL-01m`, `ILL-01d`, `ILL-02`, `ILL-03m`, `ILL-03d`, `ILL-04`), each specified per breakpoint |
| Client photo slots | 4 |

---

## 0. Why this style

The couple supplied a reference design and asked for that style. So this skips library scoring: the reference sets every craft dimension, and the photos only set the grade. The reference is a Russian-language invitation in dusty mauve on blush ivory. Photos end on a sweeping curve traced by a gold hairline. Mauve and cream watercolour roses sit in the corners, and the programme is a column of filled mauve circles with white line icons. The palette is warm-neutral, which suits the soft daylight of the lawn set and the cream knitwear set. The black-tie set is used once and graded down.

**Two things the reference does that break the library's laws. They are kept on purpose, because the couple asked for this reference:**

1. **Watercolour plus line art.** The watercolour florals share the page with a small gold line sprig under each heading and white line icons in the timeline circles. The line art here is typographic ornament drawn inline as SVG, not illustration. The only generated artwork is the watercolour.
2. **Not a single column at every width.** The couple asked for the desktop to read like a landing page. The phone stays one column (the genre's convention). iPad portrait widens that column. At 1024px and up, the hero, invitation, venue and RSVP become two-column spreads, and the timeline runs horizontally.

One law is kept even though the reference breaks it. The reference has two solid mauve buttons. Here the map button is outlined, and **only the RSVP submit is solid**.

**Contacts block dropped.** The reference ends with phone numbers. The couple chose to leave them out, so no real numbers appear in a public demo. The RSVP note field covers questions.

---

## 1. Design tokens

### Colour

```css
--ground:      #F7F0EE;   /* blush ivory, the page, ~55% */
--panel:       #FBF7F5;   /* lighter panel for alternating sections, ~20% */
--mauve:       #8E5E6E;   /* dominant: timeline circles, headings rule, the solid button */
--mauve-soft:  #C9A3AE;   /* florals, outlined button hover, form borders */
--ink:         #4A3A40;   /* plum-grey, all type */
--ink-invert:  #FBF7F5;   /* type on mauve */
--gold:        #BFA06A;   /* hairlines only: the curve stroke and the heading sprig */
--accent:      #8E5E6E;   /* solid fill exactly once: the RSVP submit */
```

Dress-code swatches: `#E6D2BA` sand, `#D8B4BC` blush, `#9C6B7B` mauve, `#7F8C6B` sage, `#3A3538` charcoal.

### Type

```css
--font-display: 'Cormorant Garamond', Georgia, serif;   /* 500, ALL CAPS, 0.08em: names 40/56/72px (phone/iPad/desktop) */
--font-title:   'Cormorant Garamond', Georgia, serif;   /* 600, ALL CAPS, 0.16em: section titles 18/20/22px */
--font-script:  'Great Vibes', cursive;                 /* the "&" between names and the closing line */
--font-body:    'Cormorant Garamond', Georgia, serif;   /* 500, 16px / 1.7 */
--font-label:   'Cormorant Garamond', Georgia, serif;   /* 600, 11px, ALL CAPS, 0.18em */
```

### Shape and spacing

```css
--radius-button: 999px;
--column-phone:  480px;   /* < 768 */
--column-ipad:   640px;   /* 768–1023 */
--content-desk:  1200px;  /* >= 1024, landing-page container */
```

### Divider motif

**Sweeping curve**, and only this one. Every photo ends on one large asymmetric curve. A 1px `--gold` stroke follows the curve. On the phone and iPad the curve sits on the photo's bottom edge. In the desktop hero it runs down the photo's right edge. Alternating sections meet on the same kind of curve, without the gold line.

---

## 2. Blocks

Phone order. Every layout keeps the same order and changes only the arrangement inside each block.

**Breakpoints.**

- **Phone:** under 768px.
- **iPad:** 768px and up, plus any width in portrait (so iPad Pro portrait at 1024×1366 stays here).
- **Desktop:** 1024px and up in landscape.

| # | Block | Copy slots | Photo | Asset (phone / iPad) | Asset (desktop) | Desktop layout |
|---|---|---|---|---|---|---|
| 01 | hero | `TXT-01` "Our wedding" label, `TXT-02` names with script "&", `TXT-03` date, `TXT-04` one line, `TXT-05` countdown label | `PHO-01` | `ILL-01m` | `ILL-01d` | photo left 55% with the curve on its right edge, copy + countdown right |
| 02 | invitation | `TXT-06` "Dear friends", `TXT-07` paragraph | `PHO-02` | `ILL-03m` | `ILL-03d` | photo left, copy right, garland below both |
| 03 | programme | `TXT-08` title, `TXT-09` six rows of time + event | — | inline SVG icons | inline SVG icons | horizontal six-stop timeline |
| 04 | venue | `TXT-10` title, `TXT-11` venue + address, `TXT-12` map button | `PHO-03` | — | — | copy left, photo right |
| 05 | dress code | `TXT-13` title, `TXT-14` line | — | — | — | centred, five swatches |
| 06 | RSVP | `TXT-15` title, `TXT-16` prompts, attend radios, name, drinks radios, wishes, `TXT-17` button | `PHO-04` (desktop only) | `ILL-04` | `ILL-04` | photo left (sticky), form right |
| 07 | closing | `TXT-18` script thank-you, heart | — | `ILL-02` | `ILL-02` | centred |

Dropped: contacts (see section 0).

---

## 3. Assets

**Cut-edge rule.** An edge may be cut by the frame only if it will sit flush on a real edge: the viewport, the page bottom, or a clipping box. Every other edge must end naturally. Output px is 2× the largest CSS width the slot is shown at.

| Slot | Breakpoints | Where it sits | CSS width | Output px | Ratio | Cut edges | Filename |
|---|---|---|---|---|---|---|---|
| `ILL-01m` | phone, iPad | hero photo's bottom-right corner, flush with the viewport's right edge, overlapping the curve and trailing ~20px below the photo (clear of the names) | 44vw, max 300px | 600×800 | 3:4 | **right only** | `assets/demos/wedding-mauve-garden/hero-cluster-m.webp` |
| `ILL-01d` | desktop | a vertical garland standing on the curve between photo and copy, lower half of the hero, clear of the countdown | 150px | 400×1200 | 1:3 | **none**, floats | `assets/demos/wedding-mauve-garden/hero-garland-d.webp` |
| `ILL-02` | all | closing block, sitting on the very bottom of the page | 100%, max 560px (phone/iPad) / 900px (desktop) | 1600×600 | 8:3 | **bottom only**, on the page bottom | `assets/demos/wedding-mauve-garden/floral-spray-bottom.webp` |
| `ILL-03m` | phone, iPad | under the invitation copy, mid-page | 100%, max 560px | 1120×420 | 8:3 | **none**, floats | `assets/demos/wedding-mauve-garden/invite-garland-m.webp` |
| `ILL-03d` | desktop | full width under the invitation spread, mid-page | 900px | 1800×450 | 4:1 | **none**, floats | `assets/demos/wedding-mauve-garden/invite-garland-d.webp` |
| `ILL-04` | all | RSVP section top-right, flush with the viewport's right edge, in its own space above the title (the section's top padding grows to fit it) | 150 / 200 / min(18vw, 260px) | 640×800 | 4:5 | **right only** | `assets/demos/wedding-mauve-garden/rsvp-cluster.webp` |
| `PHO-01` | all | hero — the veil kiss (ZEN-1852), lawn set | full-bleed below desktop; 55% column on desktop | 1200×1500 | 4:5 | — | `assets/demos/wedding-mauve-garden/pho-01-hero.webp` |
| `PHO-02` | all | invitation — cream knitwear at home (ZEN-2298) | up to 640px | 1400×933 | 3:2 | — | `assets/demos/wedding-mauve-garden/pho-02-home.webp` |
| `PHO-03` | all | venue — the wide lawn with hills (ZEN-1674) | up to 700px | 1400×933 | 3:2 | — | `assets/demos/wedding-mauve-garden/pho-03-venue.webp` |
| `PHO-04` | desktop | RSVP side photo — black-tie set on the veranda (ZEN-2178), graded down | 500px | 1000×1400 | 5:7 | — | `assets/demos/wedding-mauve-garden/pho-04-rsvp.webp` |

---

## 4. Asset prompts

`ILL-02` was generated in the first pass and is kept. The five prompts below are new.

### `ILL-01m` — Hero cluster, phone and iPad (right edge cut only)

```
A tall, lush watercolour cluster of garden roses that enters from the right edge of the frame and is cut off only by that right edge. The top, left and bottom edges must end naturally inside the frame with generous empty space around them — nothing cut off by the top, left or bottom of the frame. Composition: the cluster hugs the right edge, fullest in the middle third of the frame, with sprays of eucalyptus leaves and thin stems trailing upward and a few buds and leaves tapering off softly toward the bottom; the left half of the frame is mostly empty. Two large open garden roses in dusty mauve #9C6B7B and #C9A3AE, one cream-white rose #F3EBE3, small blush ranunculus and closed rose buds in #D8B4BC, silvery sage eucalyptus leaves in #8E9A7E and #A7B09A, a few fine dried stems in muted gold #BFA06A. Loose and asymmetrical, flowers facing different directions. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, petals built from overlapping translucent washes, some petal edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-01d` — Hero vertical garland, desktop (no cut edges)

```
A tall, narrow, free-floating vertical watercolour garland of garden roses, standing upright in the centre of a tall narrow frame and filling it: the garland spans about 85% of the frame height and about 70% of the frame width, with every edge still ending naturally and a thin margin of empty space on all four sides — nothing touches or is cut off by any edge of the frame. From bottom to top: a full base of two large open garden roses in dusty mauve #9C6B7B and #C9A3AE with one cream-white rose #F3EBE3 and blush buds #D8B4BC, then a climbing stem of silvery sage eucalyptus leaves #8E9A7E and #A7B09A with smaller buds, thinning to a few delicate leaves and fine dried gold stems #BFA06A at the top. Slightly asymmetrical, leaning gently, stems curving naturally, not mirrored. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-03m` — Invitation garland, phone and iPad (no cut edges)

```
A free-floating horizontal watercolour floral garland centred in a wide frame, with every edge ending naturally and clear empty space on all four sides — nothing touches or is cut off by any edge of the frame. Composition: two loose clusters, one on the left third and one on the right third, joined across the middle by a thin trailing stem of eucalyptus leaves and small buds; the left and right clusters are different, not mirrored. Dusty mauve garden roses #9C6B7B, soft mauve-pink roses #C9A3AE, cream-white roses #F3EBE3, blush buds #D8B4BC, silvery sage eucalyptus and olive leaves #8E9A7E and #A7B09A, fine dried gold stems #BFA06A. Loose and asymmetrical. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-03d` — Invitation garland, desktop (no cut edges)

```
A long, slim, free-floating horizontal watercolour floral garland centred in a very wide frame, with every edge ending naturally and clear empty space on all four sides — nothing touches or is cut off by any edge of the frame. Composition: three loose clusters spaced along the length — a fuller one left of centre, a smaller one near the right end, a few buds near the left end — joined by a single trailing stem of eucalyptus leaves, small buds and fine dried stems; the garland spans about 90% of the frame width and about 75% of the frame height; the clusters differ from each other, nothing mirrored. Dusty mauve garden roses #9C6B7B, soft mauve-pink roses #C9A3AE, cream-white roses #F3EBE3, blush buds #D8B4BC, silvery sage eucalyptus and olive leaves #8E9A7E and #A7B09A, fine dried gold stems #BFA06A. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-04` — RSVP cluster (right edge cut only)

```
A watercolour cluster of garden roses that enters from the right edge of the frame and is cut off only by that right edge. The top, left and bottom edges must end naturally inside the frame with empty space around them — nothing cut off by the top, left or bottom of the frame. Composition: one large open dusty mauve rose #9C6B7B and one soft mauve-pink rose #C9A3AE nestled against the right edge in the upper half, one cream-white rose #F3EBE3 below them, a few blush buds #D8B4BC, silvery sage eucalyptus leaves #8E9A7E and #A7B09A and fine dried gold stems #BFA06A reaching up and leftward and trailing down; the left half of the frame is mostly empty. Loose and asymmetrical, flowers facing different directions. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

---

## 5. Build notes

- **Fonts:** Cormorant Garamond 500/600 and Great Vibes, Google Fonts, SIL Open Font License.
- **Script coverage:** names are English. Latin only is fine.
- **Breakpoints:** phone < 768 single 480px column. iPad (768+, or any width in portrait) single 640px column with a full-bleed hero, larger type. Desktop ≥ 1024 in landscape, full-width landing-page sections in a 1200px container.
- **Line art (inline SVG, not generated):** the gold heading sprig, six timeline icons (glasses, rings, champagne, plate, music note, sparkle), the heart, the map pin. All 1.5px strokes.
- **Photography grading:** lawn set, lift shadows slightly and pull greens down about 10% so they sit beside mauve. Home set, warm the whites toward `#FBF7F5`. Black-tie set (`PHO-04`), lift the blacks and cut contrast about 20%.
- **Never do:** no second solid button, no second divider motif, no saturated pink, no blue, no full-bleed photo without its curve.

---

## Generating the assets

```bash
codex exec --skip-git-repo-check "Read demos/wedding-mauve-garden-DESIGN.md. Generate every ILL asset listed in section 4 with your image generation tool, using each prompt verbatim. Transparent background. Save to assets/demos/wedding-mauve-garden/ at the exact filenames and pixel sizes in the table, WebP q82. Do NOT modify any existing file. Print the files created with actual dimensions."
```
