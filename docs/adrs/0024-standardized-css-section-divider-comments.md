---
status: accepted
date: 2026-08-15
decision-makers: [development-team]
consulted: []
informed: []
---

# 24. Standardized CSS Section Divider Comments and Modifier Annotations

## Context and Problem Statement

As SignalLab grew to include intricate interactive tutoring solvers, canvas graph visualizers, structured math input builders, formula drawers, and responsive layouts, the `<style>` blocks within Svelte single-file components became substantial (ranging up to 800+ lines of CSS in components like `OdeStepSolver.svelte`).

While several newer UI components (such as `ProblemHeader.svelte`, `CompletionBanner.svelte`, and `StepCard.svelte`) implemented structured box-drawing comments (`/* ── Section Title ──────────────────────────────────────── */`) and modifier variant annotations, many route pages and legacy components lacked structural annotations entirely. This inconsistency made scanning, maintaining, and navigating style blocks difficult.

## Decision Drivers

- **Code Readability & Navigability**: Developers and AI pair programmers need immediate visual landmarks when scanning large stylesheets in single-file components.
- **Clear Separation of Concerns**: Distinct layout areas, controls, variant modifier classes, and responsive breakpoints should be demarcated clearly.
- **Consistency Across Component Tiers**: Apply the same structured comment format across routes, solvers, UI components, math input bars, and canvas visualizers.
- **Long-Term Enforceability**: Formalize the commenting standard as a Universal Rule in `.agents/AGENTS.md` and `.agents/code-style.md` so all future components adhere to it.

## Considered Options

- **Option 1: Ad-hoc Comments Only**: Allow developers to comment styles arbitrarily without standard syntax. _(Rejected: Leads to inconsistent comment styles, missing responsive sections, and poor navigability in large components)._
- **Option 2: CSS Nesting / Sass Preprocessors**: Rely strictly on nesting to organize rules. _(Rejected: Adds build overhead, conflicts with Svelte's lightweight scoping philosophy, and does not provide quick visual scanning landmarks in long files)._
- **Option 3: Standardized Box-Drawing Section Dividers with Modifier Annotations**:
    - Mandate standard box-drawing section headers: `/* ── Section Title ──────────────────────────────────────── */`.
    - Annotate modifier classes, state variants, and color schemes with short inline comments (e.g. `/* Primary — cyan (default) */`, `/* Active state */`, `/* Locked / Disabled */`).
    - Standardize container and media query labels (e.g. `/* ── Narrow viewport (≤360px) container query ─────────── */`, `/* ── Mobile media query (≤480px) ─────────────────────── */`).

## Decision Outcome

Chosen Option: **Option 3**, because it provides unambiguous visual landmarks for code navigation, standardizes styling documentation across all 30+ Svelte components, and directly aligns with the reference pattern established in `ProblemHeader.svelte`.

### Technical Standards & Formatting Patterns

1. **Major Section Dividers**:

    ```css
    /* ── Outer card layout ─────────────────────────────────── */
    .card-container {
    	display: flex;
    	flex-direction: column;
    }

    /* ── Card Header ───────────────────────────────────────── */
    .card-header {
    	display: flex;
    	justify-content: space-between;
    }
    ```

2. **State & Modifier Variants**:

    ```css
    /* Active — accent primary border + glow */
    .card--active {
    	border-color: var(--accent-primary);
    }

    /* Completed — subtle emerald tint */
    .card--completed {
    	border-color: rgba(16, 185, 129, 0.35);
    }

    /* Locked — disabled pointer events */
    .card--locked {
    	opacity: 0.65;
    	pointer-events: none;
    }
    ```

3. **Responsive Breakpoints**:
    ```css
    /* ── Narrow viewport (≤360px) container query ─────────── */
    @container (max-width: 360px) {
    	.card-container {
    		padding: 0.75rem;
    	}
    }

    /* ── Mobile media query (≤480px) ─────────────────────── */
    @media (max-width: 480px) {
    	.card-header {
    		flex-direction: column;
    	}
    }
    ```

## Consequences

### Positive Consequences

- **Instant Visual Scanning**: Section titles stand out immediately during code inspection and file browsing.
- **Architectural Uniformity**: Every Svelte file in the project follows identical structural conventions in its `<style>` block.
- **Clearer Responsive Logic**: Media and container queries are prominently labelled, preventing duplicate or misplaced queries.
- **Easier Refactoring**: Grouped rules make extracting subcomponents or modifying specific UI areas much faster and safer.

### Negative Consequences / Trade-offs

- **Minor Line Count Increase**: Adding dividers and variant notes increases stylesheet line count slightly, but improves developer ergonomics substantially.
