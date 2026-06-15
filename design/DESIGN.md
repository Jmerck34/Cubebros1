---
version: 1.0
name: Cubebros1
description: Polished dark-red / purple 2D MOBA-style UI system for a Three.js platform brawler.

colors:
  background: "#0B1020"
  panel: "rgba(14, 20, 36, 0.82)"
  panelElevated: "rgba(22, 30, 52, 0.90)"
  border: "rgba(255, 255, 255, 0.08)"
  primaryText: "#F4F7FB"
  secondaryText: "#A9B4C8"
  disabled: "#667089"
  success: "#41D98C"
  warning: "#FFC857"
  danger: "#FF5A6A"
  info: "#56B6FF"
  heroPrimary: "#7C5CFF"
  heroGlow: "#A78BFA"
  heroDark: "#5B3FE0"

typography:
  display:
    fontFamily: Orbitron
    fontSize: 36px
    fontWeight: 700
    letterSpacing: "0.06em"
  h2:
    fontFamily: Orbitron
    fontSize: 28px
    fontWeight: 700
    letterSpacing: "0.06em"
  hudStat:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 700
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
  helper:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500

spacing:
  micro: 4px
  tight: 8px
  compact: 12px
  standard: 16px
  section: 24px
  major: 32px
  menu: 48px

panel:
  backgroundColor: "{colors.panel}"
  borderColor: "{colors.border}"
  radius: 10px
  shadow: "0 8px 24px rgba(0, 0, 0, 0.35)"
  backdropBlur: "8px"

buttonPrimary:
  backgroundColor: "{colors.heroPrimary}"
  textColor: "{colors.primaryText}"
  borderColor: "{colors.heroGlow}"
  radius: "{panel.radius}"
  padding: 14px 24px
  hoverTransform: "translateY(-1px) scale(1.03)"
  glow: "0 0 18px rgba(124, 92, 255, 0.35)"

buttonSecondary:
  backgroundColor: "{colors.panelElevated}"
  textColor: "{colors.primaryText}"
  borderColor: "{colors.border}"
  radius: "{panel.radius}"
  padding: 12px 20px
  hoverTransform: "translateY(-1px)"

buttonDanger:
  backgroundColor: "{colors.danger}"
  textColor: "{colors.primaryText}"
  borderColor: "{colors.danger}"
  radius: "{panel.radius}"
  padding: 12px 20px

components:
  panel:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.border}"
    radius: "{panel.radius}"
    shadow: "{panel.shadow}"
    backdropBlur: "{panel.backdropBlur}"
  panelElevated:
    backgroundColor: "{colors.panelElevated}"
    borderColor: "{colors.heroGlow}"
    radius: "{panel.radius}"
    shadow: "{panel.shadow}"
  hudCluster:
    padding: "{spacing.compact}"
    radius: "{panel.radius}"
    borderColor: "{colors.border}"
    backgroundColor: "{colors.panel}"
    textColor: "{colors.primaryText}"
  toast:
    padding: "12px 16px"
    radius: "{panel.radius}"
    borderColor: "{colors.heroGlow}"
    backgroundColor: "{colors.panelElevated}"
    textColor: "{colors.primaryText}"
  buttonPrimary: "{buttonPrimary}"
  buttonSecondary: "{buttonSecondary}"
  buttonDanger: "{buttonDanger}"
  heroAccentBar:
    backgroundColor: "linear-gradient(90deg, {colors.heroDark}, {colors.heroPrimary}, {colors.heroGlow})"
    textColor: "{colors.primaryText}"
    radius: "{panel.radius}"
  healthBar:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.success}"
    borderColor: "{colors.border}"
    radius: "{panel.radius}"
  cooldownRing:
    borderColor: "{colors.heroGlow}"
    textColor: "{colors.primaryText}"
    backgroundColor: "{colors.panel}"
    radius: "{panel.radius}"

---

# Cubebros1 Design System

## Overview

Cubebros1 is a polished, dark-red / purple 2D MOBA-style UI system for a Three.js platform brawler. The visual language is **clean arcade sci-fi with playful blocky energy**. The design prioritizes high contrast, strong hierarchy, and subtle motion while keeping the 3D world dominant.

## Colors

