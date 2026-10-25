# Laplace guided tutor

The tutor separates inverse transforms, forward transforms, bilateral ROC/system
analysis, and unilateral initial-value problems. Rational analysis always asks
whether cancellation is needed and distinguishes original roots from surviving
zeros and poles, including multiplicity.

## Curriculum and boundaries

- Use exact rational linear factors and nonrepeated real quadratic factors through fourth denominator order.
- Teach repeated real poles through multiplicity four, constant polynomial quotients, ordinary impulses, shifts, and delays.
- Accept up to three supported signal terms, with first- and second-order constant-coefficient ODEs and explicit `0⁻` initial conditions.
- Require an explicit region or support constraint for unique bilateral inverses; assess BIBO stability only for system problems.
- Defer impulse derivatives to the milestone in [the roadmap](./future-improvements.md).

## Architecture and verification

Pure domain mathematics, structured generation, and tutoring scaffolding remain
separate from reactive state and Svelte step components. Verified intermediate
work becomes the input to later tasks. Full-solution assistance never grants
completion. Exact identities establish correctness; sampled plots are diagnostic.

Implementation proceeds in ten commits: roadmap, bank retirement, engine
extraction, expanded mathematics, inverse tutoring, forward/ROC tutoring, ODE
tutoring, custom configuration, completion/reference views, and production
integration. Each behavior change includes corresponding automated tests.

## Code organization

| Responsibility                                                    | Location                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| Exact algebra, partial fractions, pairs, ROC, and ODE mathematics | `../src/lib/math-engine/laplace/`                       |
| Pure workflow and task builders                                   | `../src/lib/math-engine/laplace/its-scaffolding/`       |
| Checked progress and attempt lifecycle                            | `../src/lib/components/solvers/laplace-solver-state/`   |
| Structured configuration and active-task controls                 | `../src/lib/components/solvers/laplace-steps/`          |
| Practice composition and formula reference                        | `../src/lib/components/ui/`                             |
| Verified response and pole-zero/ROC diagrams                      | `../src/lib/components/canvas/LaplaceCompletion.svelte` |
| Retired-bank mathematical examples                                | `../tests/unit/laplace-fixtures.ts`                     |

Consumers use the explicit `laplace/index` entry point. The existing two-pole
API remains in `legacy.ts` for compatibility with its independently exercised
graders; the guided workflows use the focused engine modules.

## Reproducibility and validation

The URL carries an unsigned 32-bit `seed`, configuration version `v=1`, and a
serialized structured `config`. Custom edits remain drafts until every
mathematical task can be checked by the strict answer language. Unsupported
orders, impulse derivatives, undefined distribution products, and unrepresentable
support boundaries receive an explanation before the active exercise changes.

Cancellation uses exact identities and multiplicities. Rational ROC labels retain
exact fractional coordinates, and time verification uses exact endpoints on every
support interval. Numeric projections serve diagrams and diagnostics only.
Final ROC analysis checks surviving infinite tails after combining delayed terms
and ODE contributions, including cancellations that leave finite-duration signals.

Unit tests check independent standard-pair fixtures, fractional delays, repeated
and complex poles, near-cancellation, both cancellation decisions, equivalent
answers, impulse jumps, and agreement with the completed ODE solver. Production
browser tests complete all four workflows through ordinary controls and cover
assistance, replacement, invalid custom input, narrow layouts, and offline use.
