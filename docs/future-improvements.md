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

- Convert all sin/cos series solutions to compact exponential form.
- Add a new problem type where the Fourier series is given, and then the user needs to convert to another form.

## Learning Experience & UX Enhancements

### 6. Session & ITS Solver State Persistence

- **Context:** If a student refreshes mid-problem, all interactive progress is lost.
- **Improvement Idea:**
    - Save active ITS solver state, entered inputs, and revealed steps to `sessionStorage` or IndexedDB.
    - Restore in-progress problem states seamlessly upon browser reload or accidental navigation.

### 7. Adaptive Difficulty & Spaced Repetition Progression

- **Context:** All problems are currently randomly generated without difficulty progression.
- **Improvement Idea:**
    - Implement a spaced repetition and adaptive difficulty progression engine.
    - Dynamically calibrate problem parameters and complexity based on student accuracy and mastery history.

### 8. Global Keyboard Shortcuts for Power Users

- **Context:** Power users and students drilling problems for exams currently rely exclusively on mouse/touch interaction.
- **Improvement Idea:**
    - Add keyboard shortcuts for high-frequency actions (e.g. `Ctrl/Cmd + Enter` to Check Answer, `H` for Hint, `N` for Next Problem).
    - Provide an accessible shortcuts cheatsheet/modal.

### 9. Dashboard / Home Page Per-Module Progress Tracking

- **Context:** Dashboard cards all display static "▶ Practice Now" labels without indication of user progress.
- **Improvement Idea:**
    - Connect the local database / persistence layer to display per-module mastery percentages, completion rates, and problem attempt counts directly on the dashboard cards.
