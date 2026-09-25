---
version: "alpha"
name: "WJ & ML — Protocol Archive"
description: "Protocol Archive Feature Section is designed for highlighting product capabilities and value points. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#EF4444"
  secondary: "#F87171"
  tertiary: "#FEE2E2"
  neutral: "#FFFFFF"
  background: "#FDFCFB"
  surface: "#EF4444"
  text-primary: "#DC2626"
  text-secondary: "#EF4444"
  accent: "#EF4444"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "128px"
    fontWeight: 400
    lineHeight: "128px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: "22.75px"
  label-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  md: "0px"
  full: "9999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  gap: "8px"
  card-padding: "8px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "16px"
  button-link:
    textColor: "#B91C1C"
    rounded: "{rounded.md}"
    padding: "0px"
  card:
    rounded: "{rounded.md}"
    padding: "32px"
---

## Overview

The design follows a clinical, archival aesthetic titled Protocol Archive. It balances a high-tech "system log" atmosphere with organic, warm materiality. The visual logic is built on the concept of a digital dossier or laboratory record, utilizing a strict grid, systematic labeling, and layered transparency. The mood is precise, architectural, and sophisticated, characterized by ultra-tight typography contrasted with expansive whitespace and archival red accents.

- **Mood:** Preserve a design, follows, clinical, archival, aesthetic, titled tone rather than defaulting to a generic SaaS look.

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses light mode with #EF4444 as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#EF4444):** Main accent and emphasis color.
- **Secondary (#F87171):** Supporting accent for secondary emphasis.
- **Tertiary (#FEE2E2):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FDFCFB; Surface: #EF4444; Text Primary: #DC2626; Text Secondary: #EF4444; Accent: #EF4444

- **Gradients:** bg-gradient-to-br from-red-50/10 to-transparent, bg-gradient-to-b from-transparent to-red-50/40, bg-gradient-to-b from-red-200 to-transparent

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 128px, weight 400, line-height 128px, letter-spacing -0.05em.
- **Body (`body-md`):** Inter, 14px, weight 300, line-height 22.75px.
- **Labels (`label-md`):** Inter, 16px, weight 400, line-height 24px.

## Layout

The layout is governed by a 12-column grid system with a maximum width of 1600px.
- Section Rhythm: Large sections typically use a 3-column (sidebar) and 9-column (content) split.
- Spacing Cadence: Heavy use of p-6 to p-16 (24px to 64px) to create breathing room between dense data blocks.
- Grid Logic: Horizontal sections are often divided into 50vh or 80vh minimum heights to ensure a cinematic, full-page experience.
- Image Patterns: Asymmetric masonry-style grids for asset libraries, utilizing aspect-3/4 for consistency.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- **Section padding:** 24px, 32px, 48px, 64px
- **Card padding:** 8px, 12px, 24px, 32px
- **Gaps:** 8px, 12px, 16px

## Elevation & Depth

Depth is achieved through glassmorphism and specialized border treatments rather than heavy drop shadows.
- Surface Recipe: Backgrounds use bg-white/40 or bg-[#FDFCFB]/80 with backdrop-blur-sm.
- Border Feel: A signature "Gradient Border" is used on all containers: a 1px transparent border combined with a background-clip of padding-box and border-box, using a red-tinted linear gradient for the stroke.
- Shadow Character: Soft, low-density shadows such as shadow-[0_16px_40px_-12px_rgba(200,190,180,0.5)] are used only for the primary global container.
- Layering: The Z-axis is defined by a mix-blend-multiply overlay of background "Aura" assets (grainy gradients or abstract photography) behind the grid content.

The system uses a hierarchy of soft, organic radii to contrast the clinical text.
- Main Container: 2rem to 2.5rem (32px to 40px) rounded corners.
- Cards & Frames: 1.5rem to 2rem (24px to 32px) for internal content modules and image wrappers.
- Interactive Elements: Full pills (rounded-full) for buttons, status badges, and navigation chips.
- Icons: Thin-stroke (1.5px) linear geometry from the Solar icon set, typically housed in circular containers.

- Status Indicators: 1.5w/1.5h rounded-full dots (red-400 or red-500) that prefix all section headers and status messages.
- Archival Cards: White-backed frames with 1px gradient borders, containing grayscale-to-color transition images and metadata footers (e.g., "Fig. 01").
- System Header: A transparent, multi-column utility bar that pins to the top of the container, housing time stamps and log IDs.
- Navigation Chips: Small, rounded-full badges with backdrop blurs and pulse animations for "live" status updates.
- Execution Button: A high-contrast red pill with an arrow icon and a specific orange-tinted shadow for calls to action.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(200, 190, 180, 0.5) 0px 16px 40px -12px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 4px 16px -4px
- **Blur:** 4px, 12px, 2px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 12px padding and a 32px radius. Drive the shell with linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255)), linear-gradient(135deg, rgba(248, 113, 113, 0.3), rgba(0, 0, 0, 0)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 12px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 12px, 16px, 24px, 32px, 40px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #EF4444, text #FFFFFF, radius 9999px, padding 16px, border 0px solid rgb(229, 231, 235).
- **Links:** text #B91C1C, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Cards and Surfaces
- **Card surface:** background rgba(253, 252, 251, 0.8), border 0px solid rgb(229, 231, 235), radius 0px, padding 32px, shadow none, blur 4px.
- **Card surface:** background rgba(253, 252, 251, 0.8), border 0px solid rgb(229, 231, 235), radius 0px, padding 64px, shadow none, blur 4px.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 12px, 16px, 24px, 32px, 40px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected expressive motion intensity without a deliberate reason.

## Motion

The motion system is built on GSAP and ScrollTrigger, focusing on reveal-masking and settling effects. - Text Reveals: Use a "Reveal-Up" pattern where lines or words are wrapped in overflow-hidden containers and translated from y: 100% to 0% with power4.out easing (1.2s duration). - Hero Stagger: Hero titles use a word-by-word stagger of 0.1s to build the header sequentially. - Image Settle: Images enter with a combination of opacity: 0 to 1 and scale: 1.05 to 1.0, using expo.out (2s duration) for a "soft landing" effect. - Hover States: Images transition from grayscale (mix-blend-multiply) to full color with a subtle scale-down on hover. - Ambient Animation: Status dots utilize a infinite pulse animation to indicate "System Nominal" states.

**Motion Level:** expressive

**Durations:** 700ms, 150ms, 2000ms, 1000ms, 300ms

**Easings:** ease, 0, 1), cubic-bezier(0.4, 0.2, 0.6

**Hover Patterns:** opacity, color, shadow

**Scroll Patterns:** gsap-scrolltrigger
