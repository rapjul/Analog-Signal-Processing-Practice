# ADR 0029: Centralized Symbolic Sign Sanitization and LaTeX Spacing

## Context

Mathematical expressions throughout the Intelligent Tutoring System (ITS) are dynamically generated and synthesized from symbolic derivations, student inputs, and superposition identities.

During UI testing and visual audits of the ODE solver, three key formatting defects were identified:

1. **Double Sign Artifacts**: Concatenating signed terms without algebraic sign reduction produced malformed expressions such as `y(t) = ((-4t)e^{-2t} + + \frac{1}{2}\sin(2t))u(t)` or `y_{ZS}(t) = ((-1t)e^{-2t} + - \frac{1}{2}\sin(2t))u(t)`.
2. **LaTeX Macro Escaping in Plain Text**: Spacing macros such as `\;` or `\quad` were occasionally placed outside LaTeX math delimiters (`$ ... $`), causing KaTeX to miss them and rendering literal `\;` characters in the HTML text.
3. **Inconsistent Sign Combination Logic**: Individual modules and solvers implemented ad-hoc sign string interpolation, violating Universal Rule 9 (DRY Code & Shared Type Centralization).

## Decision

1. **Centralized Sanitization Utility in `formatting.ts`**:
    - Provide a shared, centralized `sanitizeLatexMath(latex: string): string` function in `src/lib/math-engine/formatting.ts`.
    - The sanitizer MUST collapse redundant or adjacent signs in math mode:
        - `+ +` or `+ \+` $\to$ `+`
        - `+ -` or `+ \-` $\to$ `-`
        - `- -` or `- \-` $\to$ `+`
        - `- +` or `- \+` $\to$ `-`
        - `( +` $\to$ `(`
        - `+ +` before coefficients or fraction bars $\to$ single `+`
    - Provide `formatSignedLinearTerm(coeff: number | string, term: string, isFirst?: boolean): string` for clean coefficient-to-term composition.

2. **Strict Delimiter Enclosure for Spacing Macros**:
    - All LaTeX spacing macros (`\;`, `\quad`, `\qquad`, `\,`) MUST be located strictly inside LaTeX math delimiters (`$...$` or `$$...$$`).
    - Mixed text/math strings must not place raw LaTeX macros inside plain text blocks.

3. **Universal Applicability**:
    - All dynamic mathematical previews (`previewZI`, `previewZS`, `previewCharEq`, etc.) and all problem solution generators across all domain modules (ODEs, Laplace, Fourier, Circuits, Convolution) MUST pass dynamic LaTeX strings through `sanitizeLatexMath()`.

## Status

Accepted.

## Consequences

- Completely eliminates double-sign glitches (`+ +`, `+ -`, `- -`) across all solvers, step previews, hint displays, and solution cards.
- Guarantees standard algebraic notation where $+ (-a)$ displays cleanly as $- a$.
- Prevents raw LaTeX macro strings (`\;`) from polluting student-facing UI text.
- Enforces single-source formatting compliance across the codebase.
