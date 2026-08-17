# Automated Solved-Problem Screenshot Tool — Architectural Proposal & Options

## Overview & Objective

The goal of the **Automated Solved-Problem Screenshot Tool** is to provide a deterministic, automated visual testing utility that programmatically captures the full end-to-end interactive and solved states across all practice problem solvers (ODEs, Fourier Series, Convolution, Laplace, CTFT, Circuits) without requiring tedious manual solving.

This tool will enable rapid visual inspection of:

1. **Mathematical typography and KaTeX layout** across all steps and solution components.
2. **Interactive form controls** (inputs, previews, choice cards, remediation paths, action buttons).
3. **Progressive hint tiers** (Tier 1 nudge, Tier 2 formula setup, Tier 3 intermediate step).
4. **Diagnostic feedback banners** (input validation, pedagogical misconception alerts, incorrect answer feedback).
5. **Post-solve visualizers & full derivations** (`WaveformCanvas`, `ConvolutionCanvas`, `OdeFullSolutionView`, `FourierStepSolver` summaries, etc.).

---

## Core Problem: Transient UI & Screenshot Explosion

In the Intelligent Tutoring System (ITS) stepper architecture:

- **State Transience**: When Step $n$ is solved, its interactive inputs, buttons, and formula previews are replaced by a compact completed summary badge ($\checkmark$).
- **Combinatorial Overhead**: Capturing every isolated state naively would require:
  $$\text{Steps } (7) \times \text{States } (\text{Empty} + \text{Wrong/Misconception} + \text{Hint Tiers 1–3} + \text{Solved}) \approx 35\text{–}40\text{ screenshots per problem archetype}$$
  Multiplied across all problem variations, root types, forcing functions, and viewports (Desktop, Tablet, Mobile), this would result in thousands of unmanageable screenshot files.

---

