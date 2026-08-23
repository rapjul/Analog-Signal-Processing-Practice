import type {
	BaseStepState,
	BaseSubStepState,
	MultiPartStepState,
} from "$lib/components/solvers/base-step-solver.svelte";

/** State for one single-choice convolution solver step. */
export interface ConvolutionChoiceStepState extends BaseStepState {
	/** Stable identifier of the selected mathematical response. */
	selected: string | null;
}

/** State for one interval challenge in the overlap-evaluation step. */
export interface ConvolutionIntervalSubStepState extends BaseSubStepState {
	/** Stable identifier of the selected interval expression. */
	selected: string | null;
}

/** Multi-part state for evaluating every piecewise convolution region. */
export interface ConvolutionIntervalMultiPartState extends MultiPartStepState<string> {
	/** Per-interval selection and feedback state. */
	subSteps: Record<string, ConvolutionIntervalSubStepState>;
}
