---
status: accepted
date: 2026-08-11
decision-makers: [development-team]
consulted: []
informed: []
---

# 5. Exact Symbolic Math Representation for Step Breakdown Solutions

## Context and Problem Statement

In SignalLab, step-by-step solution breakdowns (such as 2nd-order ODE responses, Fourier Series coefficients, and continuous convolution intervals) previously evaluated intermediate numerical values into decimal approximations (e.g., `-1.167` or `0.167`).

This caused several issues:
- Loss of mathematical rigor and exactness in practice problem step breakdowns.
- Confusion for students attempting to match symbolic homework answers (e.g., $-\frac{7}{6} e^{-2t}$ or $\frac{1}{6} e^{-2t}$) with rounded decimal strings.
- Inconsistent rounding representation across different fractions (e.g., $1/3$, $1/6$, $1/9$).

## Decision Drivers

- High pedagogical value: students practice ASP using exact fractions, radicals ($\sqrt{N}$), and symbolic constants ($\pi, e$).
- Separation of concerns: exact symbolic presentation for reading/validation vs. precise floating-point evaluation for canvas rendering.
- Low runtime overhead without introducing unnecessary external CAS dependencies.

## Considered Options

- **Option 1**: Keep decimal rounding (e.g., `.toFixed(3)`) for all step-by-step LaTeX expressions.
- **Option 2**: Add a heavy external Computer Algebra System (CAS) package to manage all symbolic expressions.
- **Option 3**: Enforce exact symbolic math representations (fractions $\frac{a}{b}$, radicals $\sqrt{N}$, $\pi$, $e$) in step breakdown LaTeX outputs via a lightweight rational fraction utility, while maintaining exact floating-point numerical calculations for plot/canvas rendering functions.

## Decision Outcome

Chosen Option: **Option 3**, because it preserves exact mathematical representation in step breakdowns without introducing heavy external CAS dependencies or slowing down client-side rendering, while keeping standard floating-point functions (`eval(t)`) intact for high-performance waveform graphing.

### Consequences

#### Good
- Exact, clean LaTeX step output (e.g., $y_{ZI}(t) = \frac{1}{6}e^{-2t} - \frac{1}{6}e^{-8t}$) that matches textbook standard solutions.
- No added bundle weight or runtime latency from external CAS engines.
- Standardized universal workspace rule added to `.agents/AGENTS.md`.

#### Bad
- Math engines must maintain both LaTeX string formatting logic and floating-point evaluation functions (`eval(t)`) for plotting.

#### Neutral
- Unit test assertions must be updated to expect exact LaTeX fraction strings.