## Architectural Options

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SOLVED-STATE SNAPSHOT OPTIONS                                │
├───────────────────────────────┬──────────────────────────────────┬──────────────────────────────┤
│ Option                        │ How It Works                     │ Screenshot Output / Overhead │
├───────────────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ 1. Programmatic E2E           │ Playwright automates inputs      │ ~1–3 screenshots per problem │
│    Fast-Forward Solver        │ using pre-computed math engine   │ (Initial, Feedback/Hints,    │
│                               │ solution data in milliseconds.   │ Full Solved + Visualizer).   │
├───────────────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ 2. "All-Steps Exploded"       │ Test/debug rendering flag        │ 2 screenshots per problem    │
│    Audit View (?mode=inspect) │ expanding all step cards         │ (1 exploded interactive card │
│                               │ simultaneously on one page.      │ + 1 full solved state).      │
├───────────────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ 3. Isolated Component Step    │ Standalone test harness route    │ Fixed gallery board with     │
│    Gallery / Catalog          │ rendering isolated step states   │ matrix of state cards.       │
│                               │ with fixed mock data.            │                              │
├───────────────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ 4. Hybrid Strategy            │ Programmatic fast-forward engine │ ~2–3 curated screenshots     │
│    (Recommended)              │ + instant debug helpers for      │ per problem archetype.       │
│                               │ hints, feedback, and canvases.   │                              │
└───────────────────────────────┴──────────────────────────────────┴──────────────────────────────┘
```

---

### Option 1: Programmatic E2E Fast-Forward Solver

#### Description

Leverages Playwright to automate solving directly against the live UI by pulling exact expected answers from the problem definition object (`problem.itsData`, `problem.roots`, `problem.ansatz`, etc.).

#### Mechanics

1. Playwright navigates to the practice route.
2. Injects pre-calculated answers into inputs and triggers validation clicks programmatically in milliseconds.
3. Captures key milestone states:
    - **State A (Initial Problem Setup)**: Step 1 active with clean inputs.
    - **State B (Diagnostic Feedback & Hint State)**: Types a known misconception answer (e.g. sign flip in characteristic roots) to trigger the feedback alert and expands Hint Tier 3.
    - **State C (Full Solved State)**: Fast-forwards through all remaining steps to reveal the completion banner, response curves, and analytical solution breakdown.

#### Pros

- Tests real user interactions, event handlers, and DOM validation rules end-to-end.
- Zero changes required to production UI templates.
- Fast execution in headless Playwright (<1.5s per problem).

#### Cons

- Intermediate input boxes from completed steps are collapsed into summaries by the time Step 7 is reached, unless individual screenshots are captured at each step.

---

### Option 2: "All-Steps Exploded" Audit Mode (`?view=all-steps` or `devMode`)

#### Description

Adds a test/inspection mode flag to `BaseStepSolverState` or component templates allowing all 7 step cards to render their active input interface simultaneously on one continuous scrolling page.

#### Mechanics

- When active, the template evaluates `{#if solver.currentStep === N || solver.isExplodedAuditMode}`.
- All step input groups, previews, hint toggles, and choice buttons render stacked vertically.
- A single full-page screenshot (`page.screenshot({ fullPage: true })`) captures 100% of the interactive UI.
- A second screenshot captures the completed state with visualizers.

#### Pros

- Drastically reduces screenshot count down to **2 images per problem** while capturing all inputs, math formulas, and interactive controls.
- Fast and easy to review for human auditors or visual regression diffs.

#### Cons

- Requires conditional template checks in Svelte step solvers.

---

### Option 3: Dedicated Component & Step Showcase Catalog (`/test/solver-gallery`)

#### Description

A dedicated internal developer/test page that mounts each step component independently in isolated mock states:

- **Card A**: Default empty input state.
- **Card B**: Active Hint Tiers 1, 2, and 3 revealed.
- **Card C**: Misconception warning banner & validation error state.
- **Card D**: Completed summary badge ($\checkmark$).
- **Card E**: Analytical step breakdown & canvas visualizer.

#### Pros

- Fully decoupled from state machine transitions and dynamic user input flows.
- Guarantees visual regression coverage for edge-case feedback strings and long math formulas.

#### Cons

- Requires creating and maintaining a separate test route and mock fixtures.

---

### Option 4: The Hybrid Strategy (Recommended)

Combines the programmatic fast-forward capability of Option 1 with lightweight developer state methods to achieve maximum coverage with minimal file clutter.

#### 1. Developer / Test Helpers on `BaseStepSolverState`

Add clean, non-intrusive debug helpers directly to the solver state controllers (available in dev/test builds):

- `solver.autoFillCurrentStep()`: Fills current step inputs with the correct mathematical values.
- `solver.solveAll()`: Instantly marks all steps valid and advances past the final step, triggering the `onComplete` callback and revealing canvas visualizers.
- `solver.revealAllHints()`: Sets `hintTier = 3` to display all progressive hints.
- `solver.simulateMisconception(sampleKey)`: Injects a sample diagnostic misconception feedback for visual testing.

#### 2. Curated 3-Shot Strategy per Problem Archetype

For each problem archetype (e.g., ODE 1st-order, 2nd-order distinct roots, repeated roots, complex conjugate; Fourier pulse, triangle, saw):

```
tests/e2e/screenshots/solvers/
  ├── ode-2nd-order-complex/
  │     ├── 01-interactive-setup-and-hints.png  (Step 1-2 inputs, equation preview, Tier 3 hints)
  │     ├── 02-misconception-feedback.png       (Diagnostic misconception warning banner)
  │     └── 03-full-solved-with-waveform.png    (Completed badges, WaveformCanvas curves, full derivation)
  └── fourier-series-square-wave/
        ├── 01-interactive-symmetry-gate.png
        ├── 02-misconception-feedback.png
        └── 03-full-solved-with-spectrum.png
```

---

## Next Steps When Work Resumes

1. **Select Preferred Approach**: Review the 4 options above and choose the primary strategy (Recommended: Option 4 Hybrid).
2. **Implement Solver Helper Methods**: Add `solveAll()`, `revealAllHints()`, and `autoFillCurrentStep()` to `BaseStepSolverState` and subclasses.
3. **Create Playwright Solver Snapshot Suite**: Create `tests/e2e/solver-snapshots.spec.ts` to run automated captures across all 6 practice problem modules.
4. **Wire to NPM Script**: Expose via `npm run test:e2e:solvers` or `npm run capture:solver-screenshots`.
