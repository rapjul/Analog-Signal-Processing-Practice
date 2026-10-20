---
status: accepted
date: 2026-10-19
decision-makers: [development-team]
---

# 38. ODE Response Decomposition and Structural Grading

## Context

ECE 210 AL2 / ECE 211 C, Fall 2025, Juan Alvarez, Chapter 3 theory notes,
page 6, distinguish the algebraic decomposition into homogeneous and particular
solutions from the decomposition into transient and steady-state responses.
The transient tends to zero; steady-state is what remains. Pages 4–5 separately
define zero-input and zero-state responses by removing the input or initial state.
The supplied course PDF is an external reference and is not redistributed here.

The previous tutor treated every particular solution as persistent, including
decaying exponentials. It also constructed distractors as independent LaTeX
strings, allowing equivalent answers to receive contradictory grades.

## Decision

- Preserve the seven-step practice workflow and the existing stable-system generator.
- Use homogeneous/particular identification for exponential inputs, including resonant inputs. Explain that both contributions decay, so the total response is transient and the steady-state response is zero.
- Retain transient/steady-state identification for generated stable constant and sinusoidal inputs, where the selected particular solution persists.
- Keep zero-input/zero-state decomposition independent of both splits. Homogeneous corrections may vanish when the particular solution already meets zero initial conditions.
- Derive derivative choices, coefficient equations, and their displays from structured mathematical terms. Remove equivalent choices using basis coefficients rather than rendered strings or sample points.
- Preserve the exact root and resonance classification and scaled evaluation established in [ADR 0037](./0037-preserve-exact-ode-classification-and-scaled-evaluation.md). Use a separate roundoff tolerance only when deduplicating teaching coefficients, independently of student answer tolerances.
- Expose derivatives, substitution, coefficient matching, and initial-condition equations in the worked solution for every supported forcing type.

## Compatibility and Verification

Public solver signatures and numeric answer syntax remain unchanged. Step 7 gains
the discriminant `decompositionMode`. Its existing selection fields and option-array
names remain compatible; their displayed meaning follows that mode.

Regression tests cover scaling, cancellation, resonance, degenerate forcing,
distinct answer choices, independent derivative and equation checks, course-aligned
explanations, actual browser submissions, and problem replacement. Unstable and
marginal-system generation remains deferred.
