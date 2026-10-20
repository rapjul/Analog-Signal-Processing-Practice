# Fourier Series correctness contracts

The tutor uses `a0 / 2` as the constant term. Exponential coefficients satisfy
`Fn(0) = a0 / 2`, `Fn(n) = (an(n) - j bn(n)) / 2` for positive indices, and
`Fn(-n) = conjugate(Fn(n))` for real signals. This follows the constant-term
convention in [MIT's coefficient definitions](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/73da5807cd279ff863cd8477ec268f99_MIT18_03SCF11_s21_4text.pdf).

## Inputs and numerical limits

- `an` and `bn` accept positive safe integer harmonic indices.
- `Fn` accepts signed safe integer indices, including zero.
- Partial sums and power calculations accept nonnegative safe integer limits.
- Amplitude and period must be positive and finite. Parameters producing unrepresentable power, a nonfinite angular frequency, or a zero quarter-period are rejected.
- Power ratios and harmonic thresholds use amplitude-normalized coefficients to avoid dependence on the signal's amplitude scale.
- Period and frequency inputs are evaluated as constant expressions before unit conversion and tolerance checks. Use `pi/2` or `(1/2)*pi` for half of pi; `1/2pi` is evaluated as a reciprocal expression.

## Guided derivation

Origin parity and half-wave symmetry are independent. Origin parity can eliminate
an entire sine or cosine family. Half-wave symmetry additionally eliminates DC
and even harmonics; the tutor carries these known zeros instead of asking for
their integration again. Absence of origin parity does not imply that every
individual harmonic is nonzero.

The default representation follows the existing symmetry recommendation.
`generateFourierSeriesProblem` also accepts `primaryForm: "trig"` or
`primaryForm: "exp"` for authored exercises. Questions, hints, conversions, and
worked solutions follow that assigned path. Either representation remains
mathematically valid.

Only options belonging to the active question are graded. Fresh problem or
conversion objects reset progress even when they reproduce the same identifiers
and formulas. Completion is emitted once per solved attempt.

## Reconstruction and accessible spectrum

The spectrum includes DC and every positive harmonic through the selected limit,
up to `N = 50`. Each positive-frequency pair contributes `2 |Fn|²` to average
power; DC contributes `|F0|²`. The coefficient table reports real and imaginary
parts, magnitude, phase, and paired power. Zero coefficients have undefined phase,
shown as an em dash.

Ideal jump values use the right-hand waveform limit. Fourier partial sums converge
to the midpoint of the left and right limits at a jump. Gibbs overshoot persists
near jumps while its spatial width shrinks. Sampled curves are cached separately
from canvas dimensions and spectrum animation; reduced-motion users receive the
final spectrum without animation.

## Automated verification

`../tests/unit/fourier-series-math-contracts.test.ts` integrates displayed setup
formulas and independently samples actual piecewise coefficient and compact-phase
definitions. It also checks signed exponential coefficients against waveform
quadrature. `../tests/unit/fourier-series-tutor-contracts.test.ts` checks assigned
paths, symmetry shortcuts, stale choices, and single completion.

`../tests/e2e/fourier-series-correctness.spec.ts` completes all waveform families using
ordinary UI controls, including both conversions and all 51 spectrum rows. These
cases also run against production output and mobile viewports. Component tests
cover focus transfer, identical-object-content resets, reduced motion, and sample
reuse during canvas redraws.
