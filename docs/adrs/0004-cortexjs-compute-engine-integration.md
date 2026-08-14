---
status: accepted
date: 2026-08-10
decision-makers: [development-team]
consulted: []
informed: []
---

# 4. Integrate CortexJS ComputeEngine for Symbolic Math Evaluation

## Context and Problem Statement

Validating user-entered mathematical expressions (such as checking whether a user's transfer function $H(s) = \frac{10}{s+2}$ is equivalent to $\frac{20}{2s+4}$ or evaluating differential equation responses) requires robust symbolic parsing, simplification, and numerical evaluation capabilities in JavaScript/TypeScript.

Evaluating user math strictly via string equality fails whenever users enter algebraically equivalent expressions (e.g. `2*t` vs `t*2` or `0.5` vs `1/2`).

## Decision Drivers

- Accurate equivalence checking for user submitted math answers.
- Pure JavaScript/TypeScript browser compatibility without external server dependencies.
- Robust parsing of LaTeX mathematical expressions into symbolic syntax trees.

## Considered Options

- **Option 1**: Basic regex and string matching for answer checking.
- **Option 2**: Math.js library for expression evaluation.
- **Option 3**: CortexJS Compute Engine (`@cortex-js/compute-engine`) for LaTeX parsing, symbolic simplification, and mathematical evaluation.

## Decision Outcome

Chosen Option: **Option 3**, because `@cortex-js/compute-engine` provides specialized LaTeX-to-symbolic conversion, algebraic canonical form simplification, and expression equivalence evaluation natively in client-side TypeScript.

### Consequences

#### Good
- Algebraically equivalent user responses (e.g., simplified vs unsimplified fractions) are scored correctly.
- Provides a strong foundation for future computer algebra system (CAS) features in SignalLab.

#### Bad
- Increases bundle size slightly (`@cortex-js/compute-engine` dependency).
