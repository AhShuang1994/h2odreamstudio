---
version: "alpha"
name: "Remixed Resonance Hero"
description: "Remixed Resonance Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#10B981"
  secondary: "#3B82F6"
  tertiary: "#6EE7B7"
  neutral: "#000000"
  background: "#10B981"
  surface: "#000000"
  text-primary: "#FFFFFF"
  text-secondary: "#71717A"
  border: "#FFFFFF"
  accent: "#10B981"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: "72px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 300
    lineHeight: "16px"
  label-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  full: "9999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  gap: "8px"
  card-padding: "9px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "12px"
  button-secondary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "12px"
  card:
    rounded: "0px"
    padding: "24px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses dark mode with #10B981 as the main accent and #000000 as the neutral foundation.

- **Primary (#10B981):** Main accent and emphasis color.
- **Secondary (#3B82F6):** Supporting accent for secondary emphasis.
- **Tertiary (#6EE7B7):** Reserved accent for supporting contrast moments.
- **Neutral (#000000):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #10B981; Surface: #000000; Text Primary: #FFFFFF; Text Secondary: #71717A; Border: #FFFFFF; Accent: #10B981

- **Gradients:** bg-gradient-to-r from-emerald-500 to-blue-500 via-teal-500, bg-gradient-to-r from-transparent to-white/50

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 72px, weight 400, line-height 72px, letter-spacing -0.025em.
- **Body (`body-md`):** Inter, 12px, weight 300, line-height 16px.
- **Labels (`label-md`):** Inter, 14px, weight 500, line-height 20px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 6px, 8px, 12px, 16px, 20px, 24px, 32px
- **Section padding:** 24px
- **Card padding:** 9px, 24px
- **Gaps:** 8px, 12px, 16px, 32px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #10B981
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.8) 0px 25px 50px -12px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(16, 185, 129, 0.5) 0px 0px 10px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(59, 130, 246, 0.5) 0px 0px 10px 0px
- **Blur:** 12px, 24px

## Shapes

Shapes rely on a tight radius system anchored by 8px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 8px, 16px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #FFFFFF, text #000000, radius 9999px, padding 12px, border 0px solid rgb(229, 231, 235).
- **Secondary:** background #FFFFFF, text #FFFFFF, radius 9999px, padding 12px, border 1px solid rgba(255, 255, 255, 0.1).

### Cards and Surfaces
- **Card surface:** radius 0px, padding 24px, shadow none.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 8px, 16px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected expressive motion intensity without a deliberate reason.

## Motion

Motion feels expressive but remains focused on interface, text, and layout transitions. Timing clusters around 300ms and 150ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on color and transform changes. Scroll choreography uses GSAP ScrollTrigger and Parallax for section reveals and pacing.

**Motion Level:** expressive

**Durations:** 300ms, 150ms, 700ms, 2000ms

**Easings:** ease, cubic-bezier(0.4, 0, 1), 0.2, 0.6

**Hover Patterns:** color, transform

**Scroll Patterns:** gsap-scrolltrigger, parallax

## WebGL

Reconstruct the graphics as a 3d scene surface using webgl, renderer, alpha, antialias, dpr clamp, custom shaders. The effect should read as retro-futurist, technical, and meditative: fine line lattice with green on black and sparse spacing. Build it from line trails + sparse anchors so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** 3D scene surface
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
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Integration ---
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

Reconstruct the Three.js layer as a 3d scene surface with layered spatial depth that feels retro-futurist, volumetric, and technical. Use alpha, antialias, dpr clamp renderer settings, orthographic projection, plane geometry, shadermaterial materials, and ambient + key + rim lighting. Motion should read as slow orbital drift, with poster frame + dom fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** 3D scene surface with layered spatial depth
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
    - **Value:** Slow orbital drift

**Techniques:** Shader materials, Particle depth, Timeline beats, alpha, antialias, DPR clamp, Poster frame + DOM fallback

**Code Evidence:**
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Integration ---
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
