/**
 * Fourier Series Solver State Types & Substep Identifiers.
 *
 * Defines the state interfaces for steps 1 through 7 of the Fourier Series ITS solver.
 */

import type { OriginParity } from "$lib/math-engine/fourier-series/index";
import type {
	BaseStepState,
	BaseSubStepState,
	MultiPartStepState,
} from "../base-step-solver.svelte";

/**
 * Step 1 State: Period and Fundamental Frequency inputs and validation.
 */
export interface FourierSeriesStep1State extends BaseStepState {
	/** Student period input string */
	period: string;
	/** Period unit (default: 's') */
	periodUnit: string;
	/** Student frequency input string */
	freq: string;
	/** Frequency unit (default: 'rad/s') */
	freqUnit: string;
}

/** Ordered identifiers for the two independent symmetry classifications. */
export type FourierSeriesSymmetrySubStepId = "origin-parity" | "half-wave";

/** Step 2 State: Waveform Symmetry Sequential Classifications. */
export interface FourierSeriesSymmetryStepState extends MultiPartStepState<FourierSeriesSymmetrySubStepId> {
	subSteps: {
		"origin-parity": BaseSubStepState & {
			selected: OriginParity | null;
		};
		"half-wave": BaseSubStepState & {
			selected: boolean | null;
		};
	};
}

/**
 * Multiple-choice step state for Fourier ITS single-selection steps (Steps 3, 4, 7).
 */
export interface FourierSeriesChoiceStepState extends BaseStepState {
	/** Selected option identifier or null if unselected */
	selected: string | null;
}

/** One selected option within a coefficient-focused sub-step. */
export interface FourierSeriesCoefficientSubStepState extends BaseSubStepState {
	/** Selected option identifier or null if unselected. */
	selected: string | null;
}

/** Sequential coefficient sub-steps within Steps 5 and 6. */
export type FourierSeriesCoefficientMultiPartState =
	MultiPartStepState<string> & {
		subSteps: Record<string, FourierSeriesCoefficientSubStepState>;
	};

// Aliases for compatibility
export type FourierStep1State = FourierSeriesStep1State;
export type FourierSymmetrySubStepId = FourierSeriesSymmetrySubStepId;
export type FourierSymmetryStepState = FourierSeriesSymmetryStepState;
export type FourierChoiceStepState = FourierSeriesChoiceStepState;
export type FourierCoefficientSubStepState =
	FourierSeriesCoefficientSubStepState;
export type FourierCoefficientMultiPartState =
	FourierSeriesCoefficientMultiPartState;
