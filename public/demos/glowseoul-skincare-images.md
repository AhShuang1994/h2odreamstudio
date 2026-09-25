# Glow Seoul v2 — image generation spec

Six image slots in `demos/glowseoul-skincare-v2.html`. Each is marked in the HTML with an
`<!-- IMG-0n · … -->` comment directly above the `<img>` tag.

Right now every slot is filled with a **verified Unsplash URL** so the page renders finished.
To swap in generated artwork: generate → process → drop the file in `assets/demos/glowseoul/`
→ replace the `src` only. Leave `width`, `height`, `alt` and `loading` exactly as they are —
they are set to the real output dimensions and prevent layout shift.

---

## Shared style bible — every image must obey

**Palette.** Warm off-white paper (`#FDFAF5`), vivid orange (`#F26B1D`), terracotta and amber
mid-tones, soft peach (`#FBE0C9`). Warm neutral shadows, never cool grey or blue.

**Light.** Soft, directional, warm daylight — late-morning window light. One clear light source,
gentle falloff, no hard studio flash, no coloured gels.

**Finish.** Editorial beauty photography, shallow depth of field, natural film grain, matte
highlights. Clean and expensive, not glossy-commercial.

**Skin.** Real, visible texture. Pores and fine hairs stay. No plastic retouching, no skin
smoothing filter, no blemish erasure.

**Hard rules — apply to all six.**
- **No text, logos, typography or brand marks anywhere in the frame.** The page puts its own type
  on top; baked-in text also cannot be read by AI crawlers.
- No visible competitor packaging, no readable product labels.
- Nothing cool-toned (no blue, no mint, no lilac) — it fights the orange system.
- Compose with breathing room; the hero and results slots have UI cards sitting on top of them
  (positions noted per slot).
- Keep the bottom-right corner visually quiet if you generate with Gemini / Nano Banana —
  that is where the watermark lands and it has to be cloned out cleanly.

**Post-processing (per `GEO-CHECKLIST.md` §6).**
1. Keep the original PNG until the processed file is approved.
2. Cover the bottom-right watermark by cloning a clean same-row patch. Do **not** crop
   asymmetrically — that changes the aspect ratio and unbalances the composition.
3. `sharp` → WebP, quality 82, resized to the pixel width in the table below.
4. Semantic kebab-case filename.

---

## Slots

| ID | Where | Output px | Ratio | Filename |
|---|---|---|---|---|
| IMG-01 | Hero band, full width | 1600 × 900 | 16:9 | `hero-ampoule-in-use.webp` |
| IMG-02 | Floating product card | 340 × 400 | 17:20 | `product-ampoule.webp` |
| IMG-03 | Ingredients bento, tall left column | 640 × 860 | 32:43 | `ingredients-mood.webp` |
| IMG-04 | Results section, large left image | 900 × 1000 | 9:10 | `results-serum-drop.webp` |
| IMG-05 | Results card, "Week 1" thumbnail | 420 × 520 | 21:26 | `result-week-1.webp` |
| IMG-06 | Results card, "Week 4" thumbnail | 420 × 520 | 21:26 | `result-week-4.webp` |

---

### IMG-01 · Hero band — `hero-ampoule-in-use.webp` · 1600 × 900 · 16:9

> Editorial beauty photograph, 16:9 landscape. A Malaysian woman in her late twenties at a bathroom
> counter in warm morning light, applying serum: she holds a small unlabelled glass pipette in one
> hand with a bead of golden-amber serum at its tip, and is pressing the serum into her cheek with
> the fingertips of her other hand. Eyes lowered, calm and unposed, mid-gesture rather than smiling
> at the camera. Bare skin, no makeup, hair loosely tucked behind one ear. Warm late-morning
> daylight from the upper left, soft falloff into a creamy off-white wall. Shallow depth of field
> with her hand and cheek sharp. Natural skin texture — pores and fine hairs visible, not
> airbrushed. Fine film grain. Palette of warm amber, terracotta and soft cream. Intimate and
> ordinary, a real morning routine, not a spa. No text, no logos, no readable packaging in frame.

**Why this scene:** the page sells a **serum ampoule**, so the hero must show the ampoule being
used. Do not substitute a clay mask, a spa treatment, a towel-wrapped facial, or any other product
category — it reads as the wrong product.

