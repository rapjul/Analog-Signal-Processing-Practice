---
status: accepted
date: 2026-08-14
decision-makers: [development-team]
consulted: []
informed: []
---

# 14. Anti-Spoiler Problem Statement Header Design Policy

## Context and Problem Statement

SignalLab problem cards originally featured header badges and subtitles explicitly declaring the problem's mathematical classification:
- *Fourier Series*: Badges declared `"Square Wave (Odd Symmetry, a0=0, an=0)"` or `"Triangle Wave (Even Symmetry, bn=0)"`.
- *Linear ODEs*: Badges declared `"2nd-Order LCC ODE — Distinct Real Roots (Overdamped) with Constant Forcing"`.

Displaying these descriptive badges created a major pedagogical paradox when transitioning to an Intelligent Tutoring System (ITS):
- In Step 1 & Step 2 of the stepped flow, the system asks the student: *"Is the signal Even, Odd, or Neither?"* or *"What is the damping classification?"*
- Because the header badge already spelled out the answer, these questions were trivially spoiled, eliminating the need for student analytical deduction.

## Decision Drivers

- Preserve genuine problem-solving challenges by requiring students to deduce properties directly from the raw mathematical equation.
- Ensure that stepped ITS checkpoints for symmetry, root types, and forcing categories are authentic learning assessments.
- Provide clean, professional challenge headers that state the problem domain without spoiling intermediate steps.

## Considered Options

- **Option 1 (Retain Descriptive Classification Badges)**: Continue showing detailed classification subtitles and badges in headers.
- **Option 2 (Completely Remove Header Titles)**: Show no header or title, presenting only the raw equation box.
- **Option 3 (Anti-Spoiler Challenge Headers)**: Standardize problem headers to declare only the general problem number and domain (e.g. *"Practice Problem: Periodic Waveform"* or *"Practice Problem: 2nd-Order LCC ODE"*), reserving full mathematical classifications for the post-solve breakdown.

## Decision Outcome

Chosen Option: **Option 3**, because it maintains structured page hierarchy and clean metadata while preventing premature disclosure of analytical solutions.

### Anti-Spoiler Header Formatting Standard

| Module | Spoiled Header (Prohibited in Practice Cards) | Anti-Spoiler Header (Required) |
| :--- | :--- | :--- |
| **Fourier Series** | `Square Wave (Odd Symmetry, a0=0, an=0)` | `Practice Problem: Periodic Waveform` |
| **Fourier Series** | `Triangle Wave (Even Symmetry, bn=0)` | `Practice Problem: Periodic Waveform` |
| **Linear ODEs** | `2nd-Order ODE: Distinct Real Roots (Overdamped)` | `Practice Problem: 2nd-Order LCC ODE` |
| **Linear ODEs** | `1st-Order ODE: Resonant Exponential Forcing` | `Practice Problem: 1st-Order LCC ODE` |
| **Circuits** | `Series RLC Circuit (Underdamped Transient)` | `Practice Problem: Series RLC Transient` |

### Prompt Structure

The problem card must present only the essential un-annotated mathematical prompt:
$$\frac{d^2 y}{dt^2} + 4 \frac{dy}{dt} + 3 y(t) = 6, \quad y(0^-) = 2, \quad y'(0^-) = 1$$
$$f(t) = \begin{cases} 1 & -1 < t < 1 \\ -1 & 1 < t < 3 \end{cases}$$

All classification metadata (e.g. *"Root Type: Distinct Real"*, *"Symmetry: Even"*, *"Vanishing: $b_n=0$"*) is revealed only in the **post-solve solution breakdown** after the student has successfully navigated the steps.

## Consequences

### Positive
- Students are required to actively inspect bounds, symmetries, and quadratic discriminants.
- Eliminates trivialized steps in the ITS stepped solver progression.
- Provides a realistic simulation of engineering exams and homework sets.

### Negative / Trade-offs
- Instructors or students browsing for a specific problem subtype must use the generator selector dropdown rather than reading header badges on the active card.

### Neutral
- Generator dropdown selectors (`<select>`) may still list categories when customizing problems, but the rendered problem statement card remains un-spoiled.
