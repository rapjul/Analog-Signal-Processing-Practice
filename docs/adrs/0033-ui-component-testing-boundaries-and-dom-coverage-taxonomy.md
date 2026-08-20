---
status: accepted
date: 2026-08-20
decision-makers: [development-team]
consulted: []
informed: []
---

# 33. UI Component Testing Boundaries and DOM Coverage Taxonomy

## Context and Problem Statement

As SignalLab's user interface and Intelligent Tutoring System (ITS) grown to encompass diverse UI elements—ranging from pure mathematical presentation widgets (LaTeX wrappers) to interactive input builders, slide-over formula drawers, responsive navigation bars, and stepped solvers—testing responsibilities have become multi-layered.

Historically, testing was divided between high-throughput pure Node.js mathematical engine tests (`unit/node`) and full-browser end-to-end integration tests (`tests/e2e/` with Playwright). With the introduction of the dual-runtime Vitest architecture ([ADR-0025](./0025-dual-runtime-vitest-component-testing-and-coverage.md)), Svelte 5 components can be mounted in an emulated browser environment (`unit/dom` with JSDOM and `@testing-library/svelte`).

However, without a formal architectural boundary, ambiguities arise regarding:

1. Which components require full DOM mounting and user interaction simulation (`unit/dom`).
2. Which components should rely on pure logic unit tests (`unit/node`).
3. Which components are best verified through visual and end-to-end integration tests (`tests/e2e/`).

## Decision Drivers

- **Targeted Test Execution & Performance**: Maintain fast unit test cycle times (~2–3s) by avoiding unnecessary DOM mounting for pure layout wrappers or pure algorithmic math controllers.
- **Interaction & Accessibility Validation**: Ensure all interactive controls (buttons, inputs, disclosures, tab selectors, dialogs) have automated assertions for user events (`fireEvent`, keyboard inputs), ARIA attributes (`aria-expanded`, `aria-current`, `role="dialog"`), and responsive states.
- **Zero-Regressions in Svelte 5 Rune Reactivity**: Verify that `$state`, `$derived`, and `$bindable` props correctly trigger DOM updates, validation feedback, and conditional renders.
- **Maintainable Test Organization**: Establish a clear 4-tier taxonomy guiding developers and agents on where and how to write component tests.

## Considered Options

- **Option 1: Test Every Component Exclusively in JSDOM (`unit/dom`)**: Mount all components, layouts, and page wrappers in JSDOM.  
  _(Rejected: Introduces unnecessary test runtime overhead and fragile assertions for static layout wrappers)._
- **Option 2: Test Only Mathematical Logic in Vitest and Rely on Playwright for All UI**: Keep Vitest purely mathematical and use Playwright for all DOM assertions.  
  _(Rejected: Playwright startup overhead slows down local TDD feedback loops and makes testing edge cases in small UI components cumbersome)._
- **Option 3: Formalized 4-Tier UI Testing Taxonomy**:
    - Classify components into 4 distinct tiers with clear runtime environments and testing obligations.

## Decision Outcome

Chosen Option: **Option 3: Formalized 4-Tier UI Testing Taxonomy**.

### Component Testing Taxonomy

| Tier       | Component Category                           | Testing Strategy                                                                                                             | Target Directory & Runtime                                       | Examples                                                                                                                       |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Tier 1** | **Interactive & User Input Controls**        | Full DOM mounting, event simulation (`click`, `keydown`, `input`), accessibility roles/ARIA, error validation states.        | `tests/unit/components/*.test.ts`<br/>(`unit/dom` / JSDOM)       | `MathInputBar`, `StepCard`, `FormulaDrawer`, `Navigation`, `StickyActionBar`, `PartProgressPill`, `StepReveal`, `StepFeedback` |
| **Tier 2** | **LaTeX & Mathematical Presentation**        | KaTeX DOM rendering, fallback error boundaries, clipboard copy interactions, expansion triggers.                             | `tests/unit/components/*.test.ts`<br/>(`unit/dom` / JSDOM)       | `MathInline`, `MathBlock`, `MathText`, `CompletionBanner`, `HintDisclosure`, `StepBreadcrumb`, `UpdateToast`                   |
| **Tier 3** | **Complex Stepped Solvers & Practice Cards** | Controller state machine logic & invariant assertions in Node; interactive user flows and visual snapshot validation in E2E. | `tests/unit/*.test.ts` (`unit/node`) + `tests/e2e/` (Playwright) | `BaseStepSolverState`, `OdeStepSolverState`, `OdePracticeCard`, `FourierPracticeCard`, `DrillPanel`                            |
| **Tier 4** | **Static / Pure Layout Wrappers**            | Integrated via page-level smoke tests and responsive visual regression suites in E2E.                                        | `tests/e2e/*.spec.ts` (Playwright)                               | `PageLayout`, `ProblemHeader`                                                                                                  |

### Standards for Writing DOM Component Tests (`unit/dom`)

1. **Framework**: Use `@testing-library/svelte` (v5+) with `render`, `fireEvent`, and `cleanup`.
2. **Accessibility-First Queries**: Prefer semantic queries (`getByRole`, `getByLabelText`, `getByText`) over raw CSS class selectors where applicable.
3. **Keyboard & Interaction Handling**: Explicitly test keyboard accessibility (e.g. `Escape` on modal drawers, `Enter` on input forms) and ARIA state reflection (`aria-expanded`, `aria-current="step"`).
4. **LaTeX Presentation Verification**: For math components, assert that compiled KaTeX output (`.katex`, `.katex-display`) renders with correct expressions or fallback markup without throwing unhandled exceptions.
5. **Clean Lifecycle Cleanup**: Always include `afterEach(() => { cleanup(); })` to prevent cross-test DOM pollution.

## References

- [ADR-0025: Dual-Runtime Vitest Architecture for Component Testing and V8 Coverage](./0025-dual-runtime-vitest-component-testing-and-coverage.md)
- [ADR-0021: Focus-Visible Keyboard Accessibility and Stacking Context](./0021-focus-visible-keyboard-accessibility-and-stacking-context.md)
- [ADR-0020: MathText Prose Rendering and Keyboard Navigation Accessibility](./0020-mathtext-prose-rendering-and-keyboard-navigation-accessibility.md)
