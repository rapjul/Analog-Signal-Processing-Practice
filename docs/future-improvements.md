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

- **Context:** The Linear ODE problem header originally exposed the characteristic
  root classification before the student reached the corresponding ITS step.
  This contradicted the solver anti-spoiler policy and gave away part of the
  derivation.
- **Resolution:** Completed. The initial problem header in
  `src/lib/components/ui/OdePracticeCard.svelte` remains generic (displaying only
  system order, e.g. `1st-Order` or `2nd-Order`). The characteristic root
  classification is deferred and displayed only after the student completes
  Step 2 in its verified step summary.
- **Coverage:** Automated assertions in
  `tests/e2e/practice-correctness.spec.ts` (`"ODE header keeps root classification hidden"`
  and `"ODE classification appears in its verified summary @dev-harness"`).

## Learning Experience & UX Enhancements

### 8. Session & ITS Solver State Persistence

- **Context:** If a student refreshes mid-problem, all interactive progress is lost.
- **Improvement Idea:**
    - Add IndexedDB-backed attempt history, then connect actual practice interactions to it; the current history utility only stores attempts in memory.
    - Store versioned unfinished-problem snapshots containing reproducible problem parameters or seeds, entered answers, verified steps, hint tiers, and assisted-solution status.
    - Restore unfinished work after reload or navigation without treating a revealed solution as independent success.
    - Reject incompatible snapshots safely and keep practice usable when storage is denied, unavailable, or full. Preserve the blocked-storage behavior covered by the existing browser regressions.
    - Add automated tests for reload recovery, schema migration, assisted attempts, and storage failures before releasing persistence.
    - **Status:** Deferred; implement independently of the current grading and solution-disclosure fixes.

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
    - After persisted history is connected, show attempt counts, accuracy, completion, and recent activity on dashboard cards.
    - Keep assisted practice distinct from independent success; do not label raw correctness percentage as mastery.
    - Add a resume action for a compatible unfinished-problem snapshot and automated dashboard/history integration coverage.

### 12. Automated Solved-Problem Screenshot Tool

- **Context:** Verifying solver layouts, KaTeX rendering, progressive hints, and post-solve canvas visualizers manually across all problem archetypes is time-consuming.
- **Proposal & Options:** See detailed design document at [automated-solved-problem-screenshot-tool.md](./automated-solved-problem-screenshot-tool.md).

### 13. Linear ODEs: Use a Native Worked-Solution Disclosure

- **Context:** The Linear ODE completed solution originally imitated disclosure
  behavior with a button, local open state, and conditionally rendered content.
- **Resolution:** Completed. Replaced the simulated button control in
  `src/lib/components/solvers/OdeFullSolutionView.svelte` with semantic
  `<details class="full-solution-container">` and `<summary class="full-solution-summary">`
  elements, keeping all 7 worked steps in the DOM and matching the Fourier Series
  worked-solution experience (`FourierSeriesPracticeCard.svelte`) and `ADR-0034`.
- **Coverage:** Verified collapsed-by-default state, `<summary>` user interaction,
  and dynamic label updates in `tests/unit/components/OdeFullSolutionView.test.ts`.
  Semantic keyboard focus and `:focus-visible` styling conform to `ADR-0021` and `ADR-0034`,
  and production static build verification confirms clean compilation without layout regression.

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

### 16. Convolution Tutor: Delta Distribution and Unit-Impulse Signal Pairs

- **Context:** The current signal-pair categories do not teach the identity, shift, and scaling properties of convolution with an impulse.
- **Improvement Idea:**
    - Add Dirac delta (continuous-time unit impulse) convolution problems for rectangular, triangular, multiple-pulse, and exponential signals.
    - Include unshifted, shifted $\delta(t-t_0)$, and scaled $A\delta(t-t_0)$ variants so learners see identity, translation, and amplitude scaling separately.
    - If discrete-time convolution is added, distinguish its Kronecker unit sample from the continuous-time Dirac distribution instead of treating them as interchangeable notation.
    - Draw impulses with labeled arrows and finite weights in the animator, since a Dirac delta cannot be plotted as an ordinary finite-height function.
    - Test every main signal family in both operand orders and verify the resulting shift, scale, support, tutor steps, and plot labels.

