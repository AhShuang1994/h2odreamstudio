---
version: "alpha"
name: "Magic Rings - Resonance Hero"
description: "Magic Rings Hero Section is designed for introducing a product with clear above-the-fold messaging. Key features include headline hierarchy, supporting copy, and a primary call-to-action. It is suitable for homepage hero areas and campaign landing pages."
colors:
  primary: "#6366F1"
  secondary: "#818CF8"
  tertiary: "#A5B4FC"
  neutral: "#121214"
  background: "#121214"
  surface: "#060608"
  text-primary: "#FFFFFF"
  text-secondary: "#A5B4FC"
  border: "#FFFFFF"
  accent: "#6366F1"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: "72px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "18px"
    fontWeight: 300
    lineHeight: "28px"
  label-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.025em"
    textTransform: "uppercase"
spacing:
  base: "4px"
  sm: "4px"
  md: "7.2px"
  lg: "12px"
  xl: "16px"
  gap: "8px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Minimal

## Colors

The color system uses dark mode with #6366F1 as the main accent and #121214 as the neutral foundation.

- **Primary (#6366F1):** Main accent and emphasis color.
- **Secondary (#818CF8):** Supporting accent for secondary emphasis.
- **Tertiary (#A5B4FC):** Reserved accent for supporting contrast moments.
- **Neutral (#121214):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #121214; Surface: #060608; Text Primary: #FFFFFF; Text Secondary: #A5B4FC; Border: #FFFFFF; Accent: #6366F1

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 72px, weight 400, line-height 72px, letter-spacing -0.025em.
- **Body (`body-md`):** Inter, 18px, weight 300, line-height 28px.
- **Labels (`label-md`):** Inter, 12px, weight 500, line-height 16px, letter-spacing 0.025em, uppercase.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 7.2px, 12px, 16px, 18px, 24px
- **Gaps:** 8px, 24px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #6366F1
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.5) 0px 10px 15px -3px, rgba(0, 0, 0, 0.5) 0px 4px 6px -4px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(129, 140, 248, 0.8) 0px 0px 8px 0px
- **Blur:** 12px, 4px

## Shapes

Shapes rely on a tight radius system anchored by 12px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 12px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Component styling should inherit the shared button, icon, spacing, and surface rules instead of inventing one-off treatments. Favor a small family of repeatable patterns for actions, content containers, and fields.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 12px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 300ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on color and stroke changes. Scroll choreography uses GSAP ScrollTrigger and Parallax for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 300ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** color, stroke

**Scroll Patterns:** gsap-scrolltrigger, parallax

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, renderer, alpha, antialias, dpr clamp, custom shaders. The effect should read as retro-futurist, technical, and meditative: fine line lattice with green on black and sparse spacing. Build it from line trails + sparse anchors so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve reduced motion + dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Fine line lattice
  - **Primitives:**
    - **Value:** Line trails + sparse anchors
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, Renderer, alpha, antialias, DPR clamp, custom shaders

**Techniques:** Perspective grid, Line lattice, Breathing pulse, Pointer parallax, Shader gradients

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <canvas width="2116" height="1231" style="display: block; width: 2116px; height: 1231px;"></canvas>
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- Magic Rings Integration ---
      const vertexShader = `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `;
      ```
  - **Draw call:**
    - **Language:** js
    - **Snippet:**
      ```
      const fragmentShader = `
      precision highp float;

      uniform float uTime, uAttenuation, uLineThickness;
      uniform float uBaseRadius, uRadiusStep, uScaleRate;
      uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
      uniform float uFadeIn, uFadeOut;
      uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
      ```

## ThreeJS

Reconstruct the Three.js layer as a full-bleed background field with layered spatial depth that feels retro-futurist and technical. Use alpha, antialias, dpr clamp renderer settings, orthographic projection, plane geometry, shadermaterial materials, and ambient + key + rim lighting. Motion should read as timeline-led reveals, with reduced motion + non-3d fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field with layered spatial depth
  - **Render:**
    - **Value:** alpha, antialias, DPR clamp
  - **Camera:**
    - **Value:** Orthographic projection
  - **Lighting:**
    - **Value:** ambient + key + rim
  - **Materials:**
    - **Value:** ShaderMaterial
  - **Geometry:**
    - **Value:** plane
  - **Motion:**
    - **Value:** Timeline-led reveals

**Techniques:** Shader materials, Timeline beats, alpha, antialias, DPR clamp, Reduced motion + non-3D fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <canvas width="2116" height="1231" style="display: block; width: 2116px; height: 1231px;"></canvas>
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- Magic Rings Integration ---
      const vertexShader = `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `;
      ```
  - **Draw call:**
    - **Language:** js
    - **Snippet:**
      ```
      const fragmentShader = `
      precision highp float;

      uniform float uTime, uAttenuation, uLineThickness;
      uniform float uBaseRadius, uRadiusStep, uScaleRate;
      uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
      uniform float uFadeIn, uFadeOut;
      uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
      ```
