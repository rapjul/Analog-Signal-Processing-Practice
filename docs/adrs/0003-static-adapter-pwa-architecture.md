---
status: accepted
date: 2026-08-10
decision-makers: [development-team]
consulted: []
informed: []
---

# 3. Adopt Static Site Adapter and Progressive Web App Architecture

## Context and Problem Statement

SignalLab is intended as a client-side practice suite for students and engineers studying analog signal processing. The application should work seamlessly offline (on tablets, laptops, and smartphones) without requiring a paid server backend or persistent internet connection.

## Decision Drivers

- High availability and offline access (study anywhere without network connectivity).
- Low hosting cost and simple deployment (static CDN hosting like GitHub Pages, Cloudflare Pages, or Netlify).
- Fast initial page load times and responsive performance.

## Considered Options

- **Option 1**: Full-stack Node.js / SvelteKit server-rendered application with dynamic SSR database backend.
- **Option 2**: Single-page app using SvelteKit with `@sveltejs/adapter-static` and offline Service Worker caching via `vite-plugin-pwa`.

## Decision Outcome

Chosen Option: **Option 2**, because compiling the application as a pre-rendered static site with service worker PWA caching ensures 100% client-side execution, zero server hosting costs, and full offline usability.

### GitHub Pages deployment verification

The deployment workflow passes Pages metadata through `BASE_PATH` to SvelteKit and the PWA configuration. An empty value represents root hosting; `/Analog-Signal-Processing-Practice` represents the project site. Worker caching, manifest resources, and application links share that mount while the manifest identity stays stable.

Production smoke tests serve the emitted artifact through a static host restricted to that mount, with HTML file lookup and `404.html` fallback. PR verification covers root and project paths; deployment passes the same tests before artifact upload. Browser checks cover navigation, resource integrity, worker activation, and offline solver access. This makes the existing static/PWA hosting assumptions executable.

### Consequences

#### Good

- App can be installed as a PWA on mobile and desktop devices.
- Zero server maintenance overhead or database costs.
- All math calculations execute instantaneously in the browser.

#### Bad

- Server-side dynamic database storage is not available; local progress must be saved using IndexedDB (`idb`) or Web Storage.
