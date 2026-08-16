# System Architecture Guidelines

## Overview

SignalLab is an interactive, client-side web application for practicing Analog Signal Processing (ASP) concepts, solving differential equations, evaluating transforms (Laplace, Fourier, Z), and visualizing signals.

## Technical Stack

- **Framework**: SvelteKit 2 + Svelte 5 (Runes)
- **Adapter**: `@sveltejs/adapter-static` (Pre-rendered SPA/PWA)
- **PWA**: `vite-plugin-pwa` with offline caching
- **Math Engine**: `@cortex-js/compute-engine` for symbolic parsing, evaluation, and simplification
- **Typography & Rendering**: KaTeX (`katex`) via custom `<MathInline>` and `<MathBlock>` wrappers
- **Storage**: IndexedDB (`idb`) for offline progress tracking and user preferences

## Directory Structure

```
src/
├── app.css                 # Global theme variables & responsive base styles
├── app.html                # HTML entry document
├── lib/
│   ├── components/         # Modular Svelte components
│   │   ├── math/           # KaTeX wrappers & structured math input builders
│   │   └── ui/             # Reusable UI controls, cards, navigation
│   ├── math-engine/        # Core ASP solvers, symbolic evaluators, ODE engine
│   └── stores/             # Local state & persistent storage helpers
├── routes/                 # SvelteKit page routes (pre-rendered static routes)
```

## Architectural Design Principles

1. **Client-Side Autonomy**: All math computation, evaluation, and rendering occur entirely in the user's browser without backend API latency or external service dependencies.
2. **Input Friction Reduction**: Use domain-specific guided forms (piecewise Builders, ODE coefficient pickers, pole-zero pickers, phasor mode tabs) so users solve math concepts rather than debugging LaTeX syntax errors.
3. **Progressive Web App**: Ensure all practice tools operate offline via service worker caching.
