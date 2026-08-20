---
status: accepted
date: 2026-08-20
decision-makers: [development-team]
consulted: []
informed: []
---

# 31. Explicit Directory Package Boundaries and ESM Imports

## Context and Problem Statement

When the ODE subsystem was modularized into a multi-file folder (`src/lib/math-engine/odes/`), a legacy root wrapper file (`src/lib/math-engine/odes.ts`) was initially retained as a re-export shim to preserve backward-compatibility.

However, having both `src/lib/math-engine/odes.ts` (a file) and `src/lib/math-engine/odes/` (a directory) present at the same path level introduced several problems:

1. **Module Resolution Ambiguity:** Bundlers and TypeScript compilers encounter conflicting resolution candidates when resolving `$lib/math-engine/odes`.
2. **IDE Language Server Cache Staleness:** In-memory TypeScript language servers in modern IDEs (VS Code, Cursor, Antigravity) cache file system entries. Deleting or modifying a sibling file causes transient `"Cannot find module"` errors because the language server fails to fall back to probing directory indexes across path alias wildcards (`$lib/*`).
3. **Strict ESM Standards:** Under modern ECMAScript Module (ESM) specifications (Node.js ESM, Vite, and strict bundler resolution), implicit directory index resolution on bare or aliased specifiers is deprecated in favor of explicit file targets.

## Decision Drivers

- **Zero Module Resolution Collisions:** Eliminate all file-vs-directory naming conflicts.
- **Reliable IDE Tooling & Type Checking:** Ensure all editors, language servers, and command-line checkers (`svelte-check`, `vitest`, `biome`) resolve imports deterministically without cache anomalies.
- **Strict ECMAScript Module (ESM) Alignment:** Follow modern standard ESM import path conventions.
- **Clean SvelteKit Architecture:** Maintain standard `$lib/...` path aliases without adding unnecessary per-solver alias entries to `svelte.config.js`.

## Considered Options

- **Option 1: Retain `odes.ts` Wrapper Shim:** Keep `src/lib/math-engine/odes.ts` re-exporting `src/lib/math-engine/odes/index.ts`.
- **Option 2: Add Per-Solver Path Aliases in `svelte.config.js`:** Add custom aliases (e.g. `$odes: 'src/lib/math-engine/odes/index.ts'`) for every solver.
- **Option 3: Standard Directory Packages with Explicit `/index` Imports:** Permanently delete wrapper shims and import directly from `$lib/math-engine/odes/index` (or relative `../math-engine/odes/index`).

## Decision Outcome

Chosen Option: **Option 3**, because it completely removes duplicate wrapper files, avoids configuration bloat in `svelte.config.js`, and aligns with standard TypeScript and SvelteKit module resolution.

### Architectural Rules

1. **Directory Package Structure:**
    - When a math engine or solver module spans multiple files, it resides in a dedicated directory:
      `src/lib/math-engine/<module-name>/`
    - The directory must contain an **`index.ts`** file that defines and re-exports its public API surface.
    - No sibling wrapper file `<module-name>.ts` may exist alongside the directory `<module-name>/`.
2. **Import Path Convention:**
    - Internal and external consumers importing from a directory package must specify the entry point explicitly:
        ```typescript
        // Correct
        import {
        	generateOdeProblem,
        	type OdeProblem,
        } from "$lib/math-engine/odes/index";

        // Incorrect (omits index target on directory package)
        import { generateOdeProblem } from "$lib/math-engine/odes";
        ```
3. **Direct Submodule Imports:**
    - Consumers requiring only specific domain types or helper utilities may import directly from the sub-file to optimize tree-shaking and isolation:
        ```typescript
        import type { OdeGenerationOptions } from "$lib/math-engine/odes/types";
        ```

## Consequences

### Positive

- **Deterministic Resolution:** Eliminates all file/directory resolution ambiguity across compilers, linters, and runtime bundlers.
- **Zero Configuration Bloat:** Standard SvelteKit `$lib` path alias handles all modules without modifying `svelte.config.js` or `tsconfig.json`.
- **IDE Cache Stability:** Prevents editor language server confusion during refactoring and build cycles.

### Negative / Trade-Offs

- **Explicit Path Suffix:** Requires adding `/index` to directory package imports.
