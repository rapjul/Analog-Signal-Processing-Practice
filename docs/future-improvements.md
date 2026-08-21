# SignalLab — Future Improvements & Ideas Backlog

A running backlog of prospective UX, visual, and architectural improvements to consider for future development sprints.

---

## Solver & Practice Interface Enhancements

### 1. Compact Top Stepper / Progressive Card Collapse

- **Context:** Currently, locked upcoming steps (Steps 2–6) are rendered as full-width vertical placeholder cards below the active question.
- **Improvement Idea:**
    - Replace the large vertical locked placeholder cards with a compact horizontal breadcrumb/pill stepper at the top (e.g., `[1: Period ✓] -> [2: Symmetry (Active)] -> [3: Shortcuts] -> ...`).
    - Only render completed steps (collapsed into compact summary cards) and the current active step in the main flow.
    - Keeps the view concise, reduces page scroll, and prevents visual clutter.

### 2. Floating / Sticky Bottom Action Bar

- **Context:** On long problem descriptions, mobile viewports, or complex multi-part inputs, action controls can drift out of immediate view.
- **Improvement Idea:**
    - Introduce a persistent, floating viewport-anchored bottom action bar (`position: sticky; bottom: 0;` or glassmorphic floating pill).
    - Can house quick-action utilities such as persistent hint toggles, formula reference drawers, or step progression navigation without requiring the user to scroll up or down.

### 3. Shared Progress Component

- Make a shared Component for the "Intelligent Tutoring Progress" tracker to use in all Practice Problem Solvers. Rename to just "Progress"

### 4. Review Legacy "Full Analytical Solution Breakdown" (`StepReveal`) Removal

- **Context:** The old post-completion "Full Analytical Solution Breakdown" (`StepReveal` / `(?/? Steps Revealed)`) was removed from the Linear ODEs (`OdePracticeCard.svelte`) and Fourier Series (`FourierPracticeCard.svelte`) completion views in favor of the interactive multi-step ITS solvers.
- **Action / Review Item:**
    - Verify and audit the completed post-solve experience across Fourier Series and Linear ODEs.
    - Evaluate and decide whether to migrate or remove legacy `StepReveal` / solution breakdown blocks from the remaining practice modules (e.g., Convolution, Laplace, Fourier Transform, Circuits).

### 5. Fourier Series: Convert to Trigonometric/Exponential/Compact Forms

- Support deliberate conversion among trigonometric, exponential, and compact
  Fourier series forms.
- Preserve the textbook distinction between exponential coefficients $F_n$ and
  compact-form amplitudes $c_n$; do not use `c_n` for both representations.
- Add a new problem type where the Fourier series is given, and then the user needs to convert to another form.

### 6. Linear ODEs: Unstable and Marginally Stable Systems

- **Context:** The current Linear ODE problem generator focuses on asymptotically stable systems whose characteristic roots have strictly negative real parts.
- **Improvement Idea:**
    - Add a stability selector with `Random`, `Stable`, `Marginal`, and `Unstable` modes.
    - Add unstable systems with at least one characteristic root in the right half-plane.
    - Add marginally stable systems with simple zero or imaginary-axis roots, including persistent constant and undamped sinusoidal natural modes.
    - Teach transient versus steady-state terminology conditionally when natural modes persist or grow, instead of assuming every homogeneous term decays.
    - Add BIBO-stability questions that distinguish pole location, internal response, and bounded-input behavior.
    - Scale plots safely for growing responses, including overflow guards and useful time-window selection.
    - Test zero- and right-half-plane poles, persistent and growing natural modes, BIBO classifications, response decomposition, and plot scaling.

## Learning Experience & UX Enhancements

### 7. Session & ITS Solver State Persistence

- **Context:** If a student refreshes mid-problem, all interactive progress is lost.
- **Improvement Idea:**
    - Save active ITS solver state, entered inputs, and revealed steps to `sessionStorage` or IndexedDB.
    - Restore in-progress problem states seamlessly upon browser reload or accidental navigation.

### 8. Adaptive Difficulty & Spaced Repetition Progression

- **Context:** All problems are currently randomly generated without difficulty progression.
- **Improvement Idea:**
    - Implement a spaced repetition and adaptive difficulty progression engine.
    - Dynamically calibrate problem parameters and complexity based on student accuracy and mastery history.

### 9. Global Keyboard Shortcuts for Power Users

- **Context:** Power users and students drilling problems for exams currently rely exclusively on mouse/touch interaction.
- **Improvement Idea:**
    - Add keyboard shortcuts for high-frequency actions (e.g. `Ctrl/Cmd + Enter` to Check Answer, `H` for Hint, `N` for Next Problem).
    - Provide an accessible shortcuts cheatsheet/modal.

### 10. Dashboard / Home Page Per-Module Progress Tracking

- **Context:** Dashboard cards all display static "▶ Practice Now" labels without indication of user progress.
- **Improvement Idea:**
    - Connect the local database / persistence layer to display per-module mastery percentages, completion rates, and problem attempt counts directly on the dashboard cards.

### 11. Automated Solved-Problem Screenshot Tool

- **Context:** Verifying solver layouts, KaTeX rendering, progressive hints, and post-solve canvas visualizers manually across all problem archetypes is time-consuming.
- **Proposal & Options:** See detailed design document at [automated-solved-problem-screenshot-tool.md](./automated-solved-problem-screenshot-tool.md).
