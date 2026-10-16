# Development & Testing Guide

This guide provides technical instructions for developing, testing, and maintaining **SignalLab**.

---

## 🛠️ Prerequisites & Setup

- **Node.js**: `22.x` from `v22.22.1`, or `v24.12.0` and higher (`24.x` is recommended for the resolved dependencies).
- **Package Manager**: `npm` (v10+)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd "Analog Signal Processing Practice"

# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev
```

---

## 📜 Available Scripts

| Command                          | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                    | Starts the Vite development server with hot module replacement (HMR).    |
| `npm run build`                  | Builds the static production application via `@sveltejs/adapter-static`. |
| `npm run preview`                | Previews the production build locally.                                   |
| `npm run check`                  | Runs `svelte-check` against the TypeScript configuration.                |
| `npm run check:watch`            | Runs `svelte-check` in watch mode during development.                    |
| `npm test`                       | Runs the full Vitest unit and component test suite.                      |
| `npm run test:unit`              | Starts Vitest in interactive watch mode.                                 |
| `npm run test:coverage`          | Generates a V8 code coverage report.                                     |
| `npm run test:e2e`               | Executes Playwright end-to-end integration tests.                        |
| `npm run test:e2e:screenshots`   | Captures full-page visual regression screenshots across all viewports.   |
| `npm run test:e2e:solvers`       | Compares deterministic solver states with local visual baselines.        |
| `npm run capture:solvers`        | Captures the complete solver visual matrix and rebuilds its gallery.     |
| `npm run capture:solvers:dark`   | Captures the full solver matrix in dark mode only.                       |
| `npm run capture:solvers:quick`  | Captures only dark mode with all available hints shown; skips tablet.    |
| `npm run gallery:solvers`        | Rebuilds the solver gallery from the current-run manifest.               |
| `npm run benchmark:solvers -- …` | Runs and archives one read-only solver visual benchmark repetition.      |
| `npm run capture:screenshots`    | Captures viewport-framed ($1280 \times 800$) screenshots for the README. |
| `npm run test:all`               | Runs both the unit test suite and Playwright E2E tests.                  |
| `npm run lint:imports`           | Checks import statement ordering with Biome.                             |
| `npm run format:imports`         | Auto-sorts and organizes imports with Biome.                             |
| `npm run format`                 | Formats all code and markdown files with Prettier.                       |
| `npm run format:check`           | Verifies code formatting compliance with Prettier.                       |

---

## 🏗️ Architecture Overview

SignalLab is an offline-first, client-side Intelligent Tutoring System (ITS) built with:

- **Framework**: SvelteKit 2 with Svelte 5 Runes (`$state`, `$derived`, `$props`, `$effect`).
- **Mathematical Engine**: `@cortex-js/compute-engine` for symbolic algebra and AST normalization.
- **Formula Typesetting**: `KaTeX` with custom `<MathInline>` and `<MathBlock>` wrappers.
- **Client-Side State**: Theme preferences use `localStorage` when available. Solver sessions reset on reload; the practice-history utility is currently an in-memory API and is not connected to the solver UI.
- **PWA Capabilities**: `vite-plugin-pwa` with service worker asset caching.

---

## 🧪 Testing Strategy

SignalLab uses a multi-layered testing architecture to ensure mathematical precision, UI reactivity, and accessibility.

### 1. Dual-Runtime Vitest Suite (ADR 0025)

The project leverages a dual-environment configuration in `vitest.config.ts` to optimize speed and DOM fidelity:

- **Pure Node Environment (`tests/unit/*.test.ts` and source tests)**:
    - Tests mathematical algorithms, polynomial solvers, differential equation models, and Fourier coefficient computations.
    - Runs in pure Node.js for maximum execution speed without DOM overhead.
- **JSDOM Environment (`tests/unit/components/**/*.test.ts` and source Svelte tests)**:
    - Tests Svelte 5 UI components using `@testing-library/svelte`.
    - Validates user input handling, hint expansion, feedback alerts, and button focus states.

```bash
# Run unit and component tests once
npm test

# Run tests in watch mode
npm run test:unit

# Generate code coverage
npm run test:coverage
```

### 2. AST Mathematical Normalization Testing

Student inputs can take multiple mathematically equivalent forms (e.g. `e^{-2t}`, `exp(-2*t)`, `\frac{1}{2}`, `0.5`).

All input evaluators normalize expressions into abstract syntax trees (AST) before comparison. When adding or modifying problem sets, include test cases covering:

- Standard shorthand notation (omitted multiplication `2t`, bare exponentials `e^-t`).
- Fractional vs decimal representations.
- Equivalent algebraic groupings.
- Invalid syntax handling and graceful error messages.

### 3. Playwright End-to-End (E2E) Suite

Playwright tests run against a dedicated web server instance on port `33210`:

```bash
# Run all end-to-end tests
npm run test:e2e

