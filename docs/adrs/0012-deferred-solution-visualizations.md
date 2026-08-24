---
status: accepted
date: 2026-08-14
decision-makers: [development-team]
consulted: []
informed: []
---

# 12. Deferred Solution Visualizations and Post-Solve Verification

## Context and Problem Statement

In the initial SignalLab interface, heavy interactive canvas visualizers (such as `FourierCanvas` with live partial sums and harmonic power spectrum bars, or `WaveformCanvas` with multi-curve ODE response plots) were rendered at the top of the practice card or immediately below the problem statement.

Rendering complex analytical visualizers upfront caused several issues:

1. **Sensory & Visual Distraction**: Students confronted busy graphs and interactive sliders before they had even identified the signal's period, symmetry, or characteristic roots.
2. **Cognitive Inversion**: In analog signal processing, physical simulations and frequency spectra are the _outcome_ and _verification_ of mathematical derivation, not the starting point.
3. **Diminished Completion Reward**: When graphs are already visible upfront, solving the mathematical steps provides no visual payoff or satisfying conclusion.

## Decision Drivers

- Maintain student focus on the active algebraic and conceptual derivation steps.
- Distinguish between _essential problem-definition figures_ (e.g. circuit schematics, piece-wise waveform definitions) and _analytical solution visualizers_ (e.g. harmonic spectra, complete response curves, Gibbs phenomenon overshoot).
- Reward successful problem completion with interactive, high-fidelity physical simulations.

## Considered Options

- **Option 1 (Render All Visualizers Upfront)**: Retain canvases at the top of problem cards.
- **Option 2 (Hide Visualizers Entirely Behind Manual Toggle Buttons)**: Hide plots completely unless the student explicitly clicks a toggle button.
- **Option 3 (Contextual Placement: Essential Upfront, Analytical Deferred to Post-Solve)**: Keep only necessary problem-definition figures upfront; reveal analytical solution visualizers in the final post-solve stage upon successfully completing the derivation.

## Decision Outcome

Chosen Option: **Option 3**, because it aligns visual feedback with the natural progression of engineering problem-solving.

### Visualizer Placement Rules

1. **Essential Problem-Definition Figures (Upfront)**:
    - Circuit schematics (e.g. RLC circuits with labeled nodes, switches, initial energy conditions).
    - Input piece-wise waveform plots (e.g. graphs of $x(t)$ where visual geometry is needed to read amplitude or period).
2. **Analytical Solution Visualizers (Deferred to Post-Solve Stage)**:
    - `FourierCanvas.svelte`: Harmonic spectrum line graphs, interactive harmonic count slider ($N=1\dots 50$), and partial sum reconstruction showing Gibbs phenomenon overshoot ($\approx 8.95\%$).
    - `WaveformCanvas.svelte`: Complete multi-curve response graphs plotting $y(t)$, $y_{ZI}(t)$, and $y_{ZS}(t)$.
    - Parseval's Power Theorem metrics and harmonic power distribution tables.
3. **Geometry-Driven Solver Exceptions (Explicitly Requested)**:
    - _Continuous-Time Convolution_: A closed-by-default native `<details>` disclosure may expose the complete geometric animation and output curve before completion. The learner must deliberately open it, and may preview either signal as the reflected and translated signal. This preview remains exploratory until the corresponding tutor choice is explicitly verified.
    - _Circuits_: An early disclosure may contain only the problem-defining circuit and inputs. Analytical circuit responses remain deferred. This exception is architectural guidance and does not require every Circuits solver to implement a disclosure immediately.

## Consequences

### Positive

- Greatly reduces visual clutter and cognitive noise at the start of practice problems.
- Creates engaging "completion reward" when the student finishes the mathematical derivation.
- Keeps canvas rendering and animation overhead out of the initial page mount cycle.

### Negative / Trade-offs

- Students who want to visually explore the waveform response before solving must finish the derivation or use a separate sandbox mode.

### Neutral

- Canvas performance and WebGL/HTML5 2D context rendering logic remain unchanged.
