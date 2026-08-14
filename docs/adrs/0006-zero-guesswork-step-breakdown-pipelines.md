---
status: accepted
date: 2026-08-11
decision-makers: [development-team]
consulted: []
informed: []
---

# 6. Zero-Guesswork Granular Step-by-Step Problem Solution Pipelines

## Context and Problem Statement

In SignalLab, practice problem step breakdowns (such as 2nd-order ODE solutions, Fourier series coefficient derivations, and continuous convolution intervals) previously grouped multiple algebraic manipulations into single summary steps.

For example, when the second-order ODE response breakdowns jumped directly from the characteristic polynomial $s^2 + a_1 s + a_0 = 0$ to final root values $r_1, r_2$, and jumped from initial condition definitions directly to final constants $C_1, C_2$ without showing the system of linear equations.

This would leave students guessing how intermediate expressions were derived between consecutive solution steps, reducing the pedagogical value of the interactive step breakdown feature.

## Decision Drivers

- **Zero-Guesswork Pedagogical Goal**: Students using SignalLab must be able to follow every mathematical transition step-by-step without inferring unstated intermediate algebraic steps.
- **Clarity & Completeness**: Every step breakdown must explicitly show:
  - Factored algebraic forms $(s - r_1)(s - r_2) = 0$ (when roots are integers, including repeated integer roots $(s - r)^2 = 0$) or full quadratic formula substitutions $s = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ (for non-integer or complex conjugate roots).
  - Trial particular solution ansatz $y_p(t)$, its derivatives $y_p'(t), y_p''(t)$, and substitution into the governing ODE.
  - System of linear equations formed when applying initial conditions $y(0^+)$ and $y'(0^+)$.
  - Explicit coefficient values ($C_1, C_2, A, B$) prior to stating the final total, zero-input ($y_{ZI}$), and zero-state ($y_{ZS}$) responses.

## Considered Options

- **Option 1**: Retain compressed 4–5 step summary breakdowns and rely on hints or hover tooltips.
- **Option 2**: Expand problem solution pipelines into fully explicit 9-step granular pipelines that present every algebraic transition, system of equations, and derivative substitution.

## Decision Outcome

Chosen Option: **Option 2**, because it guarantees zero-guessing between steps, aligns with rigorous UIUC ECE 210 problem-solving standards, and provides complete transparency into all mathematical derivations.

### Consequences

#### Good
- **Maximum Pedagogical & Learning Value**: Self-contained step breakdowns eliminate student frustration, cognitive overload, and confusion caused by unstated mathematical jumps ("magic step" phenomenon).
- **Universal Mastery & Skill Transfer**: Teaches robust problem-solving methodology applicable beyond exams to real-world engineering analysis, enabling students to structure complex multi-step derivations independently.
- **Complete Solution Transparency**: Explicitly shows all intermediate calculations across any problem domain:
  - *ODE Analysis*: Characteristic root finding (factored forms $(s-r_1)(s-r_2)=0$ or $(s-r)^2=0$ vs. quadratic formula), trial ansatz derivatives ($y_p', y_p''$), coefficient matching, and linear systems for constants ($C_1, C_2$).
  - *Fourier Analysis*: Integration by parts step-by-step breakdown, trigonometric identity substitutions, and explicit limit evaluations at intervals $[-\frac{T}{2}, \frac{T}{2}]$.
  - *Convolution*: Explicit interval breakdown for overlapping piecewise signals, integrand setup, and antiderivative evaluations.
- **Self-Directed Error Isolation**: Enables students to self-diagnose exact points of error during independent practice without needing external instructor intervention or solution manuals.
- **Consistent Exam & Professional Standard**: Aligns practice solution steps directly with grading rubrics used on ECE 210 Midterm and Final exams, as well as academic homework rigor:
  - Students are required to show full work for 100% credit on written assessments.
  - Reinforces best practice habits for documentation in technical coursework and engineering projects.
- **Seamless Progressive Disclosure**: Works in harmony with `<StepReveal>` component, allowing students to reveal one explicit step at a time as needed.

#### Trade-offs & Considerations
- **UI Vertical Length**: Rendering more granular steps increases card height when fully revealed, which is mitigated by `<StepReveal>` progressive disclosure.
- **Test Maintenance**: Expanding the step pipeline requires maintaining unit test assertions for all steps.
