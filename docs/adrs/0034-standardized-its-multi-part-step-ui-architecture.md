---
status: accepted
date: 2026-08-22
decision-makers: [development-team]
consulted: []
informed: []
---

# 34. Standardized ITS Multi-Part Step UI and Component Architecture

## Context and Problem Statement

SignalLab provides stepped Intelligent Tutoring System (ITS) solvers across diverse domains of Analog Signal Processing, including Linear Constant-Coefficient ODEs, Fourier Series synthesis, Continuous-Time Fourier Transforms (CTFT), Laplace transforms, Circuits, and Continuous-Time Convolution.

Several pedagogically complex solver steps require decomposition into sequential micro-challenges (multi-part steps). For example:

- **ODE Solver**: Undetermined coefficients decomposition ($y_p', y_p''$, linear harmonic grouping, algebraic solve in Step 5), homogeneous initial value targets and constant evaluation (Step 6), and dual response decomposition (Step 7).
- **Fourier Series Solver**: Symmetry analysis (Origin parity and Half-wave symmetry in Step 2), piecewise integral setup per active harmonic family (Step 5), and harmonic coefficient evaluation (Step 6).
- **Laplace / Circuit Solvers**: Partial fraction decomposition (PFD setup, residue calculations, inverse transform pairing).

Previously, different solvers implemented divergent UI patterns for multi-part steps. While the ODE solver utilized the centralized `StepCard` and `PartProgressPill` primitives with structured `.subpart-block` containers and `.subpart-badge` indicators, the Fourier Series solver rendered raw HTML card elements and unstyled floating text (`<span>Part 1 of 2</span>`) via `justify-content: space-between`. This produced visual inconsistency, confusing badge placements, and ad-hoc CSS maintenance across domains.

## Decision Drivers

- **Universal Pedagogical Consistency**: Ensure students experience an identical, predictable interaction model across all ITS solver domains when navigating multi-part steps.
- **Single-Source Component Reusability (DRY)**: Centralize card chrome, responsive badges, progress indicators, and accessibility semantics in shared UI components (`StepCard`, `PartProgressPill`).
- **Clear Visual Hierarchy**: Distinguish top-level step progress (e.g. `Step 2: Waveform Symmetry Analysis`) from internal subpart progress (e.g. `Part 2A: Classify Origin Parity` vs `Part 2B: Test Half-Wave Symmetry`).
- **WCAG 2.1 Reflow & Mobile Fluidity**: Guarantee that all subpart headers, progress pills, option grids, and action buttons wrap and scale gracefully down to 320px viewports without horizontal overflow.

## Considered Options

- **Option 1: Domain-Specific Inline Customization**: Allow each domain solver (ODE, Fourier Series, Laplace, Convolution) to design and layout subparts independently.  
  _(Rejected: Leads to visual fragmentation, unbadged floating text, accessibility regressions, and redundant CSS rules)._
- **Option 2: Dedicated Generic Subpart Card Wrapper (`SubpartCard.svelte`)**: Wrap every individual subpart in a nested standalone card container.  
  _(Rejected: Excessive visual noise, double borders, and severe padding consumption on narrow mobile viewports)._
- **Option 3: Standardized 3-Tier Multi-Part Step UI Hierarchy**:
    - Tier 1 (Step Level): Shared `StepCard` container with `PartProgressPill` mounted via the `headerExtra` snippet in the top card header.
    - Tier 2 (Subpart Level): Structured `.subpart-block` containing `.subpart-header` (`.subpart-badge` + `.subpart-title` with `MathText` + optional `.substep-check-badge`).
    - Tier 3 (Progressive State): Active subparts show full interactive controls; completed previous subparts render compact verified summary lines.

## Decision Outcome

Chosen Option: **Option 3: Standardized 3-Tier Multi-Part Step UI Hierarchy**.

### Architectural Specification

#### 1. Step Card Header Integration

Every multi-part step must use `StepCard` and supply a `PartProgressPill` in the `headerExtra` snippet:

```svelte
{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.stepXProgress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={N}
	title="Step Title"
	{status}
	{headerExtra}
	summaryLatex="Summary LaTeX..."
>
	<!-- Subparts rendered inside step-body -->
</StepCard>
```

#### 2. Subpart Header & Body Layout

Within the active step body, each subpart is encapsulated in a `.subpart-block` with standardized class contracts:

```svelte
<div class="subpart-block">
	<div class="subpart-header">
		<span class="subpart-badge">Part {badgeId}</span>
		<h4 class="subpart-title">
			<MathText text={subpartTitle} />
		</h4>
		{#if isSubpartCompleted}
			<span class="substep-check-badge">
				<span class="check-icon">✓</span> Verified
			</span>
		{/if}
	</div>

	<!-- Subpart interactive controls or verified summary -->
</div>
```

#### 3. Standardized Class Contracts

| Class Name               | Target Element                | Semantic Purpose                                               | Styling Rules                                                                                                                               |
| :----------------------- | :---------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `.part-progress-pill`    | `<span>` in `StepCard` header | Displays overall subpart progress (e.g. `Part 1 of 2`)         | Cyan pill (`rgba(6, 182, 212, 0.12)`), rounded full border, bold text, `margin-left: auto`.                                                 |
| `.subpart-block`         | `<div>` in step body          | Container for a single subpart micro-challenge                 | `display: flex; flex-direction: column; gap: 0.75rem; width: 100%; min-width: 0;`                                                           |
| `.subpart-header`        | `<div>` in `.subpart-block`   | Row containing the part badge, title, and verified status      | `display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;`                                                                         |
| `.subpart-badge`         | `<span>` in `.subpart-header` | High-contrast label for the subpart (e.g. `Part 2A`, `Part 1`) | `font-size: var(--text-xs); font-weight: 700; background: var(--accent-bg); color: var(--accent-primary); border-radius: var(--radius-sm);` |
| `.subpart-title`         | `<h4>` in `.subpart-header`   | Mathematical or descriptive title of the subpart               | `font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;`                                                       |
| `.substep-check-badge`   | `<span>` in `.subpart-header` | Visual check indicator for completed subpart                   | `font-size: var(--text-xs); font-weight: 700; color: var(--color-success); margin-left: auto;`                                              |
| `.substep-verified-line` | `<div>` in `.subpart-block`   | Compact summary line for a completed prior subpart             | `font-size: var(--text-sm); color: var(--text-secondary); font-weight: 600;`                                                                |

#### 4. Responsive & Accessibility Guarantees

- **Reflow**: All subpart headers use `flex-wrap: wrap` and fluid typography, ensuring no layout clipping or horizontal scrolling on $320\text{px}$ viewports.
- **Keyboard Navigation**: All interactive subpart options (MCQ buttons, math cards) have `:focus-visible` outlines and full keyboard event support (`Enter`, `Space`).
- **LaTeX Math Rendering**: Subpart titles and prompts containing mathematical variables must be rendered through `MathText` or `MathBlock` with exact LaTeX formatting.

## References

- [ADR-0010: Intelligent Tutoring System (ITS) Stepped Solvers](./0010-intelligent-tutoring-system-stepped-solvers.md)
- [ADR-0015: Six-Stage ODE Interactive ITS Mapping](./0015-six-stage-ode-interactive-its-mapping.md)
- [ADR-0016: Narrow Viewport (320px) Responsive Layout Architecture](./0016-narrow-viewport-responsive-layout-architecture.md)
- [ADR-0020: MathText Prose Rendering and Keyboard Navigation Accessibility](./0020-mathtext-prose-rendering-and-keyboard-navigation-accessibility.md)
- [ADR-0021: Focus-Visible Keyboard Accessibility and Stacking Context](./0021-focus-visible-keyboard-accessibility-and-stacking-context.md)
