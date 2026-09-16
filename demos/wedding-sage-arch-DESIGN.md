# &lt;NAME&gt; &amp; &lt;NAME&gt; — invitation design spec

| | |
|---|---|
| Style | `sage-arch-minimal` |
| Date | 2026-09-16 |
| Wireframe | `demos/wedding-sage-arch-wireframe.html` |
| Blocks | 9 |
| Assets to generate | 2 |
| Client photo slots | 5 |

---

## 0. Why this style

The uploaded shoot is a golf-course lawn under bright overcast — `meadow`, `countryside` and
`outdoor-daylight` all hit the scene tags (+3), the grade is genuinely neutral rather than warm
or cool (+2), the register is mid-formality (a formal gown but a laughing, playful shoot, +2),
and it reads as summer (+1). Total 8.

The runner-up was `pink-peony-garden`, which tied at 8 on the same four signals. It lost on two
counts that only show up once you look at the second outfit: it forbids full-bleed photography
and forbids high-contrast or moody photographs, and the black-tuxedo / black-gown urban set is
both. It also carries 8–12 watercolour elements against this style's 2, which is a materially
larger image budget for a job whose photography is already strong enough to carry the page.
Within 2 points is a taste call, and the taste call was made in favour of the modern one.

**Nothing is borrowed from another style.** Every dimension below comes from
`styles/sage-arch-minimal/style.md`.

**Two deliberate departures from the cross-style laws**, both mandated by the style file itself —
do not "correct" them:

1. **There is no accent colour and therefore no solid button.** Cross-style law 5 asks for one
   accent used once; this style's whole point is that it has two values and the photographs.
   Every button on this page is outlined.
2. **Full-bleed square-cornered photography appears outside the hero.** Cross-style law 7 confines
   it to the hero; this style's section 4 explicitly permits full-bleed interior sections with the
   arch appearing above or below.

---

## 1. Design tokens

### Colour

```css
--ground:     #FFFFFF;   /* pure white panels that cut into the sage — ~20% of surface */
--dominant:   #5E6E66;   /* dusty sage, full-bleed flat fields — ~45% of surface */
--ink:        #4A5750;   /* dark sage — all type set on white */
--ink-invert: #F2F0EA;   /* warm off-white — all type set on sage */
--hairline:   #C6CCC7;   /* 1px rules, calendar ring, outlined button on white */
/* --accent:  NONE. This style has no accent colour by design. See section 0. */
```

Photography is the remaining ~35% of the surface, ungraded and neutral.

**Pure white, never cream.** Cream turns this into a rustic invitation. It is a one-token
difference and it is the difference.

### Type

```css
--font-display: 'Cormorant Garamond', 'Prata', Georgia, serif;  /* 28–40px, ALL CAPS, letter-spacing .12em */
--font-label:   'Cormorant Garamond', Georgia, serif;           /* 11px, ALL CAPS, letter-spacing .22em */
--font-body:    'Jost', 'Questrial', system-ui, sans-serif;     /* 13–14px, line-height 1.8, weight 300 */
```

All three weights are 300.

**This style has no script face at all.** The couple's names are set in the same all-caps
Cormorant Garamond as the section labels, just larger. Do not add a calligraphic face.

**Script coverage:** the names are Latin, so Cormorant Garamond sets them directly. No substitute
face is needed and no fallback stack beyond Georgia is required.

**Reversed type:** Cormorant Garamond 300 on the `#5E6E66` field thins out visually. Bump display
type reversed on sage to weight 400; leave body type at 300 — Jost holds at 300 reversed.

### Shape and spacing

```css
--radius-photo:  240px 240px 4px 4px;  /* arch crop — radius ≈ half the column width */
--radius-button: 999px;                /* pill */
--block-gap:     0;                    /* blocks butt directly; the arch is the seam */
--column-max:    480px;                /* the invitation column */
```

Arch radius is deliberately half the column width so it reads as a doorway, not as a rounded
corner. At `--column-max: 480px` that is `240px`.

### Divider motif

**Arch mask** — and only this one. The top edge of a block is a rounded arch, or a single sweeping
curve runs corner to corner. Appears **6 times**: blocks 01, 04, 05, 06, 08, 09.

No torn edges, no watercolour bleeds, no second motif anywhere on the page.

---

## 2. Blocks

In order. This order is the wireframe's order — they match.

