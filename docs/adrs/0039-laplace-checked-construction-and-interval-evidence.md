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

## Consequences and Verification

Guided paths contain more calculation tasks but introduce no mandatory remedial exercises. Existing canonical transform comparison remains shared and unchanged; Laplace interval validation adds local restrictions. Unit, component, and production browser tests cover structured errors, elimination operations, exact interval boundaries, assistance, continuation, keyboard access, and narrow layouts.
