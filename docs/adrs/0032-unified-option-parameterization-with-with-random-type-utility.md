---
status: accepted
date: 2026-08-20
decision-makers: [development-team]
consulted: []
informed: []
---

# 32. Unified Option Parameterization with WithRandom<T> Type Utility

## Context and Problem Statement

In SignalLab, practice problem generation is configurable both programmatically (via generation options in test suites or seeded benchmarks) and interactively (via UI dropdown controls and URL query parameters).

Each parameter dimension (e.g. differential order, characteristic root classification, forcing function type, leading coefficient normalization, resonance status) allows users to specify an exact discrete value (e.g. `order: 2`, `rootType: "distinct_real"`, `forcingType: "exponential"`) or opt for stochastic generation via the sentinel value `"random"`.

Previously, this was typed through ad-hoc union expressions duplicated across multiple files:

```typescript
// generator options
order?: OdeOrder | "random";
rootType?: SecondOrderRootType | "random";
forcingType?: ForcingType | "random";

// UI filter states
selectedOrder = $state<OdeOrder | "random">("random");
selectedRootType = $state<SecondOrderRootType | "random">("random");

// URL search param parsing
const order: OdeOrder | "random" = ...;
```

This ad-hoc duplication increased cognitive load, created subtle type maintenance drift, and lacked a formalized contract for how randomized generator inputs should be typed across domain boundaries.

## Decision Drivers

- **DRY Type Design & Centralization:** Unify the representation of randomized parametric options across all layers (math engine, problem filters, URL query sanitizers, Svelte state, test helpers).
- **Self-Documenting Code & Hover Quality:** Provide clear JSDoc documentation on the utility type explaining the role of the `"random"` sentinel.
- **Cross-Domain Reusability:** Create a reusable utility type pattern applicable to all practice problem modules (ODEs, Fourier Series, Laplace, Circuit Analysis, Convolution).

## Considered Options

- **Option 1: Ad-Hoc Union Types:** Continue writing `T | "random"` inline wherever needed.
- **Option 2: Dedicated Option Enums:** Define separate types for each option (e.g., `OdeOrderOption`, `SecondOrderRootTypeOption`, `ForcingTypeOption`).
- **Option 3: Generic `WithRandom<T>` Utility Type:** Define a centralized generic type alias `export type WithRandom<T> = T | "random"` in domain `types.ts`.

## Decision Outcome

Chosen Option: **Option 3**, because it provides maximum type safety and DRY centralization with zero boilerplate or duplicate type definitions.

### Type Definition

In `src/lib/math-engine/odes/types.ts`:

```typescript
/**
 * Utility type extending a given option type $T$ with the sentinel value `"random"`.
 *
 * Used across problem generator configuration options, interactive UI filter state,
 * and URL search parameter sanitization to represent unconstrained stochastic selection.
 *
 * @template T The underlying option value type
 */
export type WithRandom<T> = T | "random";
```

### Applied Architecture

1. **Problem Generation Options (`OdeGenerationOptions`):**
    ```typescript
    export interface OdeGenerationOptions {
    	order?: WithRandom<OdeOrder>;
    	rootType?: WithRandom<SecondOrderRootType>;
    	forcingType?: WithRandom<ForcingType>;
    	leadingCoefficient?:
    		number | WithRandom<LeadingCoefficientType | "non-monic">;
    	resonance?: WithRandom<
    		ResonanceType | "nonresonant" | "resonant" | boolean
    	>;
    	seed?: number;
    }
    ```
2. **Interactive UI Filter State (`OdeFilterSelections`):**
    ```typescript
    export interface OdeFilterSelections {
    	order: WithRandom<OdeOrder>;
    	rootType: WithRandom<SecondOrderRootType>;
    	forcingType: WithRandom<ForcingType>;
    	leadingCoefficient: WithRandom<LeadingCoefficientType>;
    	resonance: WithRandom<ResonanceType>;
    	seed: number;
    }
    ```
3. **URL Parameter Parsers & Test Fixtures:**
    - Parameter extraction in `src/lib/problems/ode-filters.ts` returns `WithRandom<T>`.
    - Test generator fixtures in `tests/unit/*.test.ts` accept `WithRandom<T>`.

## Consequences

### Positive

- **Single Source of Truth:** The `"random"` sentinel contract is defined once and reused uniformly across the entire stack.
- **Type Safety & Auto-Completion:** IDEs provide exact IntelliSense for valid string literals plus `"random"`.
- **Consistency Across Future Solvers:** Establishes the standard type pattern for upcoming Fourier, Laplace, and Circuit generators.

### Negative / Trade-Offs

- **Generic Syntax:** Introduces generic type parameter wrapping (`WithRandom<OdeOrder>`), which is slightly more verbose than raw unions but significantly more maintainable.
