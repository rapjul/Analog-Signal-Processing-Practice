---
status: accepted
date: 2026-08-10
decision-makers: [development-team]
consulted: []
informed: []
---

# 2. Adopt Structured Guided Math Input Controls over Raw LaTeX Entry

## Context and Problem Statement

Users practicing Analog Signal Processing concepts on web and mobile devices need to input complex mathematical answers (such as ODE response terms, piecewise interval definitions, pole/zero coordinates, and phasor representations).

Requiring users to type raw LaTeX strings (e.g. `\frac{1}{2} e^{-2t} u(t)` or `\begin{cases} ... \end{cases}`) introduces severe user friction, high syntax error rates, and mobile keyboard entry difficulties.

## Decision Drivers

- Minimize user input friction on mobile and touch devices.
- Eliminate LaTeX syntax errors (missing backslashes, unclosed braces).
- Enable immediate real-time feedback and validation of user input values.
- Focus user cognitive effort on ASP concepts rather than syntax formatting.

## Considered Options

- **Option 1**: Free-form raw LaTeX text input fields with live preview.
- **Option 2**: MathLive interactive virtual keyboard editor.
- **Option 3**: Domain-specific structured form input builders (piecewise row builders, ODE damping selectors, pole-zero forms, phasor mode tabs) that automatically synthesize normalized LaTeX strings.

## Decision Outcome

Chosen Option: **Option 3**, because domain-specific guided forms present intuitive numerical inputs, dropdowns, and interval controls tailored to each ASP problem type while internally synthesizing clean, normalized LaTeX expressions.

### Consequences

#### Good

- Users submit answers easily without needing to remember LaTeX commands.
- Built-in client-side validation prevents invalid mathematical inputs before submission.
- UI components (`PiecewiseIntervalInput`, `OdeResponseInput`, `PhasorInput`, `PoleZeroInput`) are reusable across practice problem types.

#### Bad

- Custom input UI components must be designed and maintained for each ASP domain input pattern.
