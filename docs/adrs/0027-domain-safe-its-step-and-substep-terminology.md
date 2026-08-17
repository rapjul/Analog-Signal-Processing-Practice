---
status: accepted
date: 2026-08-17
decision-makers: [development-team]
consulted: []
informed: []
---

# 27. Domain-Safe ITS Step and Sub-Step Terminology

## Context and Problem Statement

In the SignalLab application, pedagogical Intelligent Tutoring System (ITS) modules guide learners through multi-step analytical signal processing problems. Complex derivation steps frequently contain intermediate sub-goals, algebraic verification stages, or diagnostic error remediation cycles.

Previously, the term **"Phase"** was colloquially used to describe these intermediate sub-units (e.g., "Phase 1", "Phase 2"). However, in the domain of **Analog Signal Processing and Electrical Engineering (ECE)**, the word **"Phase"** possesses a precise, fundamental mathematical meaning:

1. **Sinusoidal Phase Angle:** $\phi$ or $\theta$ in $x(t) = A\cos(\omega t + \theta)$
2. **Frequency Response Phase:** $\angle H(j\omega)$ in Bode plots and Fourier transfer functions
3. **Phasor Representation:** $\mathbf{X} = |\mathbf{X}|e^{j\theta} = \operatorname{Re}\{\mathbf{X}\} + j\operatorname{Im}\{\mathbf{X}\}$
4. **Phase Velocity & Phase Delay:** $\tau_p(\omega) = -\frac{\theta(\omega)}{\omega}$

Using "phase" as a navigation or workflow descriptor created severe domain collision and cognitive dissonance for engineering students and educators.

## Decision Drivers

- **Domain Integrity & Zero Lexical Collision**: Reserve the term "Phase" exclusively for mathematical and signal processing concepts ($\theta$, $\angle H(j\omega)$, phasors).
- **Pedagogical Hierarchy Clarity**: Distinguish cleanly between top-level problem milestones and their inner sub-goals.
- **Codebase & Architecture Consistency**: Standardize type definitions, state fields, CSS classes, UI badges, and documentation across all solvers.

## Considered Options

- **Option 1: Retain "Phase" for step sub-units**: Keep "Phase 1", "Phase 2" despite domain collision.
- **Option 2: Use "Sub-Step" and "Part" with "Single-Part" vs "Multi-Part" steps**: Ban "Phase" in step progression contexts and standardize on "Single-Part Step", "Multi-Part Step", and "Sub-Step" / "Part".

## Decision Outcome

Chosen Option: **Option 2**, because it completely eliminates domain terminology collisions with electrical signal phase while providing an unambiguous hierarchy for multi-stage problem solving.

### Terminology Standards Table

| Concept                      | Standard Term           | Code Interface                         | UI Display Format                   |
| :--------------------------- | :---------------------- | :------------------------------------- | :---------------------------------- |
| Top-level milestone          | **Step**                | `currentStep: number`, `BaseStepState` | `Step N: [Title]`                   |
| Step without sub-goals       | **Single-Part Step**    | `BaseStepState`                        | _(Standard step card)_              |
| Step with multiple sub-goals | **Multi-Part Step**     | `MultiPartStepState<TSubId>`           | `Step N[Letter]` / `Step N [Badge]` |
| Individual sub-goal          | **Sub-Step** / **Part** | `BaseSubStepState`                     | `Part A`, `Part B` or `Part 1 of 3` |

### Architectural Rules

1. **State Interface Naming:**
    - Multi-part steps implement `MultiPartStepState<TSubStepId>` extending `BaseStepState`.
    - Sub-step units implement `BaseSubStepState`.
    - Banned identifiers: `phase`, `subPhase`, `PhaseState`, `MultiPhaseStepState` in solver progression modules.
2. **UI Badge Standards:**
    - Top-level header badges for multi-part steps use alphabetic suffixes: `Step 5A`, `Step 5B`, `Step 5C`.
    - Sub-step progress indicators use part counting: `Part 1 of 3`, `Part 2 of 3`.
    - Completed sub-step badges render compact read-only confirmations: `✓ Part A: [Summary]`.
3. **Progressive Disclosure:**
    - Completed sub-steps collapse into read-only summary badges.
    - The active sub-step is fully interactive.
    - Future sub-steps remain hidden until unlocked to prevent cognitive overload.
