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

### 5. Fourier Series: Required Forms and Standalone Conversion Drills

- Add problem modes for `Optimal`, `Trigonometric required`, and `Exponential required` derivation paths.
- Make the selected derivation mode shareable in seeded problem URLs.
- Teach valid but non-optimal derivation paths without presenting them as calculation errors.
- Add standalone mandatory drills that begin with a supplied Fourier series and require conversion to a specified alternate or Compact form.
- Preserve the textbook distinction between exponential coefficients $F_n$ and Compact-form amplitudes $c_n$ in every future mode.

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

### 7. Linear ODEs: Hide Root Classification Until the Student Derives It

- **Context:** The Linear ODE problem header currently exposes the characteristic
  root classification before the student reaches the corresponding ITS step.
  This contradicts the solver anti-spoiler policy and gives away part of the
  derivation.
- **Improvement Idea:**
    - Keep the initial problem header generic, consistent with the Fourier Series
      practice card.
    - Reveal the root classification only after the student determines it, or in
      a completed-step summary.
    - Add component and end-to-end assertions that the classification is absent
      before the relevant step and visible afterward.

## Learning Experience & UX Enhancements

### 8. Session & ITS Solver State Persistence

- **Context:** If a student refreshes mid-problem, all interactive progress is lost.
- **Improvement Idea:**
    - Save active ITS solver state, entered inputs, and revealed steps to `sessionStorage` or IndexedDB.
    - Restore in-progress problem states seamlessly upon browser reload or accidental navigation.

### 9. Adaptive Difficulty & Spaced Repetition Progression

- **Context:** All problems are currently randomly generated without difficulty progression.
- **Improvement Idea:**
    - Implement a spaced repetition and adaptive difficulty progression engine.
    - Dynamically calibrate problem parameters and complexity based on student accuracy and mastery history.

### 10. Global Keyboard Shortcuts for Power Users

- **Context:** Power users and students drilling problems for exams currently rely exclusively on mouse/touch interaction.
- **Improvement Idea:**
    - Add keyboard shortcuts for high-frequency actions (e.g. `Ctrl/Cmd + Enter` to Check Answer, `H` for Hint, `N` for Next Problem).
    - Provide an accessible shortcuts cheatsheet/modal.

### 11. Dashboard / Home Page Per-Module Progress Tracking

- **Context:** Dashboard cards all display static "▶ Practice Now" labels without indication of user progress.
- **Improvement Idea:**
    - Connect the local database / persistence layer to display per-module mastery percentages, completion rates, and problem attempt counts directly on the dashboard cards.

### 12. Automated Solved-Problem Screenshot Tool

- **Context:** Verifying solver layouts, KaTeX rendering, progressive hints, and post-solve canvas visualizers manually across all problem archetypes is time-consuming.
- **Proposal & Options:** See detailed design document at [automated-solved-problem-screenshot-tool.md](./automated-solved-problem-screenshot-tool.md).

### 13. Linear ODEs: Use a Native Worked-Solution Disclosure

- **Context:** The Linear ODE completed solution currently imitates disclosure behavior with a button, local open state, and conditionally rendered content.
- **Improvement Idea:**
    - Replace the simulated control with native `<details>` and `<summary>` elements.
    - Show the complete worked solution at once when the disclosure is opened, matching the Fourier Series completed-solution experience.
    - Preserve keyboard access, focus styling, collapsed-by-default behavior, and narrow-screen reflow coverage.

### 14. Convolution Animator: Transition-Aware Region Navigation

- **Context:** Continuous playback helps build intuition, but it can pass important contact events before a student connects them to the verified interval bounds.
- **Improvement Idea:**
    - Pause automatically at each finite transition time and announce the newly active region.
    - Add Previous Region and Next Region controls with matching keyboard behavior.
    - Display the active support intersection, exact integration bounds, and numerical overlap area beside the plot.
    - Preserve manual scrubbing, reduced-motion preferences, and playback-speed controls.

### 15. Convolution Tutor: Optional Pre-Solve Pictographic Preview

- **Context:** Some students benefit from seeing the flip-and-shift motion before beginning the symbolic support analysis.
- **Improvement Idea:**
    - Add a collapsed, optional pictographic animation at the beginning of each problem.
    - Show reflection, translation, and overlap without revealing the final output curve, exact transition times, or interval answers.
    - Let the student replay or dismiss the preview before entering Step 1.
    - Reuse the modular convolution plot model so future visual changes remain synchronized with the completed animator.
