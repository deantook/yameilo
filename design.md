# Linear — Design System

> Source: https://linear.app
> Captured: 2026-06-26
> Pages analyzed: https://linear.app

## Overview
Linear’s homepage presents a dark-first, product-led visual language built around crisp typography, generous whitespace, and a restrained accent palette. The experience feels calm, modern, and technical: black and charcoal surfaces, white text, subtle gray-blue borders, and vivid blue/green/pink highlights for status and AI cues.

## Color
- Primary / brand
  - `#08090a` — dark theme background; used as the default canvas and high-contrast shell.
  - `#000000` / `#000` — pure black text and core UI chrome.
  - `#ffffff` / `#fff` — primary text on dark surfaces.
- Neutral / surface
  - `#f7f9f9`, `#fafafa`, `#eaeaea` — soft light surfaces used in lighter UI contexts.
  - `#15202b`, `#1e2732` — dark slate surfaces and panels.
  - `#829aab`, `#425364`, `#8b98a5` — muted gray-blue text and secondary UI strokes.
- Accent / semantic
  - `#1d9bf0` / `#1a8cd8` — primary blue for links, highlights, and active UI states.
  - `#00ba7c` — green for success or positive states.
  - `#f91880` — magenta/pink for attention or specialty states.
  - `#6bc9fb` — cyan/sky accent for AI or active-status moments.
- Notes
  - No obvious gradients are used; the system leans on flat fills and low-opacity overlays instead of dramatic color transitions.
  - Low-opacity overlays such as `#00000014`, `#00000020`, `#ffffff08`, and `#ffffff14` are used to create subtle depth without heavy shadows.

## Typography
- Font family: `InterVariable` is preloaded; the fallback stack is `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- Type scale: the extracted CSS surfaces compact UI sizes like `12px`, `13px`, `15px`, `.875rem`, and `.9375rem`, with larger title sizes exposed through CSS variables such as `var(--title-2-size)` and `var(--title-3-size)`.
- Font weights: `400` normal, `500` medium, `600` semibold, and `700` bold. The interface favors medium and semibold for labels and bold for emphasis.
- Line-height / letter-spacing: line-height and tracking are tokenized through values such as `var(--text-regular-line-height)`, `var(--title-2-line-height)`, `var(--text-regular-letter-spacing)`, and related title tokens, producing a compact but airy reading rhythm.

## Spacing & Shape
- Spacing is predominantly token-driven rather than hard-coded; the design system uses a consistent set of text and UI tokens such as `var(--text-regular-size)`, `var(--text-small-size)`, and `var(--title-*size)`.
- Common visible UI sizes include `12px`, `13px`, `15px`, `.875rem`, and `.9375rem`.
- The system favors soft, rounded forms over sharp corners. Cards and controls feel approachable and polished rather than boxy.
- Borders are thin and understated; muted gray-blue outlines are used sparingly to separate panels and components.

## Elevation & Shadow
- Depth is subtle and mostly implied by spacing, contrast, and low-opacity overlays rather than strong shadows.
- The interface rarely relies on heavy drop shadows; instead, it uses flat surfaces with thin borders and careful color contrast.
- When depth is needed, it is restrained and technical, helping the UI stay calm and premium.

## Layout
- The homepage uses a centered, content-first layout with generous vertical rhythm and clearly separated sections.
- Max-widths are tokenized through `var(--homepage-max-width)` and `var(--page-max-width)` instead of being baked into literal CSS values.
- Responsive breakpoints present in the extracted CSS include `640px`, `768px`, `1024px`, and `1280px`, indicating a mobile-first system with clear tablet and desktop adjustments.
- Common layout primitives include hero sections, text + media blocks, feature rows, and card-like panels.

## Components
- Buttons: high-contrast solid buttons on dark backgrounds, with subtle hover feedback and rounded corners.
- Cards / surfaces: panel-based composition with soft borders and a calm, almost editorial rhythm.
- Navigation: minimal top navigation with clear label hierarchy and strong contrast between active and passive states.
- Status / badges: color-coded chips using blue, green, pink, and cyan to signal AI, success, or attention states.

## Motion & Interaction
- Motion is subtle and purposeful; the site uses lightweight transitions rather than dramatic animation.
- Observed transition tokens include `color var(--speed-quickTransition)`, `var(--speed-regularTransition) ease`, and `opacity var(--speed-regularTransition)`.
- Hover and focus states feel fast and polished, with the goal of reinforcing hierarchy rather than drawing attention through spectacle.

## Tone & Style
- Aesthetic label: minimal, dark-first, product-led, and highly polished.
- Imagery style: mostly product UI screenshots and interface moments, with typography and layout doing the heavy lifting.
- Copy tone: confident, concise, and technical, with a strong “product system” narrative and a clear focus on speed, clarity, and AI-native workflows.
