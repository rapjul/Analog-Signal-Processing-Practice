# Transform Answer Verification

CTFT and causal Laplace PFD practice verify supported global answer forms against
canonical targets constructed from problem parameters. Displayed solution strings
and sampled values cannot establish correctness.

## Supported Forms

- Finite sums of rational factors multiplying polynomial exponential factors.
- Exact polynomial arithmetic, rational cancellation, reordered sums, factoring,
  complex rationalization, and bounded integer powers.
- Affine sine and cosine arguments through Euler identities, normalized sinc,
  and equivalent sine quotients with removable origins.
- Gaussian and time-shift factors for the generated CTFT families.
- Affine Dirac arguments with exact coordinates and independent complex weights.
  Impulse products and division by distributions are unsupported.
- Causal Laplace residue sums, checked separately on negative and positive time.
  Equivalent support factors such as `u(2t)` and `1-u(-t)` are recognized; delayed
  support boundaries outside the current curriculum are unsupported.
- Finite constant roots, logarithms, and absolute values. Variable-dependent
  roots, logarithms, absolute values, tangent, and unknown operations are
  unsupported. Every operand is validated, including operands multiplied by zero.

The scalar algebra retains rational coefficients and formal `pi`, roots,
logarithms, and exponentials during polynomial manipulation. Known quarter-turn
phases and elementary monomial root/log identities are exact. Numerical values of
these constants are used only for coefficient tolerance, range checks, and
secondary diagnostics; decimal lookalikes cannot change exact rates or poles.
Unresolved near-zero constant identities remain unverified. This is a bounded
answer language, not a general symbolic identity engine.

## Correctness and Tolerance

The canonical verifier compares exponential bases, reduced denominators, support
branches, and impulse coordinates structurally. Extra terms or poles are never
discarded for being small. Polynomial cancellation removes factors only through
exact arithmetic.

Laplace support is compared on open half-lines. An isolated convention for the
value at `t=0` does not change a Laplace transform; `u(t)` and `1-u(-t)` therefore
describe the same supported causal transform.

For matched nonzero coefficient slots only, the allowed complex error is
`1e-8 + 1e-8 * abs(expected)`. Expected zero coefficients require exact zero.
Rounded residues remain acceptable in otherwise matching forms; rounded pole
locations, exponent rates, or support boundaries do not.

`correct` means the supported canonical forms match under this coefficient policy.
`incorrect` means recognized forms differ. `unsupported` means the expression
cannot be established within the verification language or its resource limits.
`invalid` covers syntax errors and undefined constants or division by zero.

Optional `numericCheck` records secondary sample consistency, mismatch, or an
inconclusive evaluation. Removable sinc samples can be inconclusive numerically
even when their canonical identity is verified. Numerical agreement never promotes
an unverified answer to `correct`.

## Resource Bounds

- At most 512 logical AST nodes and depth 32.
- At most 64 expanded basis terms or distribution terms.
- Polynomial degree at most 16.
- Expanded variable integer powers have magnitude at most 16.
- Exact rational coefficient components and numeric literals are bounded to 4096
  digits; literal exponent expansion and constant integer exponents are bounded
  to magnitude 4096.
- Constant-function evaluation must remain finite. Exponential or root underflow
  cannot erase a mathematically nonzero term; such forms remain unverified.

Exceeding a bound produces a diagnostic, never a partially verified answer.

## Regression Contract

The shared adversarial matrix in `../tests/fixtures/transform-adversaries.ts` covers
equivalent spellings of hidden transitions, logarithm/exponential compositions,
distant Gaussian bumps, tiny extra poles and basis terms, masked invalid operands,
and unsupported functions. Unit and production browser checks use the same matrix.
Seeded family tests cover generated parameters, shifts, cancellations, decimal
residues, and independence from displayed answer text. Contract tests also cover
boxed MathJSON, exact symbolic cancellation, tolerance boundaries, and limits.
