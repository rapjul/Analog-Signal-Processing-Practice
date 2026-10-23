# Guided CTFT Practice

The `/fourier-transform` route teaches four course families: rectangular pulses,
causal exponentials, Dirac deltas, and cosines. `CTFT_COURSE_FAMILIES` supplies both
the selector and recognition choices. Gaussian signals remain supported by the
mathematical engine, validators, and internal lessons, outside course practice.

- **Derivation** has six stages: pair identification, parameter extraction,
  derivation setup, base-transform evaluation, operational-property application,
  and final assembly.
- Derivation requires intermediate algebra before base-transform assembly:
  rectangular antiderivatives, endpoint subtraction, sine conversion, and the removable limit;
  exponential antiderivatives and both boundary contributions; delta sifting and exponential evaluation;
  and cosine Euler coefficients, exponential impulse weights, and scaling.
  The completed solution includes the full parameter-derived equation chain.
- **Pairs & Properties** has five stages. It omits derivation setup, displays the
  selected symbolic transform pair, and requires parameter substitution.
- Changing modes preserves the signal and parameters but clears the attempt.
  Signal changes and replacement problem objects clear all progress,
  hints, feedback, completed solutions, and spectra.
- Full worked solutions and spectrum plots are mounted only after every active
  task passes verification. Hints provide conceptual guidance while solving.

The convention is angular frequency in radians per second, forward kernel
$e^{-j\omega t}$, inverse factor $1/(2\pi)$, and normalized
$\operatorname{sinc}(z)=\sin(\pi z)/(\pi z)$ with value one at zero.

## Guided Workspace

Problem instructions use normal prose with inline mathematics; the signal block
contains only the generated `signalLatex` equation. The legacy `promptLatex`
remains available to existing consumers. Forward and inverse definitions and
normalized sinc live in the shared formulas drawer, with CTFT shown first on this
route. The page retains a short convention note, copyable `omega` and `w` aliases,
and task-specific identities. Setup hints describe the forward transformation in
terms of the selected family without requiring knowledge of the word "kernel".

`GuidedSolverWorkspace` in `../src/lib/components/ui/GuidedSolverWorkspace.svelte`
accepts typed Svelte snippets for the exercise, optional verified results, and
optional supplied identities. It owns layout only; the consuming solver owns
verification and chooses which previously accepted results are relevant.
“Results so far” contains accepted work, while “Useful identity” contains supplied
formulas. Context precedes the exercise in reading order, appears beside it on
wide containers, and stacks above it on mobile. Future answers are never passed
into the results snippet.

Choice cards check immediately on activation. Typed exercises use the standard
shared `SolverCheckButton` primary action with task-specific labels. Scalar rows
use the named exercise container: labels and inputs align at widths of at least
`18rem` and stack below that width. Scalar inputs stay compact and do not duplicate simple
numbers in a preview. Multipart labels use letters such as **Part 4A**; singleton
stages have no part badge. Accepted rational arithmetic is reduced exactly in
read-only summaries. Three progressive hints guide each task, including the
rectangular exponential-to-sine-to-normalized-sinc transition. Delta derivation
does not require re-entering the sampled kernel as the same base spectrum.
Cosine builders associate each location and complex weight in an impulse row.
Completed worked solutions use exact lesson targets rather than tolerance-accepted
approximations; attempt summaries retain the learner's accepted form. Each review
summary visibly names its accepted results without a disclosure control. Input examples render literal notation and copy the
original typing syntax, independently of their display LaTeX.
Answer-form instructions render mathematical notation through the shared wrappers.
Rectangular half-widths stay in reduced fractional form in setup hints, endpoint
bounds, and sine identities, including odd generated widths.

Balanced parenthesized exponents such as `e^(-j omega)` are equivalent to braced
exponents. Empty exponents stay incomplete. Syntax diagnostics refer to original
input ranges; activating an issue selects its source text. Independent detectable
delimiter errors appear together. Parser offsets are used only when source
positions can be retained; uncertain positions are not guessed. Mathematical
remediation remains separate from syntax and cannot establish correctness.

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
Rectangular sample tables include the center, spectral zeros, and intermediate
nonzero lobe values on both sides; undefined phase stays masked at zeros.

Cosine spectra use symbolic arrows and a table of locations, complex weights,
weight magnitudes, and phases. Arrow length does not represent a finite spectral
height. The ordinary pointwise and squared-magnitude APIs reject cosine spectra.

The developer harness reaches named interactive, hint, and diagnostic states by
passing preceding tasks through their real validators. Its autofill never forces
advancement, and production builds do not register the harness. Mathematical,
lifecycle, component, and browser tests cover both paths.

Inverse transforms, additional operational properties, energy and bandwidth
exercises, persistence, and exam-bank integration remain future work.
