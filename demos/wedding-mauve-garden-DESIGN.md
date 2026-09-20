# Hui Huang & Mayyi — invitation design spec

| | |
|---|---|
| Style | `mauve-curve-garden` (from a client-supplied reference, not yet in the style library) |
| Date | 2026-09-18 |
| Wireframe | `demos/wedding-mauve-garden-wireframe.html` |
| Replaces | the `pink-peony-garden` draft of `demos/wedding-premium-2.html` |
| Assets to generate | 4 (`ILL-01m`, `ILL-02`, `ILL-03m`, `ILL-04`), phone only |
| Client photo slots | 4 + 8 gallery cards |

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
| 01 | hero | `TXT-01` "Our wedding" label, `TXT-02` names with script "&", `TXT-03` date, `TXT-04` one line, `TXT-05` countdown label | `PHO-01` | `ILL-01m` (phone only) | — | photo left 55% with the curve on its right edge, copy + countdown right |
| 02 | invitation | `TXT-06` "Dear friends", `TXT-07` paragraph | `PHO-02` | `ILL-03m` (phone only) | — | photo left, copy right, garland below both |
| 02b | gallery | `TXT-19` "Our moments", `TXT-20` counter | `PHO-G1` … `PHO-G8` | — | — | the same 3D card deck, cards 360px wide |
| 03 | programme | `TXT-08` title, `TXT-09` six rows of time + event | — | inline SVG icons | inline SVG icons | horizontal six-stop timeline |
| 04 | venue | `TXT-10` title, `TXT-11` venue + address, `TXT-12` map button | `PHO-03` | — | — | copy left, photo right |
| 05 | dress code | `TXT-13` title, `TXT-14` line | — | — | — | centred, five swatches |
| 06 | RSVP | `TXT-15` title, `TXT-16` prompts, attend radios, name, drinks radios, wishes, `TXT-17` button | `PHO-04` (desktop only) | `ILL-04` (phone only) | — | photo left (sticky), form right |
| 07 | closing | `TXT-18` script thank-you, heart | — | `ILL-02` (phone only) | — | centred |

**The watercolour florals are phone-only.** At the couple's request, iPad and desktop show none. On the wider layouts the photos, the curve and the gold line carry the page.

Dropped: contacts (see section 0).

---

## 3. Assets

**Cut-edge rule.** An edge may be cut by the frame only if it will sit flush on a real edge: the viewport, the page bottom, or a clipping box. Every other edge must end naturally. Output px is 2× the largest CSS width the slot is shown at.

| Slot | Breakpoints | Where it sits | CSS width | Output px | Ratio | Cut edges | Filename |
|---|---|---|---|---|---|---|---|
| `ILL-01m` | phone, iPad | hero photo's bottom-right corner, flush with the viewport's right edge, overlapping the curve and trailing ~20px below the photo (clear of the names) | 44vw, max 300px | 600×800 | 3:4 | **right only** | `assets/demos/wedding-mauve-garden/hero-cluster-m.webp` |
| `ILL-02` | all | closing block, sitting on the very bottom of the page | 100%, max 560px (phone/iPad) / 900px (desktop) | 1600×600 | 8:3 | **bottom only**, on the page bottom | `assets/demos/wedding-mauve-garden/floral-spray-bottom.webp` |
| `ILL-03m` | phone, iPad | under the invitation copy, mid-page | 100%, max 560px | 1120×420 | 8:3 | **none**, floats | `assets/demos/wedding-mauve-garden/invite-garland-m.webp` |
| `ILL-04` | all | RSVP section top-right, flush with the viewport's right edge, in its own space above the title (the section's top padding grows to fit it) | 150 / 200 / min(18vw, 260px) | 640×800 | 4:5 | **right only** | `assets/demos/wedding-mauve-garden/rsvp-cluster.webp` |
| `PHO-01` | all | hero — the veil kiss (ZEN-1852), lawn set | full-bleed below desktop; 55% column on desktop | 1200×1500 | 4:5 | — | `assets/demos/wedding-mauve-garden/pho-01-hero.webp` |
| `PHO-02` | all | invitation — cream knitwear at home (ZEN-2298) | up to 640px | 1400×933 | 3:2 | — | `assets/demos/wedding-mauve-garden/pho-02-home.webp` |
| `PHO-03` | all | venue — the wide lawn with hills (ZEN-1674) | up to 700px | 1400×933 | 3:2 | — | `assets/demos/wedding-mauve-garden/pho-03-venue.webp` |
| `PHO-04` | desktop | RSVP side photo — black-tie set on the veranda (ZEN-2178), graded down | 500px | 1000×1400 | 5:7 | — | `assets/demos/wedding-mauve-garden/pho-04-rsvp.webp` |
| `PHO-G1` | all | gallery card 1 of 8 — the laughing hug on the lawn (ZEN-1625) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-01.webp` |
| `PHO-G2` | all | gallery card 2 of 8 — plush toy at home (ZEN-2311) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-02.webp` |
| `PHO-G3` | all | gallery card 3 of 8 — black-tie, groom leaning back (ZEN-2029) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-03.webp` |
| `PHO-G4` | all | gallery card 4 of 8 — walking across the lawn (ZEN-1674) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-04.webp` |
| `PHO-G5` | all | gallery card 5 of 8 — bread and snacks on the bed (ZEN-2359) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-05.webp` |
| `PHO-G6` | all | gallery card 6 of 8 — black-tie on the veranda (ZEN-2178) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-06.webp` |
| `PHO-G7` | all | gallery card 7 of 8 — nose to nose on the lawn (ZEN-1582) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-07.webp` |
| `PHO-G8` | all | gallery card 8 of 8 — black-tie among the flowers (ZEN-2124) | 62vw max 260 / 300 / 360px | 720×1280 | 9:16 | — | `assets/demos/wedding-mauve-garden/gallery-08.webp` |

---

## 4. Asset prompts

`ILL-02` was generated in the first pass and is kept. The three prompts below are new. A desktop hero garland (`ILL-01d`) was generated and then dropped at the couple's request: on a wide screen the desktop hero reads cleaner with only the photo, the curve and the gold line.

### `ILL-01m` — Hero cluster, phone and iPad (right edge cut only)

```
A tall, lush watercolour cluster of garden roses that enters from the right edge of the frame and is cut off only by that right edge. The top, left and bottom edges must end naturally inside the frame with generous empty space around them — nothing cut off by the top, left or bottom of the frame. Composition: the cluster hugs the right edge, fullest in the middle third of the frame, with sprays of eucalyptus leaves and thin stems trailing upward and a few buds and leaves tapering off softly toward the bottom; the left half of the frame is mostly empty. Two large open garden roses in dusty mauve #9C6B7B and #C9A3AE, one cream-white rose #F3EBE3, small blush ranunculus and closed rose buds in #D8B4BC, silvery sage eucalyptus leaves in #8E9A7E and #A7B09A, a few fine dried stems in muted gold #BFA06A. Loose and asymmetrical, flowers facing different directions. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, petals built from overlapping translucent washes, some petal edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-03m` — Invitation garland, phone and iPad (no cut edges)

