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
- **Context:** The old post-completion "Full Analytical Solution Breakdown" (`StepReveal` / `(?/? Steps Revealed)`) was removed from the Linear ODEs (`OdePracticeCard.svelte`) and Fourier Series (`FourierPracticeCard.svelte`) completion views in favor of the interactive multi-stage ITS solvers.
- **Action / Review Item:**
  - Verify and audit the completed post-solve experience across Fourier Series and Linear ODEs.
  - Evaluate and decide whether to migrate or remove legacy `StepReveal` / solution breakdown blocks from the remaining practice modules (e.g., Convolution, Laplace, Fourier Transform, Circuits).
