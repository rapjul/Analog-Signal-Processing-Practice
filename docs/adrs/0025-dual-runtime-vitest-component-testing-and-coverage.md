---
status: accepted
date: 2026-08-16
decision-makers: [development-team]
consulted: []
informed: []
---

# 25. Dual-Runtime Vitest Architecture for Component Testing and V8 Coverage

## Context and Problem Statement

As SignalLab's educational domain engine and user interface matured, testing requirements diverged into two distinct runtime paradigms:

1. **Pure Symbolic Mathematical Engines & Problem Generators**:
    - High-throughput algorithmic routines (characteristic roots, zero-input/zero-state solutions, Fourier series/transforms, Laplace partial fractions, circuit impedances) requiring fast execution in pure Node.js without the performance overhead of DOM emulation.

2. **Interactive Svelte 5 UI & Math Presentation Components**:
    - Client-side Svelte 5 runes components (`MathInline`, `MathBlock`, `MathText`, `StepBreadcrumb`, `HintDisclosure`, `CompletionBanner`) that render KaTeX formulas, manage clipboard copy interactions, transition animations, timer resets, and accessibility attributes (`role="region"`, `aria-label`, `role="status"`).

When mounting Svelte 5 components in headless unit tests, standard Node environments fail because Svelte resolves its server build (`index-server.js`) and throws `lifecycle_function_unavailable: mount(...) is not available on the server`. Furthermore, using full browser automation (such as Playwright) for hundreds of granular component test assertions introduces significant latency, slowing down rapid local feedback loops.

Additionally, the project required an official, high-precision code coverage reporting tool to verify line-level and branch-level execution across all solvers, components, and input evaluators.

## Decision Drivers

- **Rapid Developer Feedback Loop**: The test suite should execute all 300+ unit tests across solvers, generators, and components in approximately 2 seconds.
- **Svelte 5 Client Lifecycle Compatibility**: Components must resolve browser export conditions (`resolve.conditions: ["browser"]`) with DOM emulation (`jsdom`) to mount runes cleanly.
- **Avoid Heavy Browser Startup Overhead**: Avoid spinning up Playwright Chromium/WebKit instances for unit tests, reserving Playwright exclusively for full end-to-end integration and screenshot verification.
- **High-Performance Code Coverage**: Implement native V8 AST coverage reporting with HTML, JSON, and terminal summaries without Babel transpilation bottlenecks.
- **Resilient Mathematical Input Evaluation**: Preprocess and normalize student shorthand math inputs (`5cos(100pit)` $\to$ `5\cos(100\pi t)`) before AST parsing.

## Considered Options

- **Option 1: Playwright Component Testing (`@playwright/experimental-ct-svelte`)**: Use browser-based component testing for all UI components.  
  _(Rejected: Slower execution speeds, heavier CI resource consumption, and unnecessary overhead for isolated component verification)._
- **Option 2: Monolithic Global JSDOM Environment for All Tests**: Run all unit tests inside a single global JSDOM environment.  
  _(Rejected: JSDOM DOM emulation adds measurable CPU and memory overhead to pure Node math computations, slowing down high-iteration mathematical test suites)._
- **Option 3: Dual-Runtime Vitest Workspace Configuration with `@testing-library/svelte` and `@vitest/coverage-v8`**:
    - Split Vitest into two workspace projects in `vite.config.ts`:
        1. `unit/node`: Pure Node runtime targeting `tests/unit/*.test.ts` (solvers, complex arithmetic, fraction algebra, circuit topology engines).
        2. `unit/dom`: `jsdom` runtime with `resolve.conditions: ["browser"]` targeting `tests/unit/components/*.test.ts` (Svelte 5 components).
    - Use `@testing-library/svelte` (v5.4.2) for declarative DOM querying and event simulation (`fireEvent.click`, fake timer advancement, transition events).
    - Use `@vitest/coverage-v8` as the official Vite coverage provider with `./coverage/index.html` report generation.

## Decision Outcome

Chosen Option: **Option 3**, because it provides the optimal balance of execution speed, native Svelte 5 browser lifecycle support, and comprehensive code coverage analytics.

### Architectural Implementation

#### 1. Dual Vitest Workspace Projects (`vite.config.ts`)

```typescript
test: {
	coverage: {
		provider: "v8",
		reporter: ["text", "json", "html"],
		reportsDirectory: "./coverage",
		exclude: [
			"tests/**",
			"**/*.d.ts",
			"**/*.config.*",
			"src/lib/index.ts",
		],
	},
	workspace: [
		{
			test: {
				name: "unit/node",
				environment: "node",
				include: ["tests/unit/*.test.ts"],
			},
		},
		{
			test: {
				name: "unit/dom",
				environment: "jsdom",
				include: ["tests/unit/components/*.test.ts"],
				server: {
					deps: {
						inline: [/svelte/],
					},
				},
				resolve: {
					conditions: ["browser"],
				},
			},
		},
	],
}
```

#### 2. Evaluator Shorthand Normalization Pipeline (`src/lib/math-engine/evaluator.ts`)

To support natural student typing without requiring strict LaTeX markup, `normalizeMathLatex` preprocesses input strings before ComputeEngine/MathJSON AST compilation:

```typescript
export function normalizeMathLatex(latex: string): string {
	return latex
		.replace(/\b(cos|sin|tan|exp|sqrt|ln|log)\b/g, "\\$1")
		.replace(/(\d+)\s*pit\b/gi, "$1\\pi t")
		.replace(/(\d+)\s*pi\b/gi, "$1\\pi")
		.replace(/\bpit\b/gi, "\\pi t")
		.replace(/\bpi\b/gi, "\\pi")
		.replace(/\\cdot|\\times/g, " * ")
		.replace(/\\left\s*([([{])/g, "$1")
		.replace(/\\right\s*([)\]}])/g, "$1");
}
```

## Consequences

### Positive Consequences

- **Sub-2.5s Execution for 300+ Tests**: Running pure math algorithms in Node while reserving JSDOM for component tests delivers fast test execution.
- **Full Svelte 5 Runes Compatibility**: Setting `resolve.conditions: ["browser"]` on the DOM test project completely prevents `mount(...) is not available on the server` errors.
- **Accurate Line & Branch Coverage**: `@vitest/coverage-v8` provides granular coverage maps down to uncovered branch numbers with interactive visual HTML reports (`npm run test:coverage`).
- **Standardized AST Operator Testing**: The evaluator AST engine covers all elementary math operations (`Root`, `Tan`, `Ln`, `Log`, `Abs`, `Negate`, `Power`, `Divide`) and piecewise boundary conditions (`\leq`, `\geq`, `\lt`, `\gt`).

### Negative Consequences / Trade-offs

- **Dual Configuration Maintenance**: Test files must be organized into separate directory structures (`tests/unit/` vs `tests/unit/components/`) to map to the correct Vitest workspace project.
- **DOM Cleanup Requirement**: Component test files must explicitly invoke `cleanup()` in `afterEach()` hooks to prevent JSDOM memory leakage across test suites.
