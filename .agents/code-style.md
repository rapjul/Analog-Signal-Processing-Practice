# Code Style Guidelines

## Overview

This document outlines coding standards, comment conventions, type annotations, and control-flow defensive rules for SignalLab.

## 1. Documentation & JSDoc Requirements

- **Mandatory Comments**: Every function, method, parameter, and type definition **MUST** include JSDoc-formatted comments (`/** ... */`).
- **Parameter & Return Descriptions**: Specify `@param` and `@returns` tags for all non-trivial helper functions and exported utilities.

```typescript
/**
 * Evaluates an ordinary differential equation (ODE) characteristic polynomial.
 *
 * @param {number[]} coefficients - Polynomial coefficients in descending order of derivative degree.
 * @param {number} s - Complex frequency evaluation point.
 * @returns {number} The calculated value of P(s).
 */
export function evaluatePolynomial(coefficients: number[], s: number): number {
	return coefficients.reduce((acc, val) => acc * s + val, 0);
}
```

## 2. Defensive Control Flow & Switch Statements

- **Exhaustive Default Cases**: Every `switch` statement **MUST** include a `default` case to handle unexpected, unknown, or unhandled enum/type variants.
- **Explicit Error Handling**: If an unexpected value reaches the `default` branch, throw a descriptive error or explicitly set a fallback state.

```typescript
/**
 * Synthesizes LaTeX output for active phasor input representation.
 * @returns {string} LaTeX string
 */
function synthesizeLatex(): string {
	switch (mode) {
		case "polar":
			return synthesizePolar();
		case "time_domain":
			return synthesizeTimeDomain();
		case "rectangular":
			return synthesizeRectangular();
		default:
			throw new Error(`Unknown phasor mode: ${mode}`);
	}
}
```

## 3. TypeScript & Type Safety

- Enable strict mode compliance.
- Avoid using `any` type assertions; prefer explicit interface/type definitions or generic parameters.
- Provide explicit return types for exported functions.

## 4. Svelte 5 Conventions

- Use modern Svelte 5 reactive runes (`$state`, `$derived`, `$props`, `$effect`).
- Prefer `$derived` over manual reactive recalculation functions when computing values from state variables.

## 5. CSS & Styling Rules

- Use Vanilla CSS or defined CSS custom properties (`var(--bg-card)`, `var(--accent-primary)`).
- Avoid inline HTML `style="..."` attributes; move layout and color properties to component `<style>` blocks.
- **Structured Section Dividers**: Group rules logically using box-drawing comments:
    ```css
    /* ── Outer row / container ────────────────────────────── */
    .container {
    	display: flex;
    }

    /* ── Badge variants ────────────────────────────────────── */
    .badge {
    	font-size: var(--text-xs);
    }

    /* Primary — cyan (default) */
    .badge--primary {
    	background: rgba(6, 182, 212, 0.12);
    }

    /* ── Narrow viewport (≤360px) container query ─────────── */
    @container (max-width: 360px) {
    	.container {
    		padding: 0.75rem;
    	}
    }

    /* ── Mobile media query (≤480px) ─────────────────────── */
    @media (max-width: 480px) {
    	.container {
    		flex-direction: column;
    	}
    }
    ```
