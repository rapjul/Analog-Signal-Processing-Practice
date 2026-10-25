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

The original implementation used ten commits: roadmap, bank retirement, engine
extraction, expanded mathematics, inverse tutoring, forward/ROC tutoring, ODE
tutoring, custom configuration, completion/reference views, and production
integration. Subsequent teaching improvements retain those commits and include
automated tests alongside their behavior changes.

## Beginner teaching and answer construction

The tutor assumes arithmetic and introduces algebra and transform vocabulary in
brief explanations. Single-choice cards check on activation, explain successful
answers, and wait for **Continue**. Incorrect answers retain their drafts and
receive feedback without mandatory remedial exercises.

Factoring uses an outside gain and learner-added **Linear** or **Quadratic**
templates. Learners enter signed coefficients and powers directly; LaTeX typing
is not required. Exact structural checks reject an unchanged reducible polynomial.
Root rows are also learner-added and check unordered locations, conjugate pairs,
and multiplicities. Constants and the zero polynomial have explicit treatments.
Combined forward/ODE numerators may have nonrational zeros: quadratic-formula
fields retain exact radicals, and higher-degree zero sets retain their exact
defining polynomial instead of claiming a rational location list.

Degree comparisons and common-copy counts provide evidence for division and
cancellation decisions. Supported inversion paths include direct pairs and
properties, shifted-square rewriting, and partial fractions using either cover-up
or coefficient matching when applicable. Matching includes checked coefficient
equations; decomposition templates check every denominator power and numerator
shape. Alternative paths are conditional tutor tasks, not changes to serialized
problem configurations.

Hints use the shared `HintDisclosure` presentation and explicit task-family
teaching: concept, current setup, and an explained worked intermediate. There is
no generic fallback hint generator. Assistance cannot check or advance tasks.
Completed summaries show verified mathematical results directly. Single-question
stages omit redundant part labels; multipart stages use step-aware alphabetic
labels. Fixed equation labels and mixed prose/math use `MathText`.

## Code organization

Derivative practice first checks the general unilateral rule, then asks learners
to fill blank initial-condition slots in that verified equation. Coefficients
are checked independently, including exact zero and fractional values. Hints
preserve drafts and cannot validate fields. Restarting begins a fresh attempt.

Expression controls display a fixed equation label and preview one complete
equation. Learners may enter a bare right-hand expression or include its matching
label. Laplace time answers also accept `x(t)=` and `y(t)=`; transform answers keep
`X(s)=`, `Y(s)=`, and `H(s)=`. Unrelated and chained assignments are rejected
locally, without changing other solvers' answer languages.

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
When the original forward components have disjoint ROCs, the tutor first proves
the complete signal's convergence from its surviving tails, independently verifies
an equivalent support combination, and teaches that rewriting before applying
termwise pairs. A complete signal with no open ROC remains unsupported.
Completion cancellation markers compare the original least common denominator
with the complete response's surviving poles. Block-specific reductions remain
inside their derivations. Removed copies and surviving pole multiplicities are
listed separately when cancellation is partial.

Unit tests check independent standard-pair fixtures, fractional delays, repeated
and complex poles, near-cancellation, both cancellation decisions, equivalent
answers, impulse jumps, and agreement with the completed ODE solver. Production
browser tests complete all four workflows through ordinary controls and cover
assistance, replacement, invalid custom input, narrow layouts, and offline use.
