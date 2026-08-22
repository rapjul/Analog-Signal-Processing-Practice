---
status: accepted
date: 2026-08-22
decision-makers: [development-team]
consulted: []
informed: []
---

# 35. Standardized Absolute `$lib` Path Aliases for Components, Solvers, and Tests

## Context and Problem Statement

As SignalLab's Intelligent Tutoring System (ITS) solvers and UI component hierarchies expanded across multiple domains (ODEs, Fourier Series, Laplace, CTFT, Circuits, Convolution), components and unit test suites exhibited divergent module import styles:

1. **Relative Parent Path Climbing (`../` and `../../`):**
    - Step sub-components in subdirectories (e.g. `src/lib/components/solvers/fourier-series-steps/` and `src/lib/components/solvers/ode-steps/`) frequently used relative parent climbing (`../ode-step-solver.svelte`, `../../ui/Progress.svelte`) to import solver controllers and shared UI elements.
2. **Decomposition and Refactoring Friction:**
    - As monolithic steps were decomposed into sub-components (e.g. Step 7 broken into `OdeStep7PartAZiZs.svelte`, `OdeStep7PartBTrSs.svelte`, `OdeStep7PartCConceptual.svelte`), moving files between directory levels broke relative import paths and required manual path recalculations.
3. **Inconsistent Test Imports:**
    - Tests located in `tests/unit/` occasionally mixed deep relative climbing (`../../src/lib/...`) with SvelteKit's `$lib` path alias (`$lib/...`).

This lack of standardization caused import churn during refactorings and conflicted with the clean ESM directory boundary conventions established in [ADR-0031](./0031-explicit-directory-package-boundaries-and-esm-imports.md).

## Decision Drivers

- **Deterministic Module Resolution:** Ensure uniform, predictable import specifiers across the entire codebase that resolve identically in SvelteKit, Vite, Vitest, and `svelte-check`.
- **Refactoring & File Relocation Resilience:** Enable components, step sub-cards, and test files to be moved, restructured, or decomposed without breaking import trees.
- **Consistent Codebase Aesthetics:** Eliminate ugly, error-prone relative climbing strings (`../../../../components/...`).
- **Standardized Test Suite Structure:** Provide unit and integration tests with direct, invariant access to the `$lib` root namespace.

## Considered Options

- **Option 1: Allow Unrestricted Relative Paths Everywhere (`../`, `../../`):**  
  _(Rejected: Fragile during refactorings, hard to read, prone to depth recalculation bugs when files are relocated)._
- **Option 2: Relative Paths Within Same Domain, `$lib/` Across Domains:**  
  _(Rejected: Ambiguous boundary definitions; developers must constantly judge whether a solver sub-component is "in-domain" enough to use relative parent climbing)._
- **Option 3: Universal `$lib/` Path Aliasing with Strict Local-Only Sibling Exception (`./`):**
    - All cross-directory imports across components, solver controllers, math engines, utilities, and tests MUST use the `$lib/` root alias.
    - Sibling files residing within the _exact same physical directory_ MAY use direct relative `./` imports.
    - Parent climbing (`../` and beyond) is strictly prohibited.

## Decision Outcome

Chosen Option: **Option 3**, because it provides unambiguous, single-rule clarity for humans and AI agents alike, simplifies file movements, and guarantees seamless module resolution across both production code and test suites.

### Architectural Rules

1. **Universal `$lib` Specifier for Cross-Directory Imports:**
    - All component references, solver state controllers, math utilities, and type imports across different directories must begin with `$lib/`:
        ```typescript
        // Correct
        import MathText from "$lib/components/math/MathText.svelte";
        import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
        import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
        import { toFractionLatex } from "$lib/math-engine/fraction";
        ```
        ```typescript
        // Incorrect (relative parent climbing)
        import SubStepBlock from "../ui/SubStepBlock.svelte";
        import type { OdeStepSolverState } from "../ode-step-solver.svelte";
        ```

2. **Strict Sibling-Only Relative Exception (`./`):**
    - Relative imports are permitted **only** when referencing immediate sibling files in the exact same directory:
        ```typescript
        // Correct (direct siblings in src/lib/components/solvers/ode-steps/)
        import OdeStep7PartAZiZs from "./OdeStep7PartAZiZs.svelte";
        import OdeStep7PartBTrSs from "./OdeStep7PartBTrSs.svelte";
        ```

3. **Mandatory `$lib` Usage in Test Suites (`tests/**`):**
    - All unit, DOM, and integration test files in `tests/` must import application code via `$lib/` rather than relative workspace paths:
        ```typescript
        // Correct (in tests/unit/components/SubStepBlock.test.ts)
        import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
        import { generateOdeProblem } from "$lib/math-engine/odes/index";
        ```
        ```typescript
        // Incorrect (relative climbing from tests/ directory)
        import SubStepBlock from "../../src/lib/components/ui/SubStepBlock.svelte";
        ```

## Consequences

### Positive

- **Refactoring Agility:** Sub-components and tests can be created, moved, or refactored into sub-folders without rewriting ancestor import paths.
- **Zero Resolution Ambiguity:** Standardized across Vite bundler, TypeScript language server, `svelte-check`, and Vitest test runner.
- **Clean, Consistent Codebases:** Uniform visual scanning across all component `<script>` blocks and test headers.

### Negative / Trade-Offs

- **Refactoring Legacy Files:** Existing files with legacy `../` climbing must be updated to `$lib/`.