| # | Block | Copy slots | Photo slots | Asset slots |
|---|---|---|---|---|
| 01 | hero | `TXT-01` label · `TXT-02` names, display · `TXT-03` date + city | `PHO-01` | `ILL-01` |
| 02 | invitation | `TXT-04` heading · `TXT-05` paragraph, 3–4 lines | — | — |
| 03 | calendar | `TXT-06` month label · `TXT-07` ceremony time | — | — |
| 04 | photo | — | `PHO-02` | — |
| 05 | location | `TXT-08` heading · `TXT-09` venue name · `TXT-10` address · `TXT-11` button label | `PHO-03` | — |
| 06 | dress code | `TXT-12` heading · `TXT-13` one-line guidance | — | `ILL-02` |
| 07 | guest form | `TXT-14` heading · `TXT-15` one line · `TXT-16` button label | — | — |
| 08 | details | `TXT-17` heading · `TXT-18` `TXT-19` `TXT-20` three short notes | `PHO-04` | — |
| 09 | closing | `TXT-21` closing line, all caps | `PHO-05` | `ILL-01` (reused) |

**No timeline block.** The style's own rhythm has none, and a mid-formality invitation with a
calendar already answers "when". If the couple later wants a run-of-show, it inserts between 05
and 06 and needs four more line icons — which would breach the three-hand-drawn-marks ceiling in
section 5 below, so it would be a real design change, not an addition.

**No wishes-and-gifts block.** Folded into 08 details as one of the three notes.

**`ILL-01` is used twice** (hero and closing) and `ILL-02` once. That is three hand-drawn marks
on the page, which is the ceiling. A fourth mark stops reading as a signature and starts reading
as decoration.

---

## 3. Assets

Every row here appears in the wireframe, and every `ILL-xx` and `PHO-xx` in the wireframe appears
here. No orphans in either direction.

| Slot | What it is | Output px | Ratio | Filename | Ground |
|---|---|---|---|---|---|
| `ILL-01` | Hand-drawn open heart, single continuous wobbly stroke | 400×360 | 10:9 | `assets/demos/wedding-sage-arch/heart.webp` | white — keyed out in build |
| `ILL-02` | Thin single-weight line sprig, one stem, few leaves | 360×720 | 1:2 | `assets/demos/wedding-sage-arch/sprig.webp` | white — keyed out in build |
| `PHO-01` | Hero — the veil kiss close-up. Client supplies. Full bleed, square corners; a sage arch panel overlaps its lower half, so keep the faces in the upper 55% | 960×1280 | 3:4 | `assets/demos/wedding-sage-arch/pho-01.webp` | — |
| `PHO-02` | Full-bleed interior — the laughing hug on the lawn. Client supplies. Square corners, arch above | 960×1200 | 4:5 | `assets/demos/wedding-sage-arch/pho-02.webp` | — |
| `PHO-03` | Location — the wide lawn walking shot, the venue legible behind them. Client supplies. **Arch crop**: needs ~15% empty headroom above the subjects or the arch eats their heads | 960×1440 | 2:3 | `assets/demos/wedding-sage-arch/pho-03.webp` | — |
| `PHO-04` | Details — the second look, black tuxedo and black gown, urban. Client supplies. **Arch crop**, same headroom rule | 960×1440 | 2:3 | `assets/demos/wedding-sage-arch/pho-04.webp` | — |
| `PHO-05` | Closing — full bleed, square corners. Client supplies. The walking-away or balcony frame reads best as an ending | 960×1280 | 3:4 | `assets/demos/wedding-sage-arch/pho-05.webp` | — |

`PHO-xx` rows are client photographs, not generated. They stay in this table because the crop
size is a real spec the client needs before sending files.

---

## 4. Asset prompts

One block per `ILL-xx` row above, in the same order.

Every prompt here is standalone. Each one gets copy-pasted alone into a generator with no
surrounding context. No prompt asks for text — all lettering is laid over the artwork in HTML.

Both marks are generated as **black line on pure white** and recoloured to `#F2F0EA` in the build.
A white line generated on a white ground cannot be keyed out; see section 5.

### `ILL-01` — hand-drawn open heart

```
A single small heart drawn as one continuous unbroken line, hand-drawn by a person with a fine
felt-tip pen, deliberately slightly wobbly and imperfect, the two lobes not quite matching each
other, the line ending just short of where it began so the shape stays open rather than closed.
Uniform line weight throughout, roughly 3 pixels at this size, no tapering, no calligraphic
thick-thin modulation, no shading, no fill. Pure black ink on a pure white background, isolated,
nothing else in the frame, no drop shadow, generous even margin on all four sides. Flat clean
print reproduction with no paper texture, no grain and no wash. No text, no lettering, no
watermark, no signature, no gradient background, no plastic highlights, no CG sheen, no
three-dimensional rendering, no perfectly symmetrical geometry, no vector-icon slickness.
```

### `ILL-02` — thin line sprig

