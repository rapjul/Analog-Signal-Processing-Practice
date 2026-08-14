---
status: accepted
date: 2026-08-11
decision-makers: [development-team]
consulted: []
informed: []
---

# 7. ECE 210 Standardized Solution Terminology and Multi-Stage Alignment

## Context and Problem Statement

In SignalLab's ordinary differential equation (ODE) practice modules, solution expressions and step headers previously used inconsistent terms such as "Complete Solution" and "Complete Response" interchangeably when referring to the full system response $y(t) = y_h(t) + y_p(t)$.

In UIUC ECE 210 (Analog Signal Processing), standard course terminology strictly defines:
- **Total Response**: The overall solution $y(t) = y_h(t) + y_p(t)$ combining the **Homogeneous Solution** (natural response $y_h(t)$) and the **Particular Solution** (forced response $y_p(t)$).
- **Zero-Input Response ($y_{ZI}(t)$)**: The response due solely to initial energy / initial conditions $y(0^-), y'(0^-)$ with zero forcing input.
- **Zero-State Response ($y_{ZS}(t)$)**: The response due solely to forcing input with zero initial state ($y(0^-)=0, y'(0^-)=0$).

Furthermore, the multi-stage input UI in [`PracticeCard.svelte`](../../src/lib/components/ui/PracticeCard.svelte) was using outdated headers ("Stage 2: Complete Response") that diverged from both ECE 210 terminology and the 9-step solution breakdown pipeline in [`odes.ts`](../../src/lib/math-engine/odes.ts).

## Decision Drivers

- **ECE 210 Curriculum Alignment**: Ensure all UI labels, step breakdown titles, descriptions, and prompt text strictly adhere to UIUC ECE 210 terminology ("Total Response").
- **Multi-Stage Alignment**: Align interactive input stage labels in `PracticeCard.svelte` with the corresponding steps in the granular 9-step solution breakdown (`odes.ts`).
- **Zero Ambiguity**: Eliminate potential student confusion stemming from mixed usage of "Complete Response", "Complete Solution", and "Total Response".

## Considered Options

- **Option 1**: Retain mixed terminology ("Complete Response" / "Complete Solution" / "Total Response").
- **Option 2**: Standardize all user-facing UI labels, step descriptions, and math engine step pipelines on **"Total Response"** for $y(t)$ and align `PracticeCard.svelte` multi-stage inputs to match `odes.ts`.

## Decision Outcome

Chosen Option: **Option 2**, because standardizing on "Total Response" ensures full pedagogical fidelity to UIUC ECE 210 course conventions and establishes strict structural alignment between the interactive problem stages and the step breakdown pipeline.

### Changes Implemented

1. **Terminology Standardization**:
   - Updated UI stage headers in `PracticeCard.svelte` to read `Stage 2: Total Response y(t)`.
   - Updated solution pipeline step titles and descriptions in `odes.ts` (e.g. *Step 6: Total Response Form*, *Step 8: Solve Constants & Total Response Equation*, and *Step 9: Separation of Responses*) to refer exclusively to the "total response".
2. **Multi-Stage UI Alignment**:
   - `Stage 1: Characteristic Roots (r1, r2)` maps directly to *Step 1: Characteristic Equation & Roots*.
   - `Stage 2: Total Response y(t)` maps directly to *Step 8 & 9: Total Response & Response Separation*.

### Consequences

#### Good
- **Strict Curriculum Fidelity**: Matches UIUC ECE 210 course lecture notes, exam problems, and homework solutions.
- **Unified Learner Mental Model**: Students encounter identical mathematical terms across interactive stage inputs, step breakdown walkthroughs, and plot legends.
- **Seamless Multi-Stage Guidance**: The interactive input stages directly correspond to key milestones in the 9-step solution breakdown.

#### Trade-offs & Considerations
- None.
