---
status: accepted
date: 2026-08-14
decision-makers: [development-team]
consulted: []
informed: []
---

# 10. Intelligent Tutoring System (ITS) Stepped Problem-Solving Architecture

## Context and Problem Statement

SignalLab originally presented practice problems using a monolithic end-goal interaction paradigm: students were presented with an active problem statement and asked to synthesize and input the entire complete mathematical solution in LaTeX via a single submission bar ([`MathInputBar`](../../src/lib/components/math/MathInputBar.svelte)).

While supported by a robust underlying mathematical evaluation engine (LaTeX and a Computer Algebra System (CAS) engine), this monolithic submission model introduced substantial pedagogical friction:
1. **High Cognitive Overhead**: Students confronted the full complexity of multi-tier problems simultaneously without intermediate milestones.
2. **Input and Syntax Friction**: Constructing full multi-term LaTeX expressions (e.g. $\sum_{n=1}^\infty \frac{4}{n\pi}\sin(n\pi/2)\cos(n\pi/2 t)$ or $A e^{r_1 t} + B e^{r_2 t} + y_p(t)$) in a single input field led to syntax errors and parsing ambiguities.
3. **Absence of Intermediate Diagnostic Feedback**: When a submission failed, the system could only report a binary pass/fail message without diagnosing at which stage (root finding, symmetry determination, ansatz choice, integration constant solving) the misconception occurred.

In contrast, reference Intelligent Tutoring Systems (such as the Gemini Canvas solvers) break complex derivations into atomic, sequential checkpoints that mirror authentic pencil-and-paper scratch work.

## Decision Drivers

- Reduce cognitive overload by focusing student attention on one discrete task at a time.
- Provide targeted diagnostic feedback for specific intermediate mistakes (e.g. sign flips, resonance collisions, incorrect integration scale factors).
- Offer multi-tiered progressive hints per stage (*Conceptual Nudge* $\rightarrow$ *Formula Setup* $\rightarrow$ *Partial Calculation*) to assist stuck students without spoiling solutions.
- Maintain high student motivation through progressive momentum and immediate verification.

## Considered Options

- **Option 1 (Retain Monolithic Submission with Passive Breakdown)**: Keep the single [`MathInputBar`](../../src/lib/components/math/MathInputBar.svelte) and rely on passive post-solve [`StepReveal`](../../src/lib/components/ui/StepReveal.svelte) expansion.
- **Option 2 (Multiple-Choice-Only Quiz Paradigm)**: Convert the entire application into a standard multiple-choice quiz, discarding numeric inputs and structured math builders.
- **Option 3 (Active Stepped Intelligent Tutoring System with Hybrid Input Modalities)**: Implement multi-stage stepped solver components (`FourierStepSolver.svelte`, `OdeStepSolver.svelte`, `ConvolutionStepSolver.svelte`, `TransformStepSolver.svelte`, `CircuitsStepSolver.svelte`) that progress sequentially through verified checkpoints using numeric inputs for constants and targeted forms for structural steps, backed by 3-tiered progressive hints and distractor diagnostics.

## Decision Outcome

Chosen Option: **Option 3**, because it combines the rigorous mathematical computation of SignalLab with the proven low-cognitive-load scaffolding of Intelligent Tutoring Systems.

### Key Architectural Provisions

1. **Sequential Step Progression**: Problems are divided into 4–7 focused checkpoints. Future steps remain hidden or locked until the active step is validated.
2. **3-Tiered Progressive Hints**: Every checkpoint includes up to three tiers of hints requested on demand:
    - *Tier 1 (Conceptual Nudge)*: High-level principle or qualitative cue.
    - *Tier 2 (Formula Setup)*: The exact mathematical identity or template to apply.
    - *Tier 3 (Partial Calculation)*: Intermediate arithmetic or worked step.
3. **Misconception-Driven Diagnostics**: Distractor options and error evaluators provide specific feedback explaining *why* an error occurred rather than generic failure notices.
4. **Smooth Focus and Navigation**: The interface automatically nudges active steps into view upon progression and supports keyboard navigation (`Enter` to check/advance).

## Consequences

### Positive
- Drastically lowers barrier to entry and cognitive friction for engineering students.
- Identifies and corrects specific misconceptions at the exact moment they occur.
- Paces problem solving to reflect realistic paper-and-pencil exam workflows.

### Negative / Trade-offs
- Requires richer mathematical metadata per problem (hints, distractor formulas, and diagnostic feedback strings).
- Increases component state complexity to track per-step attempts, hints revealed, and validation statuses.

### Neutral
- The underlying mathematical solvers and CAS evaluators remain the single source of truth for numerical and analytical solutions.