```
A free-floating horizontal watercolour floral garland centred in a wide frame, with every edge ending naturally and clear empty space on all four sides — nothing touches or is cut off by any edge of the frame. Composition: two loose clusters, one on the left third and one on the right third, joined across the middle by a thin trailing stem of eucalyptus leaves and small buds; the left and right clusters are different, not mirrored. Dusty mauve garden roses #9C6B7B, soft mauve-pink roses #C9A3AE, cream-white roses #F3EBE3, blush buds #D8B4BC, silvery sage eucalyptus and olive leaves #8E9A7E and #A7B09A, fine dried gold stems #BFA06A. Loose and asymmetrical. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
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

## 6. Gallery and motion

**Gallery (block 02b).** It continues the invitation's panel colour, so it has no seam. It holds eight 9:16 cards with a soft shadow (`0 24px 44px -12px` plus `0 6px 14px`, in plum at low opacity) and 14px corners.

- The deck is a carousel at every width. The front card is full size, and the next two fan back to the right in 3D: 24% / 44% across, 90px / 180px back, rotated −10° / −16°.
- **Next:** the front card swings out to the left, sinks, and slides in behind the deck.
- **Previous:** the rearmost card comes out from behind and swings to the front.
- **Controls:** autoplay every 3.6s while at least 35% of the deck is on screen, and it pauses on hover or focus. There are prev/next buttons, a swipe, arrow keys anywhere in the section, and tapping a back card. An input during a move completes that move first; it is never dropped.
- The gallery photos were re-cropped to 9:16 from the originals. The earlier `-mobile` crops mixed 3:2, 2:3 and letterboxed 375px files. ZEN-1574, 2252 and 2315 were rejected because a 9:16 crop cuts a person or lands on a blurred foreground.

**Motion.** Plain CSS plus a small script, no libraries.

- **Hero on load:** the photo fades in, the copy rises in sequence, the phone cluster blooms from its right edge, and the gold hairline draws itself.
- **On scroll:** copy rises with a stagger, photos fade up and draw their gold line, the programme connectors grow (the line runs horizontally on desktop), the dress-code swatches pop in, and form fields rise.
- The countdown digits tick when they change.
- **Degrades cleanly:** nothing starts hidden unless the script has run. `prefers-reduced-motion` gets a fully static page, and the carousel then moves without animation and never autoplays.
- **No infinite motion.** Idle sway was tried and removed along with the iPad/desktop florals. Edge-cut clusters are never rotated or scaled away from their cut edge.
- Anything in the last strip of the page is revealed once the reader reaches the end, because it can never clear the observer's margin.

---

## Generating the assets

```bash
codex exec --skip-git-repo-check "Read demos/wedding-mauve-garden-DESIGN.md. Generate every ILL asset listed in section 4 with your image generation tool, using each prompt verbatim. Transparent background. Save to assets/demos/wedding-mauve-garden/ at the exact filenames and pixel sizes in the table, WebP q82. Do NOT modify any existing file. Print the files created with actual dimensions."
```
