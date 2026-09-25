# CoolTech Aircon v2 — Image Brief

> **STATUS: DONE.** All 8 images were generated with the Codex CLI's built-in image
> tool and are live in `demos/cooltech-aircon-v2.html`. No Unsplash placeholders remain.
> Files live in `assets/demo/cooltech/` (376 KB total).
>
> **If you regenerate any of these**, do it the fast way:
> 1. Have Codex save a **PNG only** — do not ask it to produce WebP. Without a WebP
>    encoder on PATH it will spend 8-10 minutes hunting for one (it tried Blender).
> 2. Convert yourself with ffmpeg (installed 2026-09-13, `winget` Gyan.FFmpeg 9.0.1):
>    ```
>    ffmpeg -y -i in.png -vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H" -c:v libwebp -quality 82 out.webp
>    ```
>    Gallery = 800x600, hero = 900x1125, why = 900x1080.
> 3. Codex's image tool ignores aspect-ratio hints buried in prose. If you need
>    landscape, say so in a CRITICAL FRAMING line at the very top of the prompt —
>    `gallery-team` came back portrait and off-subject the first time.

Target page: `demos/cooltech-aircon-v2.html`
Output folder: `assets/demo/cooltech/`
Format: **WebP**, quality 82, sRGB. Keep the exact filenames below.
All eight are already generated — the prompts below are kept for regeneration.

Every `<img>` on the page carries an `id` (listed below). To swap a photo,
replace only the `src` attribute on the matching id.

---

## Global art direction (apply to every image)

- **Setting:** contemporary Malaysian residential / commercial interiors — Klang Valley
  condos, landed homes, small offices. Tropical daylight, not European winter light.
- **People:** Malaysian technicians — a natural mix of Malay, Chinese and Indian
  Malaysian men and women, ages 25–45. Short dark hair, clean-shaven or neatly
  trimmed. No Western-looking models.