- **Background (#0B1020):** Deep night blue base for the canvas and full-screen overlays.
- **Panel (rgba(14, 20, 36, 0.82)):** Main translucent panel for HUD clusters, menus, and modals.
- **Panel Elevated (rgba(22, 30, 52, 0.90)):** Focused menus, active tabs, and raised UI.
- **Border (rgba(255, 255, 255, 0.08)):** Thin subtle strokes around panels and buttons.
- **Primary Text (#F4F7FB):** Main readable UI copy.
- **Secondary Text (#A9B4C8):** Labels, hints, disabled copy, and metadata.
- **Disabled (#667089):** Inactive buttons and controls.
- **Success (#41D98C):** Rewards, health recovery, positive feedback.
- **Warning (#FFC857):** Cautions, low-health alerts, and soft warnings.
- **Danger (#FF5A6A):** Damage, destructive actions, and critical alerts.
- **Info (#56B6FF):** Objective text, neutral status, and informational overlays.
- **Hero Primary (#7C5CFF):** Main accent color for active states, selected items, and hero-specific feedback.
- **Hero Glow (#A78BFA):** Lighter glow variant for focus rings and hover states.
- **Hero Dark (#5B3FE0):** Darker variant for gradients and shadows.

## Typography

- **Display (Orbitron 36px 700):** Major titles, menu headings, and hero names.
- **H2 (Orbitron 28px 700):** Section titles and menu subtitles.
- **HUD Stat (Inter 22px 700):** Health, score, timer, and key status indicators.
- **Body (Inter 16px 500):** Buttons, labels, and readable copy.
- **Helper (Inter 13px 500):** Tooltips, small labels, and metadata.

Use **uppercase only for short labels and tabs**. Prefer sentence case for longer text.

## Layout & Spacing

Use an **8px base grid**.

- **4px micro:** Icon gaps and tiny internal padding.
- **8px tight:** Compact panel inner padding.
- **12px compact:** Section spacing inside panels.
- **16px standard:** Default inner padding for HUD clusters and buttons.
- **24px section:** Vertical gap between unrelated HUD clusters.
- **32px major:** Separation between top-level menu sections.
- **48px+ menu:** Outer padding for full-screen menus.

## Elevation & Depth

- **Panel:** translucent dark panel, 1px border, 10px radius, soft shadow.
- **Panel Elevated:** darker panel, brighter border, slightly deeper shadow.
- **Modal Overlay:** full-screen dark overlay with backdrop blur.
- **HUD Cluster:** compact translucent panel with subtle border.
- **Toast:** elevated panel with hero-accent border.

## Shapes

- **Panel radius:** 10px.
- **Button radius:** 10px.
- **Icon stroke weight:** 2px.
- **Health bar:** 10px radius, segmented fill.
- **Cooldown ring:** 10px radius, hero-accent border.

## Components

- **Panel:** translucent dark panel with 1px border and soft shadow.
- **Panel Elevated:** darker panel with brighter border.
- **HUD Cluster:** compact panel for grouped status indicators.
- **Toast:** elevated panel with hero-accent border.
- **Button Primary:** hero-color fill, white text, subtle glow on hover.
- **Button Secondary:** dark panel fill with brighter border.
- **Button Danger:** red accent reserved only for destructive actions.
- **Hero Accent Bar:** gradient from hero dark to hero primary to hero glow.
- **Health Bar:** danger background, success fill, segmented visual.
- **Cooldown Ring:** hero-accent border, dark fill.

## Do's and Don'ts

### Do
- Keep the 3D world dominant.
- Use hero color only for active states, selected items, and hero-specific feedback.
- Keep UI text readable in under 1 second.
- Use subtle motion (120-300ms) with ease-out timing.
- Maintain high contrast and strong hierarchy.
- Use shape-based indicators to avoid color overload.
- Keep menus structured and focused.

### Don't
- Use hero color on every element at once.
- Overload the screen with too many animations.
- Use heavy blur that harms readability.
- Place critical information behind busy backgrounds.
- Use continuous strobe effects for warnings.
- Make every panel the same size and spacing.

## Implementation Notes

- Use CSS custom properties for palette and spacing tokens.
- Build reusable classes: `.panel`, `.panel--elevated`, `.hud-cluster`, `.toast`, `.btn--primary`, `.btn--secondary`, `.btn--danger`.
- Keep HUD layers separated by z-index tiers: gameplay HUD, transient notifications, modal overlays, full-screen menus.
- Use `clamp()` for responsive type and spacing.
- Use `backdrop-filter: blur(8px)` only where performance is safe.
- Keep focus outlines visible for accessibility.