## Deferred Guided Tutors

The following tutors require detailed planning in a separate future chat. The
current correctness work provides strict transform grading, structured generated
problem parameters, and explicit assisted-solution disclosures; it does not
implement these new tutoring workflows.

### 17. Laplace Transform Tutor

- Start with causal inverse transforms using distinct-real-pole PFD: factor the denominator, identify poles, select the expansion, solve each residue, reconstruct the rational expression, apply transform pairs, and assemble the supported time response.
- Before identifying poles, add a conditional "simplify and check cancellations" sub-step. Ask students to identify and cancel common numerator/denominator factors, then distinguish original denominator roots from genuine poles. For example, `(s+1)/((s+1)(s+4)) = 1/(s+4)` has only the pole `-4`, with causal ROC `Re(s) > -4`; the canceled root `-1` has a zero residue. Validate the simplified expression and surviving poles separately, diagnose retaining canceled roots, and skip this sub-step when there is no common factor. Implement this teaching workflow when the Laplace tutor is developed. Current genuine-pole and ROC metadata exclude canceled roots: `pfd.poles` and its paired `pfd.residues` contain surviving terms, while `pfd.denominatorRoots` retains the original denominator roots for cancellation diagnosis.
- Require separately validated algebraic substeps and exact fractions; diagnose sign errors, missing numerator terms, incorrect residues, and omitted causal support.
- Follow with repeated and complex poles, direct inverse transforms, forward transforms, and ROC/stability drills.
- Keep unilateral initial-condition rules separate from bilateral sidedness; give students enough ROC information to make each inverse transform unique.
- Audit bank answers and engine formulas before translating them into tutor steps; test every derivation path, remediation, reset, and completed solution.

### 18. Continuous-Time Fourier Transform Tutor

- Start with base-pair identification, parameter extraction, base-transform derivation, operational-property selection, application, and final assembly for the currently generated forward families.
- Provide dedicated impulse-location and complex-weight inputs for distribution spectra; never grade Dirac impulses by point sampling or represent their weights as finite peak heights.
- Diagnose normalized-sinc scaling, time-shift phase signs, missing paired impulses, and omitted amplitude factors.
- Follow with inverse transforms, time scaling, modulation, differentiation, duality, energy spectra, and bandwidth drills.
- Distinguish energy signals from power signals before requesting energy calculations; explicitly state the normalized-sinc and angular-frequency conventions.
- Test ordinary and distribution answers independently, including phase, equivalent forms, zero-frequency limits, and every operational-property combination taught.

### 19. Circuit Analysis Tutor

- First define a schematic, excitation, measured output, and component assumptions for each taught topology. Resolve current simplified active-filter assumptions before presenting them as general circuit identities.
- Teach component impedances/admittances, appropriate voltage or current division or nodal equations, substitutions, intermediate algebra, transfer-function assembly, and frequency-response interpretation.
- Use topology-specific derivations for active circuits; do not apply a generic voltage-divider explanation to every circuit.
- Diagnose reversed divider ratios, impedance/admittance confusion, missing powers of the frequency variable, coefficient units, and inappropriate output definitions.
- Keep prompts, controls, schematics, calculations, and completion plots attached to one component model.
- Test independent reference equations, all supported topology paths, parameter changes, diagnostic feedback, and completed plots.

### Shared Tutor Architecture and Release Requirements

- Reuse `BaseStepSolverState`, `StepCard`, `SubStepBlock`, progress, diagnostic feedback, tiered hints, and completion components instead of copying solver markup.
- Validate each substep independently; show verified summaries, explicit assisted-solution access, and reproducible reset behavior.
- Provide keyboard access, visible focus, accessible feedback, reduced-motion behavior, and reflow at `320px`.
- Use deterministic fixtures and co-located mathematical, lifecycle, component, and browser tests; preserve the existing production exclusion of developer harnesses.
- Treat persistence as a separate follow-on capability, with versioned snapshots and clear assisted-versus-independent attempt semantics.
