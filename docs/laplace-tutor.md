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
optional first hints. Single-choice cards check on activation, explain successful
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
equations and every meaningful elimination row; decomposition templates check every denominator power and numerator
shape. Alternative paths are conditional tutor tasks, not changes to serialized
problem configurations.

Hints use the shared `HintDisclosure` presentation and explicit task-family
teaching: concept, current setup, and an explained worked intermediate. There is
no generic fallback hint generator. Concepts appear in Hint 1, followed by a current-expression setup and an explained intermediate calculation, rather than a repeated always-visible lesson. Zero polynomials and constants have dedicated guidance. Assistance cannot check or advance tasks.
Completed summaries show verified mathematical results directly. Single-question
stages omit redundant part labels; multipart stages use step-aware alphabetic
labels. Fixed equation labels and mixed prose/math use `MathText`.

The problem statement explicitly names the requested result. System inverse
problems use `h(t)`, signal inverses use `x(t)`, forward problems request `X(s)`,
and initial-value problems request `y(t)`. Matching labels are accepted on answers.
Unary negative impulses, subtraction, and explicit negative coefficients have
the same exact meaning; undefined distribution products remain unsupported.

Cancellation remains a checked decision on every rational-analysis path. After
a correct no-cancellation decision, original verified roots carry forward as
zeros and poles without re-entry. Changed surviving sets still require checked
construction. Canceled locations and multiplicities establish copy totals once.
Derived conclusions appear only after checked source work and **Continue**;
they are not additional independently completed tasks. Restart clears them.

Direct standard pairs omit redundant numerator rewriting. Related new pair
parameters share one checked fields card, while verified coefficients, pole
locations, and repeated delays carry forward. Factorial normalization, sine
frequency normalization, and left-sided signs still require calculation. The
single-pole direct-pair regression has fourteen checked tasks rather than twenty-one.

Completion diagrams use the combined response for forward/ODE zeros. Exact
rational linear and quadratic locations retain multiplicity. Other zero sets
show their exact formula or defining polynomial and explain unplotted locations.
Different delay blocks explicitly disclaim a finite polynomial-zero list.
Impulse arrows follow signed weights; zero-weight coincident impulses disappear.
Regular-response plots sample inside every distinct support interval, including
near each boundary. Paths do not bridge jumps, and rounded segment ends keep
short nonzero segments visible even when their width is below a screen pixel.
Coincident impulses combine by exact location and weight after canonicalizing
their unused shape fields. Elimination instructions explicitly identify row
exchanges already incorporated in the displayed system, so learners apply only
the remaining arithmetic operation.
The exported `LaplacePlot` contract names the response samples, exact zero
information, root markers, and signed impulse markers shared by rendering and tests.
The labeled vertical scale follows the sampled response magnitude, including
amplitudes below one; an identically zero response uses a finite unit-scale fallback.

Shared links return the complete preflight-validated exercise to the route, so
loading a link constructs and validates its task plan only once.
Client-side navigation between shared Laplace URLs loads the destination problem,
workflow, and custom-input draft before synchronizing its URL. Malformed
destinations retain the previous valid exercise and display the request error;
Back/Forward navigation and reloads use the destination configuration.

Development-only visual scenes identify the exact task, accepted strategy branch,
hint tier, and capture phase. Prerequisites and diagnostic drafts pass through
the same validators used by ordinary practice. The screenshot suite covers all
four workflows and checks each registered scene against an independently derived
task inventory. Keyboard E2E checks use ordinary controls and preserve explicit
Continue and assistance tracking. See the [testing guide](./development-and-testing.md)
for capture and comparison commands.

Construction checks diagnose all provable errors by row and field, including signs, multiplicities, duplicate terms, and numerator/denominator confusion. Edits preserve drafts and clear stale diagnostics. See [ADR 0039](./adrs/0039-laplace-checked-construction-and-interval-evidence.md) for the distinction between structural evidence and final equality checks.

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
termwise pairs. Learners check which terms are active and their combined ordinary expression on every exact open support interval before assembling the supported signal. Step functions must be evaluated in interval fields; impulses remain separate distributions. A complete signal with no open ROC remains unsupported.
Completion cancellation markers compare the original least common denominator
with the complete response's surviving poles. Block-specific reductions remain
inside their derivations. Removed copies and surviving pole multiplicities are
listed separately when cancellation is partial.

Unit tests check independent standard-pair fixtures, fractional delays, repeated
and complex poles, near-cancellation, both cancellation decisions, equivalent
answers, impulse jumps, and agreement with the completed ODE solver. Production
browser tests complete all four workflows through ordinary controls and cover
assistance, replacement, invalid custom input, narrow layouts, and offline use.

URL synchronization serializes an already validated exercise without rebuilding
its task plan. Untrusted configuration serialization and parsing retain their
full mathematical preflight checks. Invalid shared links explicitly identify the
last valid or default exercise shown below the diagnostic.
