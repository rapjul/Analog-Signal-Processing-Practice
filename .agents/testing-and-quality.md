# Testing & Quality Assurance Guidelines

## Overview

SignalLab uses Vitest for unit testing math engines and Svelte-Check for TypeScript and template type verification.

## Commands

| Purpose         | Command             | Description                                                     |
| --------------- | ------------------- | --------------------------------------------------------------- |
| **Type Check**  | `npm run check`     | Runs `svelte-check` across all Svelte files and TS code.        |
| **Unit Tests**  | `npm test`          | Executes Vitest runner once (`vitest --run`).                   |
| **Watch Tests** | `npm run test:unit` | Launches Vitest in interactive watch mode.                      |
| **Build Check** | `npm run build`     | Builds static site bundle with Vite & SvelteKit adapter-static. |

## Verification Workflow

Before declaring work complete or completing a branch/PR:

1. Run `npm run check` to verify zero type errors or missing props.
2. Run `npm test` to ensure math engine utilities, evaluators, and ODE solvers pass all test cases.
3. Ensure no lint errors or missing imports exist.

## Unit Testing Math Engines

- All math engine files in `src/lib/math-engine/` must have companion unit tests in `tests/` or alongside source files.
- Test boundary conditions (division by zero, negative parameters, zero coefficients, floating point tolerance).
