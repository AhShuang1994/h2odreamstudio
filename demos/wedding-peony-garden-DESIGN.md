# Hui Huang & Mayyi — invitation design spec

| | |
|---|---|
| Style | `pink-peony-garden` (arch crops removed at the couple's request) |
| Date | 2026-09-17 |
| Wireframe | `demos/wedding-peony-garden-wireframe.html` |
| Assets to generate | 11 (`ILL-01` … `ILL-10`, `ILL-DIV`) |

---

## 0. Why this style

The shoot has three sets: a white gown and beige suit on an open lawn, a cream cable-knit bedroom set with bread and snacks, and a black gown street set. Scored against the library, `pink-peony-garden` came out on top at **8**: scene tags `outdoor-daylight` and `indoor-venue` both hit (lawn set + bedroom set), the photos are soft **neutral** daylight (+2), the mood is playful, which sits at **mid** formality (+2), and the tropical-daylight look reads as summer (+1). Runner-up `eucalyptus-classic` scored **6**: same scene and temperature hits, but it is a **formal** style and these photos are not formal. `sage-arch-minimal` also scored 8 but was excluded because the studio has already shipped a demo in that style.

**One deliberate override, not a borrowing.** The style's signature is arch-topped photo frames. The couple asked for **no arches**. Every photo is instead a **rounded rectangle** (hero 14px, interior 10px), which keeps law 7 (photos are cropped into shapes) without the arch. Nothing was borrowed from another style. The divider motif, palette, type and illustration method are all `pink-peony-garden` as filed.

**Real names, date and venue.** Hui Huang & Mayyi, Sunday 20 June 2027, The RuMa Hotel and Residences, Kuala Lumpur — carried over from the existing `wedding-premium-2` demo this replaces.

**Known risk — the black gown set.** This style bans high-contrast, moody photography. The black set is bright daylight but carries large black areas. It is used **once**, small, inside the photo stack, and must be graded as in section 5. If it still looks heavy after grading, swap `PHO-04` for a second lawn photo.

---

## 1. Design tokens

### Colour

```css
--ground:     #FAF6EC;   /* warm cream, the entire column, ~60% of the surface */
--dominant:   #E8A9B4;   /* peony pink, carried by the watercolour clusters, ~15% */
--blush:      #F2CDD3;   /* pale blush, secondary petals and the divider wash tint */
--foliage:    #8FA07A;   /* garden green, leaves, stems, route line, outlined button strokes */
--ink:        #4E5240;   /* deep leaf green, all type including the script names */
--ink-invert: #FAF6EC;   /* cream type reversed out of the solid RSVP button */
--hairline:   #D9D2BF;   /* timeline connector line, calendar grid rules */
--accent:     #8FA07A;   /* appears exactly once as a solid fill, on the RSVP button */
```

The accent reuses the foliage green on purpose. With florals this loud, a new colour would be a fourth voice.

### Type

```css
--font-display: 'Great Vibes', 'Allura', cursive;          /* names 52px, section titles 40px */
--font-label:   'Cormorant Garamond', Georgia, serif;       /* 300, 11px, all caps, letter-spacing: 0.18em */
--font-body:    'Cormorant Garamond', Georgia, serif;       /* 400, 14px, line-height: 1.75 */
```

Display-to-body ratio about 3.5:1. Kept tighter than other watercolour styles because the florals are already loud. Calendar numerals use the label face at 13px, weight 300. Reversed type on the RSVP button bumps to weight 500 so the thin serif does not break up on green. Names are English, and Great Vibes covers Latin fully.

### Shape and spacing

```css
--radius-photo-hero:  14px;   /* rounded rectangle, inset with a 32px cream margin, never full bleed */
--radius-photo:       10px;   /* rounded rectangle, interior stack and venue photo */
--radius-button:      999px;  /* pill */
--block-gap:          72px;
--column-max:         480px;  /* the invitation column, mobile-first, single column at every width */
```

No arch, no circle-topped, no dome shape anywhere. Rounded rectangle only.

### Divider motif

**Watercolour bleed**, and only this one. A soft wet-edge wash in pale blush, 40px tall, with side flower clusters overlapping it so the seam is partly hidden. Appears **7 times**, once at every block boundary. One asset (`ILL-DIV`) is reused, alternately flipped horizontally so the repetition is less obvious.

---

## 2. Blocks

In order. This order is the wireframe's order.

| # | Block | Copy slots | Photo slots | Asset slots |
|---|---|---|---|---|
| 01 | hero | `TXT-01` small caps label, `TXT-02` names (display), `TXT-03` date | `PHO-01` | `ILL-01`, `ILL-02` |
| 02 | invitation | `TXT-04` title (display), `TXT-05` short paragraph | — | — |
| 03 | calendar | `TXT-06` month and year label | — | `ILL-03` |
| 04 | photo stack | — | `PHO-02`, `PHO-03`, `PHO-04` | `ILL-09` (enters from the left on the divider above) |
| 05 | timeline | `TXT-07` title (display), `TXT-08` four rows of time plus event | — | `ILL-04`, `ILL-05`, `ILL-06`, `ILL-07` |
| 06 | location | `TXT-09` title (display), `TXT-10` venue name and address, `TXT-11` directions button | `PHO-05` | `ILL-08` |
| 07 | wishes | `TXT-12` title (display), `TXT-13` short paragraph | — | `ILL-10` (enters from the right on the divider above) |
| 08 | RSVP | `TXT-14` title (display), `TXT-15` reply-by line, `TXT-16` name field label, `TXT-17` note field label (optional), `TXT-18` button label | — | — |

`ILL-DIV` sits between every pair of blocks (7 times).

Dropped blocks:

- **No countdown.** The calendar with the circled date already answers "when", and a ticking counter is a louder widget than this style allows.
- **No dress-code block.** The couple has not specified a dress code. If they add one, it goes between 06 and 07 and shows four swatch dots: `#FAF6EC`, `#F2CDD3`, `#E8A9B4`, `#8FA07A`.

---

## 3. Assets

Pixel sizes are 2× the CSS size in a 480px column.

| Slot | What it is | Output px | Ratio | Filename | Ground |
|---|---|---|---|---|---|
| `ILL-01` | Peony cluster, enters hero from top-left, cropped by the column edge | 900×900 | 1:1 | `assets/demos/wedding-peony-garden/peony-cluster-top-left.webp` | transparent (key from white) |
| `ILL-02` | Peony and carnation cluster, enters hero from bottom-right, cropped by the column edge | 900×900 | 1:1 | `assets/demos/wedding-peony-garden/peony-cluster-bottom-right.webp` | transparent (key from white) |
| `ILL-03` | Hand-painted ring loop that circles the wedding date on the calendar | 240×240 | 1:1 | `assets/demos/wedding-peony-garden/date-ring.webp` | transparent (key from white) |
| `ILL-04` | Timeline icon, a pair of wedding rings | 240×240 | 1:1 | `assets/demos/wedding-peony-garden/icon-rings.webp` | transparent (key from white) |
| `ILL-05` | Timeline icon, two clinking champagne coupes | 240×240 | 1:1 | `assets/demos/wedding-peony-garden/icon-champagne.webp` | transparent (key from white) |
| `ILL-06` | Timeline icon, a small dinner setting with plate, fork and knife | 240×240 | 1:1 | `assets/demos/wedding-peony-garden/icon-dinner.webp` | transparent (key from white) |
| `ILL-07` | Timeline icon, a small two-tier wedding cake | 240×240 | 1:1 | `assets/demos/wedding-peony-garden/icon-cake.webp` | transparent (key from white) |
| `ILL-08` | Dotted meandering route line ending in one map pin, a few leaves along the way | 960×640 | 3:2 | `assets/demos/wedding-peony-garden/route-map.webp` | transparent (key from white) |
| `ILL-09` | Side cluster, blush peony and greenery entering from the left margin | 600×900 | 2:3 | `assets/demos/wedding-peony-garden/side-cluster-left.webp` | transparent (key from white) |
| `ILL-10` | Side cluster, carnations, gypsophila and greenery entering from the right margin | 600×900 | 2:3 | `assets/demos/wedding-peony-garden/side-cluster-right.webp` | transparent (key from white) |
| `ILL-DIV` | Watercolour bleed divider strip in pale blush | 960×80 | 12:1 | `assets/demos/wedding-peony-garden/divider-bleed.webp` | transparent (key from white) |
| `PHO-01` | Hero. Couple laughing, bride leaning on groom's shoulder, bouquet in front (lawn set, vertical) | 832×1248 | 2:3 | `assets/demos/wedding-peony-garden/pho-01-hero.webp` | — |
| `PHO-02` | Stack, back card. Kiss under the veil with the anemone bouquet (lawn set) | 480×720 | 2:3 | `assets/demos/wedding-peony-garden/pho-02-veil.webp` | — |
| `PHO-03` | Stack, middle card. Both in cream cable-knit on the bed holding bread (bedroom set) | 480×720 | 2:3 | `assets/demos/wedding-peony-garden/pho-03-bedroom.webp` | — |
| `PHO-04` | Stack, front card, smaller. Black gown and tuxedo cheering with magazines outside the rooftop garden pub (street set, ZEN-2218) | 560×420 | 4:3 | `assets/demos/wedding-peony-garden/pho-04-street.webp` | — |
| `PHO-05` | Location block. No venue exterior photo supplied — reused the full-length lawn walking shot (lawn set) instead, same as the sage-arch demo's PHO-03 substitution | 960×640 | 3:2 | `assets/demos/wedding-peony-garden/pho-05-venue.webp` | — |

---

## 4. Asset prompts

### `ILL-01` — Peony cluster, top-left

```
A loose, heavy cluster of three fully open pink peonies with a few rounded green leaves, thin stems and small blush filler buds, composed so the flowers spill diagonally in from the top-left corner of the frame and are cut off by the top and left edges, with the lower-right half of the frame left empty. Peonies are asymmetrical, heavy-headed and slightly drooping, each one a different size and angle. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, petals built from overlapping translucent washes, some petal edges left unfinished, faint visible paper tooth, light even wash with very little granulation. Palette limited to peony pink #E8A9B4, pale blush #F2CDD3, garden green #8FA07A, deep leaf green #4E5240 only in the darkest leaf shadows, and white paper showing through. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no blue, no grey, no purple.
```

### `ILL-02` — Peony and carnation cluster, bottom-right

```
A loose cluster of two fully open pink peonies, two ruffled blush carnations and a few sprays of garden greenery with rounded leaves, composed so the flowers rise diagonally in from the bottom-right corner of the frame and are cut off by the bottom and right edges, with the upper-left half of the frame left empty. Flowers are asymmetrical and heavy-headed, each a different size and angle, carnation petals frilled and irregular. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some petal edges left unfinished, faint visible paper tooth, light even wash with very little granulation. Palette limited to peony pink #E8A9B4, pale blush #F2CDD3, garden green #8FA07A, deep leaf green #4E5240 only in the darkest leaf shadows, and white paper showing through. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no blue, no grey, no purple.
```

### `ILL-03` — Date ring

```
A single hand-painted loop, like one quick brush stroke drawn around a number on a calendar, slightly uneven and not a perfect circle, the stroke overlapping itself where it starts and ends, thicker in one place and thinner in another, centred in the frame with the middle left completely empty. Medium: one confident brush stroke of watercolour on cold-press watercolour paper, soft wet edge, slight pooling of pigment where the stroke slows, faint paper tooth. Colour: garden green #8FA07A only. Isolated on a pure white background, no drop shadow. No text, no numbers, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no geometric perfect circle, no blue, no grey.
```

### `ILL-04` — Icon, wedding rings

```
A small, very lightly painted pair of interlocking wedding rings seen at a slight angle, simple and airy, with a tiny sprig of two green leaves beside them, centred in the frame with generous empty space around it. Painted at very light weight so it reads quieter than a flower illustration. Medium: delicate loose watercolour on cold-press watercolour paper, thin translucent washes, soft wet edges, faint paper tooth, no hard outlines. Palette limited to pale warm gold-cream #E9DDBF for the rings, garden green #8FA07A for the leaves, pale blush #F2CDD3 as a faint shadow wash. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no metallic plastic highlights, no CG sheen, no sparkle effects, no blue, no grey.
```

### `ILL-05` — Icon, champagne coupes

```
A small, very lightly painted pair of vintage champagne coupe glasses tilted toward each other as if clinking, pale liquid inside, a few tiny bubbles, centred in the frame with generous empty space around it. Painted at very light weight so it reads quieter than a flower illustration. Medium: delicate loose watercolour on cold-press watercolour paper, thin translucent washes, soft wet edges, faint paper tooth, glass suggested by leaving white paper rather than painting reflections. Palette limited to pale warm gold-cream #E9DDBF for the liquid, pale blush #F2CDD3 for faint glass shading, garden green #8FA07A for a single thin stroke accent. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no sparkle effects, no blue, no grey.
```

### `ILL-06` — Icon, dinner setting

```
A small, very lightly painted top-down dinner setting: one round plate with a thin rim, a fork on the left and a knife on the right, a small sprig of green leaves resting on the plate, centred in the frame with generous empty space around it. Slightly hand-drawn and imperfect, not geometrically exact. Painted at very light weight so it reads quieter than a flower illustration. Medium: delicate loose watercolour on cold-press watercolour paper, thin translucent washes, soft wet edges, faint paper tooth, no hard outlines. Palette limited to pale blush #F2CDD3 for the plate shading, pale warm gold-cream #E9DDBF for the cutlery, garden green #8FA07A for the leaves. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no metallic plastic highlights, no CG sheen, no blue, no grey.
```

### `ILL-07` — Icon, wedding cake

```
A small, very lightly painted two-tier wedding cake with plain cream icing, one small pink peony and two leaves on the top tier, slightly uneven hand-painted edges, centred in the frame with generous empty space around it. Painted at very light weight so it reads quieter than a flower illustration. Medium: delicate loose watercolour on cold-press watercolour paper, thin translucent washes, soft wet edges, faint paper tooth, no hard outlines. Palette limited to warm cream #F3EAD6 for the icing, pale blush #F2CDD3 for shading, peony pink #E8A9B4 for the flower, garden green #8FA07A for the leaves. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no blue, no grey.
```

### `ILL-08` — Route map

```
A playful hand-painted wayfinding illustration: a single dotted line that meanders in soft S-curves from the lower-left of the frame to the upper-right, ending at one small teardrop map pin, with three or four tiny sprigs of green leaves and one small blush flower placed along the path. No roads, no buildings, no grid, no street names. Mostly empty space. Medium: loose watercolour on cold-press watercolour paper, the dots painted as individual small brush dabs of slightly varying size, the pin a soft wash with a white paper highlight, faint paper tooth. Palette limited to garden green #8FA07A for the dotted line and leaves, peony pink #E8A9B4 for the map pin, pale blush #F2CDD3 for the small flower. Isolated on a pure white background, no drop shadow. No text, no lettering, no labels, no watermark, no gradient background, no plastic highlights, no CG sheen, no blue, no grey.
```

### `ILL-09` — Side cluster, left

```
A tall, narrow cluster of one open blush peony, one half-open pink peony bud and trailing garden greenery with rounded leaves and thin arching stems, composed so it enters from the left edge of the frame and is cut off by that edge, reaching roughly halfway across, with the right half of the frame empty. Flowers asymmetrical and heavy-headed, stems curving naturally, not mirrored. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, light even wash with very little granulation. Palette limited to peony pink #E8A9B4, pale blush #F2CDD3, garden green #8FA07A, deep leaf green #4E5240 only in the darkest leaf shadows, and white paper showing through. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no blue, no grey, no purple.
```

### `ILL-10` — Side cluster, right

```
A tall, narrow cluster of two ruffled blush carnations, several airy white gypsophila sprays and trailing garden greenery with thin stems, composed so it enters from the right edge of the frame and is cut off by that edge, reaching roughly halfway across, with the left half of the frame empty. Flowers asymmetrical, carnation petals frilled and irregular, gypsophila as small loose dots of white and pale blush. Medium: hand-painted loose botanical watercolour on cold-press watercolour paper, soft wet-in-wet bleeds, overlapping translucent washes, some edges left unfinished, faint visible paper tooth, light even wash with very little granulation. Palette limited to peony pink #E8A9B4, pale blush #F2CDD3, garden green #8FA07A, deep leaf green #4E5240 only in the darkest leaf shadows, and white paper showing through. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no plastic highlights, no CG sheen, no perfectly symmetrical flowers, no blue, no grey, no purple.
```

### `ILL-DIV` — Watercolour bleed divider

```
A long, very thin horizontal band of pale watercolour wash running the full width of a wide frame, like a single loose brush sweep, with a soft irregular wet edge on the top and the bottom, slightly thicker toward the left and fading and breaking up toward the right, small blooms and cauliflower marks where the water pooled. No objects, no flowers, only the wash. Medium: watercolour on cold-press watercolour paper, wet-in-wet, very transparent, faint visible paper tooth. Colour: pale blush #F2CDD3 with a barely visible hint of garden green #8FA07A bleeding in at one end. Isolated on a pure white background, no drop shadow. No text, no lettering, no watermark, no gradient background, no hard straight edges, no plastic highlights, no CG sheen, no blue, no grey.
```

---

## 5. Build notes

- **Fonts:** Great Vibes (display) and Cormorant Garamond 300/400/500 (label and body), both Google Fonts under the SIL Open Font License, free for commercial use.
- **Script coverage:** names are English. Great Vibes sets them with no substitute needed.
- **Reversed type:** cream on the green RSVP button uses Cormorant Garamond 500, not 300.
- **Photography:** the client has supplied the lawn, bedroom and street sets. Used: one vertical lawn portrait (hero), the veil kiss, one bedroom bread photo, one black-set wall photo, and the lawn walking shot reused for the location block (no separate venue photo exists). All crops are rounded rectangles. Leave 10% headroom above the heads, a rounded crop needs less than an arch but the florals overlap the top corners.
- **Photo stack layout:** `PHO-02` rotated −4°, `PHO-03` rotated +3° and offset right, overlapping by about 30%. `PHO-04` sits smaller on top, lower-centre, rotated −2°. 3px cream border on each card, no drop shadow beyond a 1px `#D9D2BF` hairline.
- **Grading:**
  - Lawn set: already close. Lift shadows slightly, pull the grass saturation down about 10% so it sits beside `#8FA07A` rather than fighting it.
  - Bedroom set: the whites read slightly cool. Warm them toward `#FAF6EC`, lower contrast a touch.
  - Street set (`PHO-04`): lift the blacks to around `#3A3530`, cut contrast about 20%, warm the building facade toward cream. If it still reads as the darkest thing on the page by a wide margin, replace it with a lawn photo.
  - The Lay's, Coca-Cola and Pocky packaging in the bedroom photos is loud red and yellow. Choose the crop that keeps the snacks out, or keep only the bread.
- **Never do:**
  - No arch, dome or circle-topped photo crops anywhere (couple's request).
  - No blue, no grey, no navy. Pink, cream and green only.
  - No full-bleed photography. Everything is framed and inset.
  - No heavy line icons. Any icon must read lighter than the florals.
  - No second divider motif. The bleed is it.
  - No high-contrast or moody photographs.
  - No geometric perfection in the florals.

---

## Generating the assets

This spec does not generate anything. To run it:

```bash
codex exec --skip-git-repo-check "Read demos/wedding-peony-garden-DESIGN.md. Generate every ILL asset in section 3 with your image generation tool. Save to assets/demos/wedding-peony-garden/ at the exact filenames and pixel sizes in the table, WebP q82. Do NOT modify any existing file. Print the files created with actual dimensions."
```
