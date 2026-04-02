# Rebranding MediMate UX/UI to the "Backend" Identity

This plan outlines the steps required to completely overhaul the MediMate platform's design to adopt the "Backend" brand identity. The goal is to migrate from a rounded, bright generic health app design to a highly technical, precise, and structural design using the "Backend" design concepts (Ink Black, Terminal Green, strict grid-based geometry).

## User Review Required

> [!WARNING]
> This redesign will significantly depart from the typical standard "health" web design. We will adopt the strict grid, "hacker/terminal" developer aesthetic from the `Backend` brand specification. Elements like pills and glowing hearts will be replaced with technical elements (modules, data layers, nodes) and colors will shift entirely to Ink Black, Terminal Green, System Blue, and Slate Grey.
>
> **Questions for the user:**
> 1. Should we completely rebrand the platform name to "BACKEND" instead of "MediMate," or keep the name "MediMate" but purely apply the aesthetic styling?
> 2. Should we update the icon emojis (e.g., 💊, 🌿) to more technical or geometric characters from the brand spec (⬡, ◇, ⊞)?

## Proposed Changes

We will refactor the CSS and adjust HTML structure across the app.

---

### Global Design Tokens
We will inject the new CSS design tokens globally into `styles.css` (primary stylesheet) and `landing.css` and remove any conflicting variables.

#### [MODIFY] `styles.css`, `landing.css`, `admin.css`, `caretaker.css`, `dashboard.css`
- **Colors:**
  - Ink Black (`#0D0D0D`)
  - Terminal Green (`#00C896`)
  - System Blue (`#1A6FFF`)
  - Slate Grey (`#4A5568`)
  - Cloud White (`#F4F6F9`)
- **Typography:**
  - Import Google Fonts `DM Sans` and `Space Mono`.
  - Use `Space Mono` for headings, code callouts, logs, navigation, and badges.
  - Use `DM Sans` for body copy and general UI text.
- **Geometry & Shape:**
  - Remove rounded borders (`border-radius: 12px/24px` -> `2px` or `0px`).
  - Add sharp, solid borders with subtle border rules (`rgba(0, 200, 150, 0.2)`).
  - Use sharp dropshadows or eliminate default generic softness.

---

### Landing Page Overhaul

#### [MODIFY] `landing.html` & `landing.css`
- Eliminate the 3D glowing pill animation.
- Introduce the new grid-background, high-contrast dark theme (Ink Black background).
- Replace "start now" and tags with strict geometric boxes and terminal accents.
- Change the header logo to text-based "BACKEND" and optionally the geometric mark.

---

### Application Dashboards Overhaul

#### [MODIFY] `index.html` (Patient/Auth), `admin.html`, `caretaker.html`
- **Auth Screen:** Redesign the login/register card with an Ink Black aesthetic and Terminal Green focus highlights. Ensure error messages use appropriate contrast states.
- **Dashboard Structure:**
  - Convert the sidebar navigation to a sharp-edged module system.
  - Change "card" components to match the `card` designs defined in our showcase (rigid borders, bottom accent lines using gradients).
  - Update any status indicators and badges to use standard "Backend" variants.
  - If we decide to eliminate the emojis, substitute them with data/node-based glyphs (e.g. `[ STATUS ]`).

## Verification Plan

### Automated Tests
- Run `python3 -m http.server 8080` locally.
- Use the Browser tool to navigate to the landing page, login page, and dashboard.

### Manual Verification
- Verify high contrast readability and strict grid geometry.
- Check all 4 views (Landing, Admin, Caretaker, Main User App) across a local server view.
