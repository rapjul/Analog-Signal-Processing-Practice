---
status: accepted
date: 2026-08-14
decision-makers: [development-team]
consulted: []
informed: []
---

# 11. Slide-Over Formula Reference Drawer Layout Architecture

## Context and Problem Statement

SignalLab originally embedded a permanent static "Formula Sheet" card in a side-by-side $2$-column layout across practice routes (`/odes`, `/fourier-series`, `/circuits`, `/convolution`).

This permanent sidebar layout created severe layout and usability drawbacks:

1. **Viewport Compression**: The sidebar occupied approximately $25\%$ of horizontal screen width at all times, compressing the primary problem workspace, math input controls, and canvas visualizers into a cramped column.
2. **Mobile and Tablet Degradation**: On smaller viewports, the $2$-column grid broke into an awkward stacked layout where formula sheets were pushed to the bottom of the screen.
3. **Redundant Visual Clutter**: Once a student was familiar with standard formulas, the static sheet continued to compete for visual attention without providing active utility.

## Decision Drivers

- Reclaim $100\%$ of the primary container width for clean, readable solver cards and interactive builders.
- Provide instant, on-demand access to formula references without navigating away from the active problem.
- Ensure seamless responsive design across desktop, tablet, and mobile screens.
- Centralize mathematical formula sheets across all domains (ODEs, Fourier Series, Laplace, Convolution, Circuits) into a unified reference utility.

## Considered Options

- **Option 1 (Retain Permanent 25% Sidebar Grid)**: Keep the static sidebar next to the solver workspace.
- **Option 2 (Inline Collapsible Accordions)**: Place formula reference accordions above or below the practice card.
- **Option 3 (Dedicated Formula Sheet Route)**: Move formulas to a standalone `/formulas` page.
- **Option 4 (Global Responsive Slide-Over Drawer)**: Implement an accessible, tabbed slide-over drawer (`FormulaDrawer.svelte`) triggered by a persistent `📖 Formula Reference` button in the navigation header bar.

## Decision Outcome

Chosen Option: **Option 4**, because it eliminates persistent screen clutter, reclaims full workspace width, and provides instant, non-disruptive access to formulas on any page.

### Layout & Responsive Sizing Specifications

1. **Desktop / Wide Viewports**: The drawer slides out smoothly from the right side of the screen, occupying approximately $1/3$ ($33.3\%$) of the viewport width with a subtle backdrop overlay.
2. **Mobile / Narrow Viewports**: The drawer expands to full ($100\%$) viewport width with a dedicated top close bar for frictionless thumb navigation.
3. **Global Header Trigger**: Accessible via a high-contrast `📖 Formula Reference` button in `Navigation.svelte`, accompanied by full keyboard shortcuts (`Esc` to dismiss, focus trapping within the active drawer).
4. **Domain Tabs**: Organized into clean tabbed sections:
    - _ODEs_: Roots, homogeneous templates, undetermined coefficients ansatz table, resonance rules, ZI/ZS definitions.
    - _Fourier Series_: Complex & trig formulas, symmetry vanishing shortcuts, Parseval power, Gibbs phenomenon.
    - _Transforms & Circuits_: Laplace transform tables, Fourier transform pairs, phasor relationships.

## Consequences

### Positive

- Reclaims full screen width for the primary interactive solver cards.
- Solves horizontal wrapping issues on complex mathematical expressions and multi-stage input grids.
- Provides a consistent, unified formula reference experience across all application modules.

### Negative / Trade-offs

- Formulas are no longer visible simultaneously alongside the problem without opening the drawer overlay.
- Requires maintaining focus trapping and accessibility states for the modal drawer.

### Neutral

- Mathematical equations inside the drawer continue to be rendered via `<MathBlock>` and `<MathInline>` with KaTeX.
