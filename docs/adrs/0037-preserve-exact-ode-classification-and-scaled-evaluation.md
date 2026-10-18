---
status: draft
date: 2026-10-18
decision-makers: [SignalLab maintainers]
consulted: []
informed: []
---

# 37. Preserve Exact ODE Classification and Scaled Evaluation

## Context and Problem Statement

Linear ODE roots and forced responses can remain representable even when an
intermediate product, normalized coefficient, time power, or exponential tail
overflows or underflows. Relative cancellation tolerances can also turn an exact
nonzero residual into a false repeated root or resonance. These failures affect
both numerical responses and the teaching steps derived from their classification.

## Decision Drivers

- Preserve the mathematical meaning of supplied binary64 coefficients.
- Retain finite final answers without materializing unsafe intermediates.
- Keep existing public signatures, supplied coefficients, and seeded generation.
- Make exact zeros and signed-zero behavior explicit and regression-tested.

## Considered Options

- Normalize all coefficients immediately and apply a relative cancellation bound.
- Infer exact decimal intent or introduce arbitrary-precision arithmetic throughout.
- Classify exact binary products and retain numerical magnitudes in scaled form.

## Decision Outcome

Choose exact binary-product classification with scaled numerical evaluation.
Decode finite binary64 operands into signed integer significands and binary
exponents; sum polynomial and discriminant products exactly before rounding once.
Root multiplicity and resonance require an exact zero residual. A small nonzero
residual remains nonzero, and decimal intent is not inferred from `number` inputs.

Use normalized signed mantissas and unrestricted binary exponents for products,
quotients, response powers, and exponential tails. Restore ordinary binary64
numbers only after compensating factors are combined. Retain original equation
coefficients for classification and preserve the product relation when recovering
the smaller real root. Quadratic constant ratios may exceed the finite range;
their square-root scales remain implicit until final root conversion.

For resonant harmonic angles smaller than `2^-26` in magnitude, retain frequency
and time separately and use `sin(x)/x = 1` to binary64 accuracy. Evaluate both
analytic derivative contributions before final conversion. Outside that interval,
use the existing trigonometric functions. Nonfinite callback inputs retain the
existing IEEE behavior. Select positive or negative zero explicitly when the
final scaled magnitude underflows.

Retain every nonzero harmonic amplitude in the rendered particular solution.
Use the shared fraction format for ordinary values and an ODE-local round-trip
scientific LaTeX fallback when that format would erase a nonzero scalar or emit
raw exponent notation. Apply the same fallback to harmonic frequencies without
changing the shared fraction formatter's contract.

### Consequences

- Exact cancellation is stable under exactly representable common rescalings.
  Decimal rescaling may round the supplied coefficients into a different equation.
- Exact accumulation uses bounded-size `BigInt` arithmetic for fixed-degree ODEs;
  it does not make the entire solver an arbitrary-precision symbolic system.
- Nonfinite supplied coefficients and zero leading coefficients remain invalid.
  Overflowing normalized linear ratios and first-order root ratios remain rejected.
  Final numerical answers outside binary64 range retain IEEE overflow behavior.
- Display fractions, response grading, and seeded random draw order remain separate
  contracts. Small-angle evaluation changes numerical callbacks, not teaching text.

### Confirmation

Numerical-limit and scale-invariance tests exercise independent scaled residuals,
exact cancellation, large and subnormal roots, compensated forcing coefficients,
small harmonic angles, derivatives, signed zero, and nonfinite callback inputs.
The deterministic generator matrix covers all public data and sampled callbacks
across 3,072 configurations. Browser tests verify generated grading flows.
Coverage is reported without claiming a numerical threshold that is not configured.

## Pros and Cons of the Options

Immediate normalization is simple but irreversibly loses significant terms.
Relative cancellation bounds cannot establish that a supplied polynomial is zero.
Decimal-intent inference would change the input contract, while general
arbitrary precision would add unnecessary cost to generated practice problems.
The selected approach keeps exact structural decisions and limits extended-range
arithmetic to the fixed-degree numerical operations that require it.

## More Information

- [`ADR-0017`](./0017-centralized-mathematical-latex-formatting.md) governs shared LaTeX formatting.
- [`ADR-0035`](./0035-standardized-lib-path-aliases-for-components-and-solvers.md) governs cross-directory imports.
- [PR #10](https://github.com/rapjul/Analog-Signal-Processing-Practice/pull/10) records the numerical reproductions and approved exact-input policy.