# Run with interactive UI mode
npx playwright test --ui
```

To test the production output, build first and then use the preview-server configuration:

```bash
npm run build
npm run test:e2e:production
npm run test:e2e:production:solvers
```

To verify service worker precaching and offline navigation through the three implemented stepped solvers, run `SIGNALLAB_TEST_OFFLINE=1 npx playwright test --config playwright.production.config.ts tests/e2e/solver-offline.spec.ts`. The offline case is skipped in development runs because development assets are not precached, and in WebKit because of its [offline-emulation navigation defect](https://github.com/microsoft/playwright/issues/42775). `tests/e2e/solver-audit-regressions.spec.ts` verifies keyboard theme switching and 320-pixel layouts when browser storage is blocked.

The production worker explicitly precaches the served root app shell because static HTML is emitted after worker generation. Its revision hashes the HTML template and emitted asset revisions to keep the document and bundled assets in sync; navigation fallback serves that shell when visiting solver routes offline.

Production runs require port `33210` to be free and never reuse a running development server. Functional tests tagged `@dev-harness` are excluded because their state-selection helpers are available only in development builds; the development suite still runs them. The production solver visual command compares initial problem pages across all configured viewports and both themes, using existing local baselines without updating them. Later solver states still require `npm run test:e2e:solvers`.

Development visual runs disable hot reload and verify the requested active step before capturing its image. Reproducible Fourier visual fixtures include explicit URL seeds, so development and production compare the same problems against shared baselines. Full-page captures reset scrolling and keep the sticky harmonic toolbar in normal flow to avoid compositor pixel jitter; the live site's sticky behavior is unchanged.

The E2E suite tests:

- **Module Workflows**: Full step-by-step problem completion across all 6 practice modules.
- **Accessibility**: Keyboard navigation (`Tab` / `:focus-visible`), ARIA attributes, and live regions (`tests/e2e/accessibility.spec.ts`).
- **Theme Switching**: Dark and light mode rendering and persistence (`tests/e2e/navigation-and-theme.spec.ts`).
- **PWA & Asset Caching**: Service worker registration and offline asset availability (`tests/e2e/pwa-and-assets.spec.ts`).

### 4. Visual Screenshot Suite

Automated screenshots across Desktop (`1920x1080`), Laptop (`1280x800`), Tablet (`768x1024`), and Mobile (`375x812` / `320x568`) can be generated via:

```bash
# Capture full-page multi-device regression screenshots (in tests/e2e/screenshots/)
npm run test:e2e:screenshots

# Capture curated viewport-framed (1280x800) assets for README.md (in docs/assets/screenshots/)
npm run capture:screenshots
```

Use the stepped-solver visual suite as follows when visually checking every solver:

```bash
# First run, or when intentionally accepting current visuals:
# generate/update the local baselines, current-run artifacts, and inspection gallery
npm run capture:solvers

# Faster comprehensive check using only dark mode
npm run capture:solvers:dark

# Fastest curated check: dark mode with all available hints shown; no tablet
npm run capture:solvers:quick

# Later runs: compare every named solver state against the existing local baselines
# without rewriting the gallery artifacts
npm run test:e2e:solvers

