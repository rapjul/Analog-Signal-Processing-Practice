---
status: accepted
date: 2026-08-20
decision-makers: [development-team]
consulted: []
informed: []
---

# 30. Modular ITS Step Scaffolding Builder Architecture

## Context and Problem Statement

In SignalLab, each practice problem generator produces not only the core problem statement and analytical solutions, but also multi-tier Intelligent Tutoring System (ITS) scaffolding data for interactive stepped guidance. For Linear Constant-Coefficient (LCC) Ordinary Differential Equations (ODEs), this scaffolding includes:

1. **Step 1:** Characteristic equation formulation, expected coefficients, and operator power hints.
2. **Step 2:** Factoring vs. quadratic formula branching, discriminant verification, and root classification.
3. **Step 3:** Homogeneous solution template selection, exponential/trigonometric forms, and distractor options.
4. **Step 4:** Particular solution trial ansatz guesses with resonance detection and distractor options.
5. **Step 5:** Multi-part derivative evaluations, undetermined coefficient linear systems, and grouping hints.
6. **Step 6:** Homogeneous target values from initial conditions and simultaneous linear systems for constants.
7. **Step 7:** Dual decomposition (Zero-Input vs. Zero-State, Transient vs. Steady-State) and randomized conceptual mastery question pools.

Previously, all seven step scaffolding pipelines were implemented inside a single monolithic generator file (`src/lib/math-engine/odes/generator.ts`, spanning 1,532 lines). This tight coupling created high cognitive load, made unit testing individual pedagogical steps cumbersome, and hindered maintainability.

## Decision Drivers

- **Single Responsibility & Modularity:** Isolate each pedagogical step's distractor synthesis, hint generation, and algebraic formulation into a dedicated, focused module.
- **Maintainability & File Size:** Keep all math engine files compact (< 400 lines) and easily readable.
- **Independent Step Testability:** Allow direct unit testing and benchmarking of specific step scaffolding logic without generating full problem instances.
- **Reusability Pattern for Other Domains:** Establish a standard, reproducible scaffolding architecture for upcoming domains (Fourier Series, Laplace Transforms, Circuit Analysis, and Continuous-Time Convolution).

## Considered Options

- **Option 1: Monolithic Generator:** Retain all step generation logic inside a single `generator.ts` file (> 1,500 lines).
- **Option 2: Inline Generation inside Svelte Components:** Move scaffolding generation out of the math engine into individual Svelte step components.
- **Option 3: Modular Step Builder Package (`its-scaffolding/step[1-7].ts`):** Break scaffolding into dedicated step builders under `src/lib/math-engine/odes/its-scaffolding/`, orchestrated by a lightweight `generator.ts` and unified via `types.ts`.

## Decision Outcome

Chosen Option: **Option 3**, because it preserves pure mathematical separation of concerns (keeping all pedagogical math generation in pure TypeScript outside the UI layer) while decoupling complex algebraic step construction into clean, modular files.

### Architectural Layout

```
src/lib/math-engine/odes/
├── types.ts                        # Pure domain models, problem specs, and step data contracts
├── solver.ts                       # Pure analytical math solvers (roots, particular, constants)
├── generator.ts                    # Constructive synthesis orchestrator (~340 lines)
├── its-scaffolding/
│   ├── step1-char-eq.ts            # Step 1: Characteristic equation data builder
│   ├── step2-roots.ts              # Step 2: Factored form & quadratic formula builder
│   ├── step3-homogeneous.ts       # Step 3: Homogeneous solution template builder
│   ├── step4-ansatz.ts             # Step 4: Particular solution trial ansatz builder
│   ├── step5-coefficients.ts      # Step 5: Derivatives & linear system builder
│   ├── step6-initial-conditions.ts # Step 6: Homogeneous target values & constants builder
│   ├── step7-decomposition.ts      # Step 7: Response decomposition & concept quiz pool
│   └── index.ts                    # Barrel export for scaffolding builders
└── index.ts                        # Public domain entry point
```

### Key Responsibilities

1. **`generator.ts` (Orchestrator):**
    - Synthesizes valid root pairs, leading coefficients, and forcing inputs via backward constructive synthesis.
    - Evaluates exact analytical solutions by calling `solver.ts`.
    - Delegates ITS data formulation to `buildStep1Data()`, `buildStep2Data()`, ..., `buildStep7Data()`.
    - Assembles and returns the immutable `OdeProblem` structure.
2. **`its-scaffolding/step[N].ts` (Step Builders):**
    - Pure functions accepting problem parameters and analytical solutions.
    - Generate exact symbolic LaTeX equations, options, randomized distractors, and progressive hint trees for that specific step.
3. **`types.ts` (Contracts):**
    - Centralizes all step data interfaces (`OdeItsStep1` through `OdeItsStep7`, `OdeItsConceptQuestion`) to prevent cyclic dependencies.

## Consequences

### Positive

- **Reduced File Complexity:** Reduced `generator.ts` from 1,532 lines down to ~340 lines.
- **Isolated Pedagogical Refinement:** Educators and developers can adjust hints, distractors, or step explanations in a single file without risking regressions in core solver math.
- **Zero Framework Coupling:** Step data generation remains 100% pure TypeScript, allowing fast headless execution and Vitest verification without DOM overhead.

### Negative / Trade-Offs

- **Module Count:** Adds 8 new TypeScript files under `src/lib/math-engine/odes/its-scaffolding/`, requiring an internal barrel file (`index.ts`) for clean re-exports.
