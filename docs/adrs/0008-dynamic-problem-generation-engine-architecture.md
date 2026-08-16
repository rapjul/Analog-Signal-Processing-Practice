---
status: accepted
date: 2026-08-13
decision-makers: [development-team]
consulted: []
informed: []
---

# 8. Dynamic Problem Generation Engine Architecture

## Context and Problem Statement

SignalLab previously relied on two distinct, conflicting practice problem creation models:

1. **Analytical Parameterized Generators**: Used in the Linear Constant Coefficient Ordinary Differential Equations engine (`src/lib/math-engine/odes.ts`), where problems, solution step breakdowns, and reference answers are dynamically synthesized from randomized parameters ($r_1, r_2, K, p, \omega, y_0, y'_0$).
2. **Static Handcrafted Arrays**: Used in CTFT (`fourier-transform-bank.ts`), Laplace (`laplace-bank.ts`), Circuit Analysis (`circuits-bank.ts`), Fourier Series (`fourier-series.ts`), and Convolution (`convolution.ts`), where problems were restricted to fixed arrays or hardcoded parameter values.

Static problem banks severely restrict practice capacity, creating repetitive student experiences. Meanwhile, the analytical solvers for transfer functions $H(s)$, Laplace Partial Fraction Decompositions, continuous convolution piecewise integrals, and CTFT transform pairs already contained the necessary mathematical logic to solve problems dynamically.

## Decision Drivers

- **Infinite Practice Experience**: Students must be able to generate unlimited practice problems across every ECE 210 topic without running out of variations.
- **Architectural Consistency & DRY**: All math engine modules must follow a unified problem generation pattern (`generate<Domain>Problem()`).
- **Mathematical Rigor & Exact Solutions**: Synthesized problems must always produce exact symbolic expressions (e.g. fractions $\frac{a}{b}$, radicals, $\pi$, $e$) for KaTeX outputs while supplying exact numerical evaluation functions for canvas/chart plotting.
- **Zero-Guesswork Step Breakdown**: Generated problems must dynamically construct intermediate algebraic step breakdowns matching ADR 0006 standards.

## Considered Options

- **Option 1**: Keep static hardcoded problem banks for Fourier, Laplace, Circuits, and Convolution, while using dynamic generation only for ODEs.
- **Option 2**: Maintain static problem banks as a legacy fallback and add random index selectors over the fixed array.
- **Option 3**: Standardize on **Dynamic Parametric Math Engines** across all domains, using static exam banks (`*_EXAM_BANK`) exclusively for historical UIUC ECE 210 exam problem references.

## Decision Outcome

Chosen Option: **Option 3**, because it unifies the web application under a single architectural standard, provides endless dynamic problem generation for students, and maximizes reusability of existing math engine solver functions.

### Engine Specification & Patterns

Every math engine module (`odes.ts`, `laplace.ts`, `fourier-transform.ts`, `circuits.ts`, `convolution.ts`, `fourier-series.ts`) must implement:

1. **Parameter Synthesizer**: Randomizes coefficients, frequencies, poles, component values, or waveform parameters within well-behaved ECE 210 bounds (e.g., distinct integer poles $p_i \in [-5, -1]$, clean corner frequencies $\omega_c$, or standard pulse widths).
2. **Analytical Derivation**: Invokes symbolic solvers (`evaluatePfdResidues`, `evaluateTransferFunction`, `computeFourierCoefficients`, etc.) to derive exact reference answer strings and solution steps.
3. **Dual Representation**:
    - `promptLatex` & `referenceAnswerLatex` formatted for KaTeX.
    - `eval(t)` numerical closures for live graph rendering.
4. **Historical Bank Preservation**: Handcrafted exam problems remain in `*_EXAM_BANK` as curated reference suites.

## Consequences

### Good

- **Endless Student Practice**: Users can click "Generate Next Problem" infinitely across all 6 core SignalLab topic modules.
- **Single Source of Truth**: Eliminates duplication between static step text and engine calculations.
- **Full Alignment with ECE 210 Standards**: All step derivations follow exact symbolic formatting ($\frac{a}{b}$, $\operatorname{rect}$, $\operatorname{sinc}$, $\operatorname{Re}$) per ADR 0005 and ADR 0007.

### Trade-offs & Considerations

- **Parameter Bounds Validation**: Parameter generators must be carefully constrained to avoid ill-conditioned numerical scenarios (e.g., divide-by-zero, overlapping poles in single-pole PFD routines).
- **Refactoring Scope**: Requires updating generator functions in `laplace.ts`, `fourier-transform.ts`, `circuits.ts`, `convolution.ts`, and `fourier-series.ts`.
