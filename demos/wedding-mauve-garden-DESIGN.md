# Hui Huang & Mayyi — invitation design spec

| | |
|---|---|
| Style | `mauve-curve-garden` (from a client-supplied reference, not yet in the style library) |
| Date | 2026-09-18 |
| Wireframe | `demos/wedding-mauve-garden-wireframe.html` |
| Replaces | the `pink-peony-garden` draft of `demos/wedding-premium-2.html` |
| Assets to generate | 3 (`ILL-01` … `ILL-03`) |
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

Phone order. The desktop keeps the same order and changes only the layout inside each block.

| # | Block | Copy slots | Photo | Asset | Desktop layout |
|---|---|---|---|---|---|
| 01 | hero | `TXT-01` "Our wedding" label, `TXT-02` names with script "&", `TXT-03` date, `TXT-04` one line, `TXT-05` countdown label | `PHO-01` | `ILL-01` | full viewport: photo left 55% with the curve on its right edge, copy + countdown right |
| 02 | invitation | `TXT-06` "Dear friends", `TXT-07` paragraph | `PHO-02` | `ILL-02` | photo left, copy right, `ILL-02` along the bottom |
| 03 | programme | `TXT-08` title, `TXT-09` six rows of time + event | — | inline SVG icons | horizontal six-stop timeline |
| 04 | venue | `TXT-10` title, `TXT-11` venue + address, `TXT-12` map button | `PHO-03` | — | copy left, photo right |
| 05 | dress code | `TXT-13` title, `TXT-14` line | — | — | centred, five swatches |
| 06 | RSVP | `TXT-15` title, `TXT-16` intro, attend radios, name, drinks radios, wishes, `TXT-17` button | `PHO-04` (desktop only) | `ILL-03` | photo left (sticky), form right |
| 07 | closing | `TXT-18` script thank-you, heart | — | `ILL-02` (reused, mirrored) | centred |

Dropped: contacts (see section 0).

---

## 3. Assets

| Slot | What it is | Output px | Ratio | Filename | Ground |
|---|---|---|---|---|---|
| `ILL-01` | Watercolour rose cluster entering from the bottom-right corner, overlapping the hero curve | 1000×1000 | 1:1 | `assets/demos/wedding-mauve-garden/floral-corner-br.webp` | transparent |
| `ILL-02` | Long low watercolour floral spray rising from the bottom edge, dense at both ends | 1600×600 | 8:3 | `assets/demos/wedding-mauve-garden/floral-spray-bottom.webp` | transparent |
| `ILL-03` | Watercolour rose cluster entering from the top-right corner, for the RSVP panel | 900×900 | 1:1 | `assets/demos/wedding-mauve-garden/floral-corner-tr.webp` | transparent |
| `PHO-01` | Hero — the veil kiss (ZEN-1852), lawn set | 1200×1500 | 4:5 | `assets/demos/wedding-mauve-garden/pho-01-hero.webp` | — |
| `PHO-02` | Invitation — cream knitwear at home (ZEN-2298) | 1400×933 | 3:2 | `assets/demos/wedding-mauve-garden/pho-02-home.webp` | — |
| `PHO-03` | Venue — the wide lawn with hills (ZEN-1674) | 1400×933 | 3:2 | `assets/demos/wedding-mauve-garden/pho-03-venue.webp` | — |
| `PHO-04` | RSVP side photo, desktop only — black-tie set on the veranda (ZEN-2178), graded down | 1000×1400 | 5:7 | `assets/demos/wedding-mauve-garden/pho-04-rsvp.webp` | — |

---

## 4. Asset prompts

### `ILL-01` — Rose cluster, bottom-right

```
A lush watercolour cluster of garden roses composed so it enters from the bottom-right corner of the frame and is cut off by the bottom and right edges, reaching about halfway up and halfway across, with the upper-left half of the frame left completely empty. Two large open garden roses in dusty mauve #9C6B7B and #C9A3AE, one cream-white rose #F3EBE3, several smaller blush ranunculus and closed rose buds in #D8B4BC, silvery sage eucalyptus leaves in #8E9A7E and #A7B09A, and a few fine dried stems in muted gold #BFA06A. Flowers face different directions and differ in size, the arrangement is loose and asymmetrical with stems trailing outward. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, petals built from overlapping translucent washes, some petal edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-02` — Long low floral spray

```
A long, low horizontal watercolour floral arrangement that rises from the bottom edge of a very wide frame, spanning the full width, denser and taller at the left and right ends and thinning to a few low leaves and small buds in the middle, with the top two thirds of the frame left completely empty. Dusty mauve garden roses #9C6B7B, soft mauve-pink roses #C9A3AE, cream-white roses #F3EBE3, blush buds #D8B4BC, silvery sage eucalyptus and olive leaves #8E9A7E and #A7B09A, fine dried gold stems #BFA06A. Loose and asymmetrical, the left end and right end are different arrangements, not mirrored. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

### `ILL-03` — Rose cluster, top-right

```
A watercolour cluster of garden roses composed so it hangs in from the top-right corner of the frame and is cut off by the top and right edges, reaching about a third of the way down and a third of the way across, with trailing sage leaves and thin stems drooping further down, and the lower-left two thirds of the frame left completely empty. One large open dusty mauve rose #9C6B7B, one soft mauve-pink rose #C9A3AE, one cream-white rose #F3EBE3, a few blush buds #D8B4BC, silvery sage eucalyptus leaves #8E9A7E and #A7B09A, fine dried gold stems #BFA06A. Loose and asymmetrical, flowers facing different directions. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, very little granulation. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no saturated hot pink, no blue, no purple-violet.
```

---

## 5. Build notes

- **Fonts:** Cormorant Garamond 500/600 and Great Vibes, Google Fonts, SIL Open Font License.
- **Script coverage:** names are English. Latin only is fine.
- **Breakpoints:** phone < 768 single 480px column. iPad portrait 768–1023, single 640px column, larger type. Desktop ≥ 1024, full-width landing-page sections in a 1200px container.
- **Line art (inline SVG, not generated):** the gold heading sprig, six timeline icons (glasses, rings, champagne, plate, music note, sparkle), the heart, the map pin. All 1.5px strokes.
- **Photography grading:** lawn set, lift shadows slightly and pull greens down about 10% so they sit beside mauve. Home set, warm the whites toward `#FBF7F5`. Black-tie set (`PHO-04`), lift the blacks and cut contrast about 20%.
- **Never do:** no second solid button, no second divider motif, no saturated pink, no blue, no full-bleed photo without its curve.

---

## Generating the assets

```bash
codex exec --skip-git-repo-check "Read demos/wedding-mauve-garden-DESIGN.md. Generate every ILL asset in section 3 with your image generation tool, using each section 4 prompt verbatim. Transparent background. Save to assets/demos/wedding-mauve-garden/ at the exact filenames and pixel sizes in the table, WebP q82. Do NOT modify any existing file. Print the files created with actual dimensions."
```
