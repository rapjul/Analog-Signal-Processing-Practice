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
