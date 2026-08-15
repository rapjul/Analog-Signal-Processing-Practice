---
status: accepted
date: 2026-08-14
decision-makers: [development-team]
consulted: []
informed: []
---

# 13. Canonical Taxonomy Ordering and Distractor Randomization Policy

## Context and Problem Statement

When designing multiple-choice checkpoints for Intelligent Tutoring Systems, a key design challenge is whether options should be randomly shuffled on every problem generation or maintained in a fixed order.

Two competing failure modes exist:
1. **The Scrambling Failure Mode**: If standard mathematical categories (e.g. *Symmetry: Even, Odd, Neither*) are randomly scrambled every time, students experience unnecessary cognitive friction hunting for the correct button, breaking muscle memory and mental momentum.
2. **The Positional Guessing Failure Mode**: If synthetic mathematical calculation options (e.g. 4 different generated integral formulas) maintain a fixed order, students can memorize positional answer keys (e.g., "Option A is always correct for square waves") without engaging with the mathematics.

## Decision Drivers

- Foster cognitive fluency and muscle memory for standardized engineering classifications.
- Eliminate visual search fatigue on repetitive categorical questions.
- Prevent positional memorization and superficial guessing on mathematical calculations.
- Maintain consistency with standard engineering textbooks and ECE 210 lecture conventions.

## Considered Options

- **Option 1 (Universal Randomization)**: Shuffle all multiple-choice options, chips, and buttons across every step on every problem generation.
- **Option 2 (Universal Fixed Ordering)**: Keep all multiple-choice options in a fixed, static order across the entire application.
- **Option 3 (Hybrid Policy: Canonical Categorical Ordering + Algorithmic Distractor Randomization)**: Maintain fixed, canonical logical order for standard mathematical taxonomies, while dynamically shuffling synthetic distractor equations and calculation formulas.

## Decision Outcome

Chosen Option: **Option 3**, because it preserves muscle memory and visual ergonomics where taxonomy is standardized, while enforcing genuine analytical evaluation where calculations are tested.

### Rules of Application

#### 1. Fixed Canonical Logical Ordering (Never Shuffled)
Standard classifications and mathematical taxonomies must always be displayed in their standardized, predictable order:
- **Symmetry**: `Even` $\rightarrow$ `Odd` $\rightarrow$ `Neither` $\rightarrow$ `Half-Wave Odd`
- **Fourier Representation**: `Trigonometric Form` $\rightarrow$ `Exponential Form` $\rightarrow$ `Compact Form`
- **ODE Damping Regime**: `Distinct Real (Overdamped)` $\rightarrow$ `Repeated Real (Critically Damped)` $\rightarrow$ `Complex Conjugate (Underdamped)`
- **Particular Solution Ansatz**: `Constant` $\rightarrow$ `Exponential` $\rightarrow$ `Sinusoidal (Pair)` $\rightarrow$ `Resonant (t Multiplier)`
- **Units**: `s` $\rightarrow$ `rad/s` $\rightarrow$ `Hz`
- **Natural Numerical Sequences**: Ordered root values ($r_1 > r_2$), harmonic indices ($n=1, 2, 3$).

#### 2. Algorithmic Distractor Randomization (Always Shuffled)
Synthetic multiple-choice options generated with algebraic variations and distractor errors must be randomly shuffled on generation:
- **Integral Setup Formulation**: 4 generated integral cards with variations in bounds, scaling constants ($2/T$ vs. $1/T$), and parity.
- **Final Summation Expressions**: 4 generated series formulas containing common student algebraic mistakes (sign errors, missing DC offset $a_0$, incorrect integration-by-parts constants).

## Consequences

### Positive
- Students quickly build muscle memory for categorical selection without UI hunting.
- Prevents game-playing or positional memorization on calculation-heavy checkpoints.
- Aligns UI layouts with standard textbook and lecture presentation order.

### Negative / Trade-offs
- Requires developers to distinguish between categorical options (fixed) and synthetic distractor sets (shuffled) in problem generators.

### Neutral
- All incorrect options continue to carry diagnostic misconception strings explaining the mistake when selected.