**Composition constraints:** a white product card overlays the **bottom-left quadrant** and a small
pill badge sits **top-right** on desktop. Keep her face and the pipette centred or slightly right of
centre, and leave the bottom-left third free of important detail. A dark scrim gradient runs from
the left edge, so the left side can carry shadow.

---

### IMG-02 · Product card thumbnail — `product-ampoule.webp` · 340 × 400 · 17:20

> Product photograph, tall portrait crop. A single frosted-glass skincare ampoule bottle with a
> matte dropper cap and a warm amber serum inside, standing on a smooth off-white surface. One
> fresh centella leaf laid flat beside the base. Soft directional daylight from the right casting
> a long gentle shadow to the left. Warm cream and amber palette with a single muted green accent.
> Minimal, calm, expensive. The bottle is completely unlabelled — no text, no logo, no printing of
> any kind on the glass.

**Composition constraints:** displays at 84 × 96 px inside a rounded card, so the bottle must read
at thumbnail size. Fill the frame — the bottle should occupy roughly 70% of the height. Centre it.

---

### IMG-03 · Ingredients mood — `ingredients-mood.webp` · 640 × 860 · 32:43

> Moody still-life photograph, tall portrait orientation. A cluster of three or four amber glass
> dropper bottles of different heights arranged on a dark warm-brown stone surface, with a thin
> copper ring and a few scattered dried botanical stems. Low warm side light rakes across from the
> right, catching the amber glass so it glows. Deep shadow in the background, rich chocolate and
> burnt-orange tones. Shallow depth of field with the front bottle sharp. Apothecary mood, luxurious
> and quiet. All bottles are unlabelled — no text, no logos anywhere.

**Composition constraints:** this is the darkest element on the page and deliberately anchors the
left of the bento row. Keep the bottles in the lower two-thirds; the top third can fall to shadow.

---

### IMG-04 · Results hero — `results-serum-drop.webp` · 900 × 1000 · 9:10

> Macro beauty photograph, near-square portrait crop. A glass pipette held above bare skin,
> releasing a single golden-amber drop of serum that has just landed and is beginning to spread
> into a soft glossy bead on the skin below. Extremely shallow depth of field — the drop and the
> pipette tip are sharp, the hand and background fall away. Warm honey and peach tones throughout,
> lit by soft daylight from the upper left. Real skin texture with visible fine hairs and pores.
> Intimate, tactile, clean. No text, no packaging, no labels.

**Composition constraints:** a white card overlaps the **right side** on desktop and the **bottom
half** on mobile. Keep the pipette and the drop in the **upper-left two-thirds** of the frame.

---

### IMG-05 · Week 1 — `result-week-1.webp` · 420 × 520 · 21:26

> Documentary portrait, tall crop, head and shoulders. A woman in her late twenties facing the
> camera with a neutral, unposed expression, no makeup, hair pulled back. Her skin shows genuine
> irritation — mild diffuse redness across the cheeks and around the nose, some dryness and uneven
> texture. Flat even daylight from directly in front, plain warm off-white background. Completely
> unretouched, honest, clinical-but-kind documentary style. No text, no overlays, no filters.

**Composition constraints:** must be the **same person, framing, distance and lighting** as IMG-06 —
this is a before/after pair and the page explicitly claims identical lighting. Generate both in one
pass or with a locked seed. Face centred, eyes on the upper third line.

---

### IMG-06 · Week 4 — `result-week-4.webp` · 420 × 520 · 21:26

> Documentary portrait, tall crop, head and shoulders. **The same woman as IMG-05**, same framing,
> same distance, same flat frontal daylight, same plain warm off-white background, same pulled-back
> hair, no makeup. Four weeks later: the redness across her cheeks has settled, dry patches around
> the nose are gone, skin texture reads smoother and better hydrated with a soft natural sheen.
> Still real skin — pores and fine texture visible, not airbrushed. Expression calm and relaxed.
> No text, no overlays, no filters.

**Composition constraints:** identical to IMG-05. The only thing that changes between the two
frames is the skin. If the face, crop or light shifts, the pair reads as fake.

---

## After swapping

- Update each `src` to `../assets/demos/glowseoul/<filename>` (or wherever the folder lands).
- The `alt` text already describes each planned image — reword only if the generated image differs.
- Re-run the screenshot check to confirm no layout shift and no broken requests.
- `assets/` is `Disallow`-ed for crawlers. This is a `noindex` concept demo so that is fine, but if
  these images ever need to be citable, move them to a crawlable folder per `GEO-CHECKLIST.md` §1.