```
A single slender botanical sprig drawn as a thin continuous hand-drawn line, one upright stem with
five or six small simple leaves alternating along it, the leaves drawn as plain outlined ovals with
no interior veining, the whole sprig leaning very slightly to one side so it is not bilaterally
symmetrical. Uniform line weight throughout, roughly 2 pixels at this size, no tapering, no
calligraphic modulation, no shading, no fill, no hatching. Pure black ink on a pure white
background, isolated, nothing else in the frame, no drop shadow, generous even margin on all four
sides, the sprig vertical within a tall narrow frame. Flat clean print reproduction with no paper
texture, no grain and no wash. No text, no lettering, no watermark, no signature, no gradient
background, no plastic highlights, no CG sheen, no three-dimensional rendering, no botanical
engraving detail, no vector-icon slickness, no flowers.
```

---

## 5. Build notes

- **Fonts:** Cormorant Garamond 300/400 and Jost 300, both Google Fonts under the SIL Open Font
  Licence. Self-host the subsets; do not hotlink, the page must open on a weak venue signal.
- **Script coverage:** names are Latin, Cormorant Garamond covers them. No substitute needed.
- **Reversed type:** display type on the `#5E6E66` field goes to weight 400. Body stays 300.
- **Recolouring the marks:** both `ILL-xx` files arrive as black on white. In the build, key the
  white to transparent and recolour the stroke to `#F2F0EA` for marks sitting on sage, `#4A5750`
  for a mark sitting on white. Do not ask the generator for a white line.
- **Photography the client must supply:** 5 files, at the pixel sizes in section 3. Two are arch
  crops (`PHO-03`, `PHO-04`) and both need roughly 15% empty headroom above the subjects — an arch
  crop eats the top of the frame in a way a rectangle does not. Brief the couple on this *before*
  they pick the frames, not after.
- **Grading:** the lawn set is already neutral and needs nothing. The black-tuxedo urban set
  (`PHO-04`) runs harder in contrast and slightly cooler — pull its contrast down and match its
  black point to the lawn set, or the page reads as two shoots stapled together. Do not warm
  anything up to compensate.
- **Dress-code swatches:** four 44px circles, spaced apart rather than touching, reading
  `#5E6E66` → `#8A9691` → `#C6CCC7` → `#FFFFFF`. A sage tonal ladder, not the couple's own beige
  and black — see the beige ban below.
- **Calendar:** seven-column grid, all-caps weekday initials, the wedding date marked with a
  hairline `#4A5750` circle. Never a filled dot.
- **Buttons:** 1px outline, pill radius, 160×36px, all caps 11px at `0.2em` tracking. White outline
  on sage, `#4A5750` outline on white. There are no solid buttons on this page.
- **The photography carries the page.** With no accent colour and only two hand-drawn marks, weak
  photographs have nothing to hide behind. This is the one real risk of the chosen style and it is
  accepted knowingly — the supplied shoot is strong enough.

### Build record — `demos/wedding-premium-1.html` (2026-09-16)

This spec was built once, as the studio's own portfolio demo, at
`demos/wedding-premium-1.html`. Two decisions were taken at build time and are recorded here
so a later session does not "fix" them back:

1. **`ILL-01` and `ILL-02` ship as inline SVG, not as generated `.webp` files.** Both are
   single-weight open line drawings, which is exactly what an SVG path is. Drawing them inline
   makes them recolourable with `currentColor` (`#F2F0EA` on sage, `#4A5750` on white) with no
   keying step, keeps the page at zero image requests for the marks, and removes the Codex
   dependency entirely. The prompts in section 4 stay valid for anyone who wants raster versions.
2. **Fonts are loaded from Google Fonts, not self-hosted.** The demo matches the rest of
   `demos/` in this repo. A real client build should still self-host per the bullet above — a
   venue with weak signal is a real constraint and a portfolio demo is not.

Photographs used: `PHO-01` ZEN-1852, `PHO-02` ZEN-1625, `PHO-03` ZEN-1655, `PHO-04` ZEN-2218,
`PHO-05` ZEN-1674, cropped to the section 3 pixel sizes into
`assets/demos/wedding-sage-arch/`. `PHO-03` is the lawn full-length frame rather than the
walking frame, because it was already 2:3 with the headroom the arch crop needs.

### Never do

- **No cream, no ivory, no beige anywhere in the page palette.** Pure white only.
- **No script or calligraphic type.**
- **No watercolour, no florals.**
- **No accent colour, and therefore no solid buttons.**
- **No texture, grain, paper tooth or wash.**
- **No warm grading on the photographs.**
- **No more than three hand-drawn marks on the whole page.**
- **No second divider motif** — the arch is it.

---

## Generating the assets

This spec does not generate anything. To run it:

```bash
codex exec --skip-git-repo-check "Read demos/wedding-sage-arch-DESIGN.md. Generate every ILL asset in section 3 with your image generation tool. Save to assets/demos/wedding-sage-arch/ at the exact filenames and pixel sizes in the table, WebP q82. Do NOT modify any existing file. Print the files created with actual dimensions."
```
