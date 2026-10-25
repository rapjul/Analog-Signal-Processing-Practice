/** Reactive response contracts for the guided CTFT tutor. */

import type { BaseStepState } from "$lib/components/solvers/base-step-solver.svelte";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";

/** Reactive response and verification for one independently checked field. */
export interface CtftPartState extends BaseStepState {
	/** Student-owned text or choice identifier. */ input: string;
	/** Full mathematical verification status. */ result: TransformValidationResult | null;
}

/** Reactive stage with its sequential task cursor. */
export interface CtftStageState extends BaseStepState {
	/** Next task index. */ cursor: number;
	/** Per-task response state. */ parts: Record<string, CtftPartState>;
}