- **Uniform:** navy blue (#123A6B) short-sleeve polo or work shirt, small orange
  (#F5821F) chest logo patch, dark navy work trousers, orange lanyard or orange
  cap accent. Clean, pressed, not grimy.
- **Colour grade:** cool neutral whites, navy and orange accents allowed to sit in
  frame naturally (a toolbox, a cap, a cable tie). Slightly desaturated, soft
  contrast, no heavy HDR, no orange-teal blockbuster grade.
- **Light:** soft diffuse daylight from a window, gentle fill. No harsh flash,
  no dramatic rim light.
- **Lens look:** 35mm or 50mm, f/2.8–f/4, shallow but not extreme depth of field.
- **Realism:** photojournalistic, candid, believable. Documentary service-call feel.
- **Hard negatives (append to every prompt):** no text, no watermark, no logo
  lettering, no brand names, no distorted hands, no extra fingers, no floating
  tools, no impossible wiring, no snow, no fake HDR halo, no stock-photo grin,
  no illustration, no 3D render, no CGI.

---

## 1. Hero — `img-hero`

- **File:** `hero-technician.webp`
- **Size:** 900 × 1125 (4:5 portrait)
- **Displayed as:** tall arch shape (top corners rounded ~220px) on the navy panel,
  right side of the hero. **Subject must sit in the upper-centre of the frame** —
  the bottom ~15% is covered by a white "Licensed & Insured" chip on the left edge.

> A Malaysian aircon technician in a navy blue short-sleeve work polo with a small
> orange chest patch, standing three-quarter turned toward camera, carrying a white
> wall-mounted split air-conditioner indoor unit balanced on one shoulder, other hand
> steadying it. Warm confident half-smile, looking at camera. Shot in a bright modern
> Malaysian condo living room, out-of-focus white wall and pale grey sofa behind him,
> soft window daylight from the left. 50mm, f/2.8, natural colour, photojournalistic.
> Vertical 4:5 framing, subject from mid-thigh up, head in the upper third.

---

## 2. Why-Us split — `img-why`

- **File:** `why-technician.webp`
- **Size:** 900 × 1080 (5:6 portrait)
- **Displayed as:** rounded rectangle with a solid orange square peeking out behind
  the **top-left** corner. Keep the top-left ~45px of the frame visually calm so the
  orange block reads cleanly against it.

> A Malaysian aircon technician kneeling beside an outdoor condenser unit on a
> condo balcony, holding a refrigerant manifold gauge set, checking the pressure
> reading with focused attention. Navy work polo, orange lanyard. Hands clearly
> visible and correctly formed on the gauge. Blurred tropical greenery and pale
> apartment block behind. Overcast soft daylight. 35mm, f/3.5, documentary style.
> Vertical 5:6 framing.

---

## 3–8. Gallery grid (all 800 × 600, 4:3 landscape)

Each is shown at ~380 × 285 with an orange tag pinned top-left and a navy gradient
caption bar sliding up from the bottom on hover. **Keep the top-left corner and the
bottom ~30% free of important detail.**

### 3. `img-gal-1` — `gallery-chemical-wash.webp`
Tag: *Chemical Wash* · Caption: Condo Unit in Damansara

> Close-up of a spotlessly clean white wall-mounted split air-conditioner indoor
> unit freshly serviced, front cover open showing a bright clean aluminium fin coil
> and clean white filters. Mounted on a light grey painted wall in a Malaysian
> condo bedroom. Soft daylight, crisp detail, no people. 4:3 landscape.

### 4. `img-gal-2` — `gallery-office-install.webp`
Tag: *Installation* · Caption: Office in Petaling Jaya

> A small modern Malaysian office interior with a white ceiling-cassette air
> conditioner freshly installed in a clean suspended ceiling grid, desks and
> monitors softly out of focus below. Bright even daylight from a window wall.
> Wide 4:3 landscape, no people, no readable signage.

### 5. `img-gal-3` — `gallery-outdoor-maintenance.webp`
Tag: *Maintenance* · Caption: Landed Home in Shah Alam

> A Malaysian technician in a navy work polo servicing a row of outdoor condenser
> units mounted on the side wall of a suburban Malaysian terrace house, spraying
> a coil cleaner onto the fins. Late-afternoon tropical daylight, palm foliage in
> the background. Seen from behind and slightly to the side. 4:3 landscape.

### 6. `img-gal-4` — `gallery-before-after.webp`
Tag: *Before / After* · Caption: Deep Clean Results

> Two aircon filter panels side by side on a protective sheet on the floor — the
> left one heavily coated in grey dust and lint, the right one washed clean and
> wet, water droplets visible. Flat overhead angle, even daylight, clear contrast
> between the two. No text labels, no arrows. 4:3 landscape.

### 7. `img-gal-5` — `gallery-living-room.webp`
Tag: *Installation* · Caption: Bungalow in Mont Kiara

> A bright upmarket Malaysian living room with a slim white wall-mounted split
> air conditioner high on a feature wall, neutral sofa, timber floor, large window
> with tropical greenery outside. Interior-magazine styling, calm and airy,
> no people. 4:3 landscape.

### 8. `img-gal-6` — `gallery-team.webp`
Tag: *Our Team* · Caption: Professional Team

> Two Malaysian aircon technicians in matching navy polos with orange trim
> unloading a toolbox and a vacuum pump from the open side door of a white service
> van parked in a Malaysian residential driveway. Both mid-action, relaxed and
> professional. Morning daylight. The van is plain white with no lettering.
> 4:3 landscape.

---

## After generating

1. Save all eight into `assets/demo/cooltech/`.
2. In `demos/cooltech-aircon-v2.html`, swap each `src` (ids listed above) to
   `../assets/demo/cooltech/<filename>.webp`.
3. Leave the `width`, `height`, `alt` and `loading` attributes as they are —
   the ratios already match.
