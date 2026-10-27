---
status: accepted
date: 2026-10-26
decision-makers: [development-team]
---

# 39. Laplace Checked Construction and Interval Evidence

## Context

Exact equality verifies a result but cannot prove that a learner performed a requested factorization, elimination, or support rewrite. The Laplace tutor assumes arithmetic knowledge, so these operations also need explicit instruction and checked intermediate work.

## Decision

- Keep problem serialization unchanged. Internal task descriptors carry structured construction targets and exact open-interval targets for expression fields.
- Match unordered factor/root rows exactly and diagnose all provable errors by field without filling correct values or revealing missing row counts. Clear diagnostics after edits while preserving drafts.
- Derive each meaningful Gauss-Jordan row operation from the independent exact system. Check resulting coefficients and constants before continuing; display exchanges and omit identity operations.
- Before transforming components with disjoint ROCs, check term activity and ordinary expressions on every exact support interval. Reject unevaluated steps and distributions in these fields and retain impulses separately.
- Keep prerequisite concepts in optional first hints, followed by current-expression setup and an explained intermediate. Hints and full reveal cannot validate work.
- Retain semantic equality for final identity checks once structural evidence has already been established.
- Reuse unchanged verified results instead of requiring duplicate entry. A checked cancellation decision may carry original roots forward; changed surviving sets still require construction. Derive copy totals from checked locations and multiplicities.
- Record derived conclusions only after successful source validation and explicit continuation. Group related new pair parameters using the existing fields contract; retain calculations that change coefficients through normalization or sidedness.

## Consequences and Verification

Guided paths retain necessary calculation evidence while avoiding re-entry of unchanged work and introducing no mandatory remedial exercises. Canonical transform comparison remains shared; unary negative Dirac notation receives the same exact interpretation as subtraction, while Laplace interval validation retains local restrictions. Unit, component, and production browser tests cover independent answers, structured errors, elimination operations, exact interval boundaries, derived-result lifecycle, assistance, continuation, keyboard access, and narrow layouts.
