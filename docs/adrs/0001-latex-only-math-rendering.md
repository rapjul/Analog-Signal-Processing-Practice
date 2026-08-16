---
status: accepted
date: 2026-08-10
decision-makers: [development-team]
consulted: []
informed: []
---

# 1. Enforce LaTeX Components and Prohibit Raw Math Unicode in UI Text

## Context and Problem Statement

In an Analog Signal Processing (ASP) practice web application, mathematical expressions (integrals, frequencies, transfer functions, vectors, and complex numbers) are central to the user interface. Previously, mathematical symbols were rendered inconsistently using a mix of raw Unicode characters ($\omega, \pi, \int, \le$) in raw HTML text and LaTeX expressions in selected problem cards.

This caused several issues:

- Uneven typographic styling and misaligned baselines between Unicode text and rendered formulas.
- Accessibility issues with screen readers attempting to pronounce raw Unicode math characters.
- Copy-paste inconsistency and formatting breaks on mobile viewports.

## Decision Drivers

- High-quality, consistent mathematical typography.
- Zero ambiguity when presenting equations, variables, and units.
- Accessibility and screen reader compatibility.
- Prevention of HTML layout breaking due to raw character encoding differences across browsers.

## Considered Options

- **Option 1**: Allow raw Unicode math symbols in text/buttons and use LaTeX components only for complex equations.
- **Option 2**: Run a client-side whole-page DOM scanner/converter (e.g., MathJax dynamic typesetting) over all raw text.
- **Option 3**: Strictly enforce LaTeX wrapper components (`<MathInline>` and `<MathBlock>`, powered by KaTeX) for all mathematical variables and formulas while prohibiting raw Unicode math symbols in UI HTML text.

## Decision Outcome

Chosen Option: **Option 3**, because explicit `<MathInline>` / `<MathBlock>` Svelte components provide fast, deterministic compile-time and run-time LaTeX rendering without layout shifts, high runtime overhead, or ambiguous symbol parsing, while guaranteeing consistent typography and visual presentation across all devices.

### Consequences

#### Good

- Consistent typography and math styling across the entire web app.
- Centralized rendering logic inside Svelte components (`<MathInline>` and `<MathBlock>`).
- Clear rule enforced for agents and contributors via workspace rules (`.agents/math-rendering.md`).

#### Bad

- Developers cannot paste quick Unicode symbols into button text or labels; every variable or formula must pass through `<MathInline>`.

#### Neutral

- Small dependency on `katex` NPM package under the hood.
