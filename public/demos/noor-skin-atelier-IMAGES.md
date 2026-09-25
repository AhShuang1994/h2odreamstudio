# NOOR Skin Atelier: image spec

Page: `public/demos/noor-skin-atelier.html` (fictional facial & brow atelier in Taman Molek, Johor Bahru, Malaysia).
Output folder: `public/assets/demos/noor/`. Deliver **WebP, quality 82** (convert with Python Pillow: `img.save(path, "WEBP", quality=82, method=6)`). Keep the PNG source next to it with the same name (PNGs are gitignored).

## Style bible (applies to every image)

- **Look:** editorial beauty photography, shot on 35mm film, soft natural window light, gentle diagonal window-light shadows on the wall. Real skin texture with visible pores, no airbrushed plastic skin, no glossy "AI render" look. Subtle film grain.
- **Palette:** warm stone and greige walls (#EAE3DA, #DED5CA, #CBBFB1), charcoal and ink (#1B1714, #3A342F), creamy linen whites. ONE small rust accent (#7E3F2F) allowed per image (a folded towel, a ceramic dish, a dried flower), never more.
- **People:** Asian women, 25 to 45, natural makeup. Ethnicity is open (East Asian, Southeast Asian, South Asian, mixed); do not default to hijab or any one look. Editorial and modern, like a fashion or skincare campaign. Therapists wear plain oat or charcoal uniforms and white nitrile gloves.
- **Setting:** calm minimal treatment room: limewash walls, linen, travertine, ceramic, dried flowers. No neon, no pink, no orange walls, no gradients.
- **Never:** text, letters, logos, watermarks, signage, brand names on bottles, extra fingers, distorted hands.

## Slots

Every slot is used at all three breakpoints (phone 390, iPad 820, desktop 1440) with `object-fit: cover`. The "safe area" column says what must stay inside the frame after cropping.

| ID | Filename | Pixels | Ratio | Where / how it is cropped | Safe area |
|---|---|---|---|---|---|
| HERO-01 | `hero-portrait.webp` | 1024 × 1536 | 2:3 | Hero poster. Sliced into 4 vertical strips. Phone crops to about 0.42:1 (keeps the centre 45% of the width); desktop crops to about 0.87:1 (keeps the top 70% of the height). | Whole body inside the **centre 45% of the width**. Head between 8% and 22% from the top. All four edges may be cut. |
| FOUNDER-01 | `founder-portrait.webp` | 800 × 800 | 1:1 | Circle crop, 180 to 240px on screen. | Face centred, eyes at 40% from the top. Nothing important in the corners. |
| FOUNDER-BG-M | `founder-bg-m.webp` | 900 × 1600 | 9:16 | Full-bleed background behind the founder card on phone, darkened 50%. | All edges may be cut. Keep the centre quiet (the white card covers it); detail near top and bottom. |
| FOUNDER-BG-D | `founder-bg-d.webp` | 1920 × 1280 | 3:2 | Full-bleed background on iPad / desktop, darkened 50%. Heading sits on the left third, card on the right two-thirds. | All edges may be cut. Left third dark and calm for white text. |
| SVC-01 | `treat-hydra.webp` | 960 × 1280 | 3:4 | Treatment card. Rounded corners 22px. On desktop the card is tilted in 3D, so edges get slightly foreshortened. | Subject centred, 6% margin all round. |
| SVC-02 | `treat-clear.webp` | 960 × 1280 | 3:4 | same | same |
| SVC-03 | `treat-barrier.webp` | 960 × 1280 | 3:4 | same | same |
| SVC-04 | `treat-pore.webp` | 960 × 1280 | 3:4 | same | same |
| SVC-05 | `treat-brow.webp` | 960 × 1280 | 3:4 | same | same |
| SVC-06 | `treat-lash.webp` | 960 × 1280 | 3:4 | same | same |

## Prompts (each one is complete on its own)

**HERO-01**
Full-length editorial fashion portrait of a Malaysian woman in her early 30s, standing relaxed and slightly turned, one hand resting at her collarbone, looking calmly past the camera. She wears an oversized charcoal wool blazer over a charcoal knit column dress and simple black loafers; hair in a low sleek bun, dewy natural skin. Plain warm greige limewash wall behind her with soft diagonal window-light shadows falling across it, concrete floor. Subject centred, whole body fits within the middle 45% of the frame width, head near the top fifth, generous empty wall on both sides. 35mm film, soft natural light, muted stone and charcoal palette, subtle grain, real skin texture. Vertical 2:3. No text, no logos.

**FOUNDER-01**
Head-and-shoulders editorial portrait of an Asian woman in her late 30s, the founder of a skin atelier, sleek dark hair pulled back in a low bun, small gold stud earrings, wearing a tailored black blazer over a cream knit top, calm confident half-smile, looking straight into the camera. Plain greige wall background with a soft diagonal window-light shadow, light from the left. Face centred, eyes about 40% from the top, nothing important near the corners. 35mm film, natural skin texture with visible pores, muted warm palette. Square 1:1. No text.

**FOUNDER-BG-M**
Dark low-key still life for a background: dried pampas and white ranunculus flowers in a matte ceramic vase, two unlabelled amber glass dropper bottles and a folded rust linen towel on a travertine ledge, deep charcoal shadowy wall. Detail concentrated at the top and bottom of the frame, a calm dark empty zone in the middle. Moody, soft single window light, shallow depth of field. Vertical 9:16. No text, no labels.

**FOUNDER-BG-D**
Dark low-key still life for a wide background: white ranunculus and dried pampas in a matte ceramic vase, unlabelled amber dropper bottles, a folded rust linen towel on a long travertine ledge, deep charcoal wall. The left third of the frame is almost empty and dark; the objects sit in the right two-thirds. Moody soft window light, shallow depth of field. Horizontal 3:2. No text, no labels.

**SVC-01 Hydra Glow Facial**
A Chinese Malaysian woman lying on a treatment bed with a white towel headband, eyes closed, while a therapist in white nitrile gloves brushes a clear hydrating gel mask onto her cheek with a flat brush. Linen bedding, greige limewash wall, soft window light. Close to medium shot, subject centred. Editorial 35mm, calm, muted stone palette, real skin texture. Vertical 3:4. No text.

**SVC-02 Clear Skin Facial**
A Malay woman in her 20s with mild visible acne on her chin lying back on a treatment bed, towel headband, while a gloved therapist examines her skin under a round magnifying lamp. Calm minimal treatment room, greige walls, soft daylight. Subject centred. Editorial 35mm, muted palette, honest real skin texture. Vertical 3:4. No text.

**SVC-03 Barrier Repair Ritual**
Close-up of a therapist's hands gently pressing and massaging a facial oil into a relaxed Indian Malaysian woman's cheek and jawline, her eyes closed. Cream linen, soft window light raking across the face. Subject centred. Editorial 35mm, warm muted palette, dewy real skin. Vertical 3:4. No text.

**SVC-04 Deep Pore Cleanse**
A treatment bed dressed in cream linen with a white facial steamer releasing a soft plume of mist, a folded rust towel and a small ceramic bowl on a travertine side table, greige limewash wall with diagonal window shadows. No people. Subject centred. Editorial interior photography, 35mm, calm and minimal. Vertical 3:4. No text.

**SVC-05 Brow Embroidery**
Close-up of a woman lying with eyes closed while a gloved therapist maps her eyebrows with a thin white mapping string and a fine pencil before brow embroidery. Clean, clinical but warm, soft daylight, greige background. Face and brows centred. Editorial 35mm, real skin texture. Vertical 3:4. No text.

**SVC-06 Lash Lift & Tint**
Extreme close-up of a woman's closed eye during a lash lift, her natural lashes curled upward over a soft silicone shield, a gloved hand holding a fine lash tool nearby. Soft window light, muted warm skin tones. Eye centred. Editorial beauty macro, 35mm film look. Vertical 3:4. No text.
