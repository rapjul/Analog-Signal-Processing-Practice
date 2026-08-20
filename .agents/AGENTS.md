# Workspace Agent Rules — SignalLab (Analog Signal Processing Practice)

SignalLab is an interactive, client-side web application for practicing Analog Signal Processing concepts, built with SvelteKit, TypeScript, KaTeX, and ComputeEngine.

## Quick Reference

- **Dev Server:** `npm run dev`
- **Type Check:** `npm run check`
- **Unit Tests:** `npm test`
- **Production Build:** `npm run build`

## Universal Rules

1. **Zero Unicode Math in UI Text**: Do not use raw Unicode math characters ($\sum, \int, \omega, \pi, \sigma, \le, \ge$) in HTML text, buttons, labels, or headings. The only acceptable exceptions are native plain-text contexts where LaTeX compilers cannot render (HTML input/textarea `placeholder` attributes, native `<option>` elements, and native `title` tooltips) until custom components replace them.
2. **LaTeX Enforcement**: All mathematical expressions and variables MUST be rendered strictly using LaTeX wrappers (`<MathInline>` or `<MathBlock>`).
    - Currently using KaTeX for LaTeX rendering.
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
11. **Narrow Viewport (320px) Responsive Fluidity**: All UI components, navigation bars, control bars, problem cards, stepped solvers, progress indicators, action buttons, and mathematical containers MUST render cleanly without horizontal layout overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`) on viewports down to a minimum width of $320\text{px}$ (WCAG 2.1 Reflow standard). Always use fluid container queries (`@container (max-width: 360px)`), mobile media queries (`@media (max-width: 480px)`), flex-wrapping on control groups and headers, scalable progress pills, and full-width multi-line action button wrapping.
12. **Standardized CSS Section & Modifier Comments in `<style>` Tags**: All `<style>` blocks in Svelte single-file components and pages MUST use structured box-drawing section divider comments (`/* ── Section Title ──────────────────────────────────────── */`), modifier and state comments (e.g. `/* Primary — cyan (default) */`, `/* Active state */`), and explicit divider labels for container and media query blocks (e.g. `/* ── Narrow viewport (≤360px) container query ─────────── */`, `/* ── Mobile media query (≤480px) ─────────────────────── */`).
13. **Strict Relative & Sanitized Paths in Code & Docs**: Always use relative file paths for all internal workspace references in Markdown documents (`docs/`, `ADRs`), code comments, and commit messages (e.g. `./other-doc.md`, `../../src/lib/math-engine/types.ts`). Never hardcode raw absolute home directory paths (`/Users/<username>/...` or `file:///Users/...`). When referencing files outside the workspace repository, always use `~` or `$HOME` (e.g., `~/.agents/skills/...`) and explicitly notify the user when an external reference is required.
14. **Standardized Conventional Commit Scopes**: Always use hierarchical, unambiguous domain scopes for Conventional Commit tags across solver engines, problem generators, UI components, math engines, and documentation:
    - `solvers`: Base state machines, shared solver feedback components, step harnesses, and cross-cutting changes.
    - `solvers/ode`: Linear Constant-Coefficient Differential Equation solvers and generators.
    - `solvers/fourier-series`: Trigonometric and exponential Fourier series solvers and harmonic derivations (never use ambiguous abbreviations like `fs` or unspecific `fourier`).
    - `solvers/fourier-transform`: Continuous-Time Fourier Transform (CTFT) solvers, pairs, and properties.
    - `solvers/laplace`: Laplace Transform ($s$-domain), ROC, and partial fraction decomposition solvers.
    - `solvers/convolution`: Continuous-time graphical and analytical convolution solvers.
    - `solvers/circuits`: Circuit analysis ($s$-domain impedance, RLC transfer functions) solvers.
    - `math-engine`: Shared mathematical infrastructure (`evaluator`, `formatting`, `complex`, `fraction`, centralized types).
    - `ui`: Shared UI shell/layout components (`PageLayout`, `DrillPanel`, `ui/nav`, `ui/math-input`, `ui/canvas`, `ui/theme`).
    - `docs/adr`: Architectural Decision Records in `docs/adrs/`.

## Detailed Guidelines

For detailed requirements and specifications, see:

- [Mathematical Rendering Guidelines](math-rendering.md)
- [Code Style & Defensive Guidelines](code-style.md)
- [Testing & Quality Assurance](testing-and-quality.md)
- [System Architecture](architecture.md)
- [Architectural Decision Records](../docs/adrs/)