# Rebuild only the HTML gallery from the most recent current-run manifest
npm run gallery:solvers
```

Every named ODE and Fourier state, plus an automatically derived all-hints variant for every step and conditional sub-step, is compared at desktop and narrow-mobile widths in dark mode. The suite discovers those states from the developer harness, expands each hint sequence to its final tier, verifies that the hint content is visible, and captures it without requiring a second manually maintained scenario list. Initial, representative diagnostic, and completed full-page milestones cover all three viewports in both themes.

The solver gallery is focused on the problem-solving interface, so the Playwright suite hides the application navbar only inside the visual-capture page. Production and normal development rendering are unchanged. Milestones remain full-page captures, while named steps and sub-steps capture the active step card. Each loaded solver page is also checked for document-level horizontal overflow at its configured viewport, including narrow mobile. Artifact-generating capture commands warn and continue so existing layout problems remain available in a complete inspection gallery; `npm run test:e2e:solvers` treats the same overflow as a regression failure.

The `dark` profile keeps every named state and milestone but omits light-mode milestones. The `quick` profile omits the tablet viewport, keeps dark-mode desktop and narrow-mobile milestones, and captures only explicit hint states and automatically derived all-hints variants from the stepped solvers. The gallery builds its viewport options and coverage text from that smaller manifest, so a quick gallery does not offer a tablet filter or claim tablet coverage. These profiles replace the current-run gallery manifest with the subset they captured; run the full command again when you need the complete gallery.

The process is both automated and deterministic: automation enumerates the live state catalog and hint variants, while stable problem seeds, explicit canvas readiness markers, and harness-driven state preparation make repeated images comparable. Local baselines live in `tests/e2e/solver-visual-baselines/` and are git-ignored, so each developer or CI environment must run `npm run capture:solvers` once before comparison runs. Git-ignored current-run artifacts and `manifest.json` live in `tests/e2e/screenshots/solvers/current/`. The gallery at `tests/e2e/screenshots/solvers/index.html` reads only that manifest, so artifacts from older runs cannot appear as current coverage.

Artifact-generating runs also write `tests/e2e/screenshots/solvers/current/timings.json` with phase totals, complete suite time, and unattributed time. Snapshot-update captures reuse Playwright's accepted baseline PNG for the inspection artifact; comparison runs keep a separate artifact screenshot. The suite reuses one page per archetype by default after three counterbalanced benchmark cycles; set `SIGNALLAB_VISUAL_PAGE_MODE=isolated` to request the original fresh-page behavior. See [Solver visual capture performance](./solver-visual-performance.md) for the preservation scheme, benchmark command, timing waterfalls, and measured results.

---

## GitHub Pages artifact verification

Configure **Settings → Pages → Source → GitHub Actions** once before deployment. The build reads Pages metadata with `pages: read` and passes `base_path` as `BASE_PATH`. Deployment permissions remain exclusive to the dependent deploy job. PR smoke jobs supply their own base paths and need only `contents: read`.

Use Node.js `24.x` for the native TypeScript static test host. Install Chromium once, then build and test each hosting shape with the same `BASE_PATH` for both commands:

```bash
npx playwright install chromium

# Root hosting (also the default when BASE_PATH is unset).
BASE_PATH='' npm run build
BASE_PATH='' npm run test:pages

# GitHub Pages project URL.
BASE_PATH=/Analog-Signal-Processing-Practice npm run build
BASE_PATH=/Analog-Signal-Processing-Practice npm run test:pages
```

`npm run test:pages` uses `./playwright.pages.config.ts` and port `33211`. It tests the existing `./build` artifact without rebuilding it or reusing another server. The static host only exposes the configured mount, performs HTML file lookup, and serves `404.html` with HTTP `404` for missing routes. Run the hosting variants sequentially because they share the output directory and test port.

The suite checks all six module links, direct navigation, reloads, query parameters, active navigation, error recovery, manifest resources, worker scope and activation, and offline access through the three stepped solvers. Online checks block service workers so cached pages cannot hide host failures. Network auditing rejects missing resources, unhandled application exceptions, and requests outside the mount. Failure traces and screenshots are written under `./test-results/`.

PR verification runs separate root and project smoke jobs. Deployment runs the same suite against its actual Pages build before uploading the artifact, so a failing smoke check prevents deployment.

## 📐 Mathematical & Code Formatting Guidelines

### Universal LaTeX Enforcement

- Never use raw Unicode math symbols ($\sum, \int, \omega, \pi, \sigma$) in UI markup.
- Render all mathematical variables and formulas using `<MathInline>` or `<MathBlock>`.
- Use `\operatorname{...}` for custom signal operators:
    - Correct: `\operatorname{rect}(t)`, `\operatorname{tri}(t)`, `\operatorname{sinc}(t)`, `\operatorname{sgn}(t)`
    - Incorrect: `\text{rect}(t)` or `rect(t)`

### Granular Step Breakdowns

When writing or updating practice problem solvers, intermediate steps must never be omitted:

- Characteristic equation root solving (quadratic formula or factoring).
- Trial solution substitutions ($y_p, y_p', y_p''$).
- Systems of linear equations for unknown initial condition coefficients ($C_1, C_2$).
- Complete Partial Fraction Decomposition (PFD) setups and residue calculations.

### Responsive Design (320px Standard)

All components must render without horizontal overflow (`scrollWidth <= clientWidth`) down to a minimum viewport width of $320\text{px}$ (WCAG 2.1 Reflow). Always use fluid container queries, flex-wrapping, and mobile media queries.
