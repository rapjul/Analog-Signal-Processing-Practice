---
status: draft
date: 2026-10-15
decision-makers: [SignalLab maintainers]
consulted: []
informed: []
---

# 36. Verify Transform Answers with Bounded Canonical Forms

## Context and Problem Statement

CTFT and causal Laplace practice need to recognize equivalent answers without
verifying expressions that agree only at selected sample points. Hidden support
changes, distant Gaussian terms, and small additional poles demonstrated that
bounded numerical comparisons cannot establish the required global identity.
This decision refines [`ADR-0004`](./0004-cortexjs-compute-engine-integration.md)
for these two practice graders; CortexJS remains the LaTeX parser.

## Decision Drivers

- Award correctness only when the supported global structure is established.
- Keep reference construction independent of displayed answer text.
- Preserve exact zeros, poles, rates, support boundaries, and impulse locations.
- Recognize common equivalent student answers within bounded browser work.
- Give an honest `unsupported` result when a required identity cannot be proved.

## Considered Options

- Retain numerical grading with additional probes and syntax exclusions.
- Adopt a general symbolic equivalence engine for all submitted expressions.
- Normalize a bounded, explicit language into family-aware canonical forms.

## Decision Outcome

Use bounded canonical forms for CTFT and causal Laplace practice. Construct
required targets from structured problem parameters in
`src/lib/math-engine/canonical-targets.ts`, and normalize submissions separately
with `src/lib/math-engine/canonical-transform.ts`.

Compare rational factors after exact cancellation, exponential structure,
half-line support, and impulses independently. Exact rational arithmetic and
formal constants govern structural choices. Matched nonzero coefficient slots
allow the documented numerical tolerance; extra terms and expected zeros do not.
Numerical samples are secondary diagnostics and cannot promote an answer to
`correct`. Other existing solvers retain their own grading contracts.

Respect the parser's operation names, arities, and operand order rather than
inferring semantics from similar spelling. In particular, `Ln` is natural,
`Log` defaults to base ten and permits an explicit base, and `Lb` is binary.
Constant arguments and bases must satisfy their domains before cancellation or
multiplication by zero can discard them. Both presentation normalization and
boxed AST contracts need direct regression tests.

Keep Laplace residue construction, pole cancellation, and worked coefficients
exact as well. Convert to numerical residues only for diagnostic evaluation;
floating products cannot decide whether a pole exists. The canonical target
reconstructs the cover-up identity independently with AST arithmetic.

### Consequences

- Supported reordered, factored, rationalized, and shifted answers can be
  verified without trusting finite sample agreement.
- Some mathematically equivalent answers remain unsupported. The implementation
  does not provide a general CAS, certified interval proofs, or symbolic limits
  for smooth impulse multipliers whose normalized terms are singular separately.
- Parser changes require operation-level contract tests. Library parsing does
  not imply that every emitted operation is supported by practice grading.
- Maintaining a smaller expression language requires explicit resource bounds
  and conservative sign/domain facts rather than additional syntax blocklists.
- The current workflow reports coverage but sets no numerical coverage threshold;
  passing tests and recorded percentages are not a coverage ratchet.

### Confirmation

The supported language, status meanings, limits, and coefficient tolerance are
specified in [`docs/transform-answer-verification.md`](../transform-answer-verification.md).
Unit tests cover parser semantics, independent targets, exact residue metadata,
boxed and malformed inputs, and tolerance boundaries. Seeded properties use
independent integer or rational oracles. A shared adversarial matrix runs in
unit tests and production browser workflows, where rejected answers must remain
unverified with solutions hidden. CI also checks types, imports, formatting,
documentation, coverage, and the production build.

## Pros and Cons of the Options

### Additional Numerical Probes and Syntax Exclusions

- Cheap to extend and accepts many familiar expressions.
- Cannot establish global identity or exclude unsampled poles and transitions.
- Encourages repeated patches for alternate spellings of the same counterexample.

### General Symbolic Equivalence

- Could recognize a broader set of mathematically equivalent answers.
- Requires decisions about branches, domains, distributions, runtime budgets,
  and identities beyond the current practice families.
- May be reconsidered when a broader verified symbolic subsystem is available.

### Bounded Family-Aware Canonical Forms

- Makes the conditions for correctness explicit and independently testable.
- Preserves structural differences even when numerical magnitudes are small.
- Has a deliberately incomplete language; future extensions need identities,
  domain proofs, resource bounds, and adversarial composition tests together.

## More Information

- [`docs/transform-answer-verification.md`](../transform-answer-verification.md).
- [`docs/future-improvements.md`](../future-improvements.md).
- [CortexJS arithmetic operation definitions](https://mathlive.io/compute-engine/reference/arithmetic/).
- [PR #7](https://github.com/rapjul/Analog-Signal-Processing-Practice/pull/7).
