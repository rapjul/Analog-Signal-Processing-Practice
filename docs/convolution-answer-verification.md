# Convolution answer verification

The convolution tutor verifies expressions through bounded canonical algebra.
Matching numerical samples cannot mark an answer correct. Steps 3–4 require
global identities; Steps 5–7 compare expressions on the active open output
interval. Infinite limits remain explicit scalar boundary sentinels.

## Supported answers

- Polynomial arithmetic, fractions, factored expressions, and finite sums of
  polynomial-times-exponential terms can be normalized symbolically.
- Affine unit-step factors are accepted only when their value is provably
  constant throughout the verification interval. A support transition inside
  that interval remains unsupported, including transitions beyond the animation.
- Support changes at the endpoints do not affect an open interval identity.
- Unknown operations and variable-dependent roots remain unverified; learners
  should use the supplied polynomial or exponential form.

The verifier returns `correct`, `incorrect`, `invalid`, or `unsupported`.
Only `correct` advances the tutor. `incorrect` means supported forms differ;
`invalid` identifies malformed or undefined mathematics; `unsupported` means
the bounded language cannot prove the answer. The latter two produce validation
feedback rather than claiming that an unproved identity is false.

## Exactness and limits

Rates, support boundaries, and expected zero terms are compared structurally.
Matched nonzero coefficients use the existing canonical tolerance of
`1e-8 + 1e-8 * abs(expected)`. Symbolic exponential shift factors are retained in
the teaching ledger, and zero terms are omitted to keep supplied work compact.

The shared canonical algebra retains its existing limits: 16,384 input code units,
64 grouping levels, 512 AST nodes, AST depth 32, 64 expanded terms, and polynomial
degree 16. Exceeding a limit leaves the answer unverified. Existing CTFT and
Laplace grading contracts are unchanged; see
[`transform-answer-verification.md`](./transform-answer-verification.md).

## Regression checks

Unit tests cover former sample collisions, truncated exponential tails, both
moving-signal paths for every configured signal pair, incorrect input recovery,
and problem replacement. Separate tests compare the displayed exponential
factors and integrated contributions against signal evaluators and quadrature.
Production browser checks exercise rejection and successful completion through
the visible tutor controls.
