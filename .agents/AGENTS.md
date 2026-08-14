# Workspace Agent Rules — SignalLab (Analog Signal Processing Practice)

SignalLab is an interactive, client-side web application for practicing Analog Signal Processing concepts, built with SvelteKit, TypeScript, KaTeX, and ComputeEngine.

## Quick Reference

- **Dev Server:** `npm run dev`
- **Type Check:** `npm run check`
- **Unit Tests:** `npm test`
- **Production Build:** `npm run build`

## Universal Rules

1. **Zero Unicode Math in UI Text**: Do not use raw Unicode math characters ($\sum, \int, \omega, \pi, \sigma, \le, \ge$) in HTML text, buttons, labels, or headings.
2. **KaTeX Enforcement**: All mathematical expressions and variables MUST be rendered strictly using KaTeX wrappers (`<MathInline>` or `<MathBlock>`).
3. **Mandatory JSDoc Comments**: Write JSDoc comments (`/** ... */`) for all functions, methods, parameters, and type definitions.
4. **Defensive Switch Control**: Always include a dedicated `default` case in `switch` statements to handle unknown/unhandled cases explicitly (e.g. throwing an explicit `Error` or providing a defensive fallback). Do not stack a valid `case` clause onto `default:` without its own branch logic.
5. **No Direct Git Commits**: Do not commit changes to Git unless explicitly requested by the user.
6. **Exact Symbolic Math Representation**: Keep step breakdown numbers and solution expressions in exact symbolic/fractional form ($\frac{a}{b}, \pi, e$) in LaTeX outputs, while maintaining exact floating-point evaluation values for canvas/chart graphing functions.
7. **Zero-Guesswork Granular Step Breakdowns**: Never skip intermediate algebraic steps in practice problem solution breakdowns. Always explicitly show:
    - Root-solving (factored forms or quadratic formula)
    - Trial solution ansatzes and their derivatives ($y_p', y_p'', \dots$)
    - Substituted expressions and identity applications
    - Systems of linear equations for unknown coefficients
    - Integrals, summations, and full component solutions ($y_{ZI}, y_{ZS}$)
    - All steps involving partial fraction decomposition (PFD)
    - All steps leading up to the final answer, including all setup steps
8. **Mandatory `:focus-visible` Button Styling**: Always include explicit `:focus-visible` CSS rules for interactive buttons and focusable controls to ensure clear visual focus indicators during Tab key navigation.
9. **DRY Code & Shared Type Centralization**: Avoid duplicating code, interfaces, or type definitions across modules. Always extract shared types, utility helpers, and common logic into centralized modules (e.g., `src/lib/math-engine/types.ts`) for single-source reusability.
10. **Use `\operatorname` for Math Signal Operators**: Use `\operatorname{...}` (e.g., `\operatorname{rect}`, `\operatorname{tri}`, `\operatorname{sgn}`, `\operatorname{sinc}`) rather than `\text{...}` when formatting custom mathematical signal operator functions in LaTeX.

## Detailed Guidelines

For detailed requirements and specifications, see:
- [Mathematical Rendering Guidelines](math-rendering.md)
- [Code Style & Defensive Guidelines](code-style.md)
- [Testing & Quality Assurance](testing-and-quality.md)
- [System Architecture](architecture.md)
- [Architectural Decision Records](../docs/adrs/)
