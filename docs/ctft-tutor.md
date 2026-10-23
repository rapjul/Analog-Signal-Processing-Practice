# Guided CTFT Practice

The `/fourier-transform` route teaches five forward-transform families: rectangular
pulses, causal exponentials, Gaussians, Dirac deltas, and cosines.

- **Derivation** has six stages: pair identification, parameter extraction,
  derivation setup, base-transform evaluation, operational-property application,
  and final assembly.
- Derivation requires intermediate algebra before base-transform assembly:
  rectangular antiderivatives, endpoint subtraction, and the removable limit;
  exponential antiderivatives and both boundary contributions; Gaussian identity
  coefficients and exponent substitution; delta sifting and kernel evaluation;
  and cosine Euler coefficients, exponential impulse weights, and scaling.
  The completed solution includes the full parameter-derived equation chain.
- **Pairs & Properties** has five stages. It omits derivation setup, displays the
  selected symbolic transform pair, and requires parameter substitution.
- Changing modes preserves the signal and parameters but clears the attempt.
  Signal changes, replacement problem objects, and restarting clear all progress,
  hints, feedback, completed solutions, and spectra.
- Full worked solutions and spectrum plots are mounted only after every active
  task passes verification. Hints provide conceptual guidance while solving.

The convention is angular frequency in radians per second, forward kernel
$e^{-j\omega t}$, inverse factor $1/(2\pi)$, and normalized
$\operatorname{sinc}(z)=\sin(\pi z)/(\pi z)$ with value one at zero.

## Validation and State

Lesson construction in `../src/lib/math-engine/ctft-lesson.ts` uses generated
signal parameters. Displayed answer strings cannot establish correctness.
`CtftStepSolverState` owns the active stage and task, rejects stale submissions,
and completes exactly once. Mode and problem changes recreate the controller.

Scalar parameter values and impulse locations use exact comparisons. Complex
weights retain the canonical verifier's existing coefficient tolerance. Ordinary
spectra and phase factors use canonical transform verification. Malformed and
unsupported expressions cannot advance a task; numerical agreement is not proof.
See `./transform-answer-verification.md` for the bounded expression language.

Intermediate expressions use the same canonical verification without numerical
sampling. Pairs & Properties skips these derivation exercises. This follows the
existing shared-substep and canonical-verification architecture; it introduces no
new solver lifecycle or mathematical proof policy.

Cosine exercises check each location and complex weight independently, accept
either row order, reject duplicate locations, and verify the assembled distribution.
For a time shift, the two weights are evaluated separately at their own locations.
Assembly parses each scalar field independently and combines its exact mathematical
value into a canonical distribution. Accepted equation prefixes and whitespace do
not become embedded syntax or consume a second combined text budget. Each field
retains the existing input and verification limits; locations remain exact and
complex weights retain the existing coefficient tolerance.

## Completed Spectra

Ordinary spectra use independently evaluated complex formulas, including translation
phase. Principal phase is masked at numerical zeros; curves break at phase wraps.
An accessible sample table accompanies the plots.

Cosine spectra use symbolic arrows and a table of locations, complex weights,
weight magnitudes, and phases. Arrow length does not represent a finite spectral
height. The ordinary pointwise and squared-magnitude APIs reject cosine spectra.

The developer harness reaches named interactive, hint, and diagnostic states by
passing preceding tasks through their real validators. Its autofill never forces
advancement, and production builds do not register the harness. Mathematical,
lifecycle, component, and browser tests cover both paths.

Inverse transforms, additional operational properties, energy and bandwidth
exercises, persistence, and exam-bank integration remain future work.
