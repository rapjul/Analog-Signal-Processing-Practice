import type {
	BaseStepState,
	BaseSubStepState,
	MultiPartStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import type { ConvolutionMovingSignal } from "$lib/math-engine/convolution/index";

/** State for one single-choice convolution solver step. */
export interface ConvolutionChoiceStepState extends BaseStepState {
	/** Stable identifier of the selected response. */
	selected: string | null;
}

/** Typed values for one Step 1 timing part. */
export interface ConvolutionTimingSubStepState extends BaseSubStepState {
	/** Student-entered start time. */
	start: string;
	/** Student-entered end time. */
	end: string;
	/** Student-entered overall width. */
	width: string;
}

/** Multipart state for x, h, and y timing. */
export interface ConvolutionTimingStepState extends MultiPartStepState<string> {
	/** Timing state keyed by x, h, and y. */
	subSteps: Record<string, ConvolutionTimingSubStepState>;
}

/** One transformed section entered during Step 3C. */
export interface ConvolutionEdgeInput {
	/** Typed transformed left edge. */
	left: string;
	/** Typed transformed right edge. */
	right: string;
	/** Selected endpoint-inclusion convention. */
	includedEndpoint: "left" | "right" | "both" | "neither" | "";
}

/** Multipart state for Step 3 path, formula, and edge verification. */
export interface ConvolutionFlipStepState extends MultiPartStepState<string> {
	/** Signal chosen as the moving operand. */
	selectedSignal: ConvolutionMovingSignal | null;
	/** Selected formula option identifier. */
	formulaSelected: string | null;
	/** Typed transformed section edges. */
	edgeInputs: Record<string, ConvolutionEdgeInput>;
}

/** Generic typed entry in Step 4. */
export interface ConvolutionTransitionSubStepState extends BaseSubStepState {
	/** Typed scalar or count value. */
	input: string;
	/** Typed interval boundaries in the final builder part. */
	intervalInputs: string[];
}

/** Multipart state for section counts, breakpoints, contacts, and intervals. */
export interface ConvolutionTransitionStepState extends MultiPartStepState<string> {
	/** Ordered typed Step 4 parts. */
	subSteps: Record<string, ConvolutionTransitionSubStepState>;
}

/** Typed bound values for one connected overlap. */
export interface ConvolutionBoundInput {
	/** Student evaluations of both lower candidates at the representative time. */
	lowerValues: [string, string];
	/** Student evaluations of both upper candidates at the representative time. */
	upperValues: [string, string];
	/** Student-entered lower integration limit. */
	lower: string;
	/** Student-entered upper integration limit. */
	upper: string;
	/** Student-entered interior split points. */
	splits: string[];
}

/** State for one Step 5 interval setup. */
export interface ConvolutionBoundsSubStepState extends BaseSubStepState {
	/** Active guided task within the current interval. */
	stage: "overlap" | "lower" | "upper" | "bounds" | "splits";
	/** Whether the learner believes overlap exists. */
	hasOverlap: boolean | null;
	/** One typed bound group per connected overlap. */
	boundInputs: ConvolutionBoundInput[];
}

/** Multipart state for every Step 5 interval. */
export interface ConvolutionBoundsStepState extends MultiPartStepState<string> {
	/** Per-interval bound state. */
	subSteps: Record<string, ConvolutionBoundsSubStepState>;
}

/** Typed work for one concrete Step 6 integral term. */
export interface ConvolutionEvaluationTermInput {
	/** Rectangle amplitude product, when the geometry shortcut applies. */
	amplitudeProduct: string;
	/** Rectangle overlap width, when the geometry shortcut applies. */
	overlapWidth: string;
	/** Antiderivative evaluated at the upper limit. */
	upper: string;
	/** Antiderivative evaluated at the lower limit. */
	lower: string;
	/** Signed upper-minus-lower contribution. */
	difference: string;
}

/** State for one typed Step 6 expression. */
export interface ConvolutionEvaluationSubStepState extends BaseSubStepState {
	/** Active integral term within a split or connected setup. */
	activeTermIndex: number;
	/** Active guided evaluation task. */
	stage:
		| "geometry-amplitude"
		| "geometry-width"
		| "upper"
		| "lower"
		| "difference"
		| "combined";
	/** Per-term substitution work. */
	termInputs: ConvolutionEvaluationTermInput[];
	/** Student-entered expression for y(t). */
	input: string;
}

/** Multipart state for every Step 6 interval expression. */
export interface ConvolutionEvaluationStepState extends MultiPartStepState<string> {
	/** Per-interval expression state. */
	subSteps: Record<string, ConvolutionEvaluationSubStepState>;
}

/** One interval-aligned expression in the Step 7 piecewise builder. */
export interface ConvolutionPiecewiseRowState {
	/** Student-entered interval expression. */
	input: string;
	/** Whether this row has been verified. */
	isValid: boolean;
	/** Whether a carried exterior zero row is locked. */
	isLocked: boolean;
	/** Row-specific validation feedback. */
	feedback: string | null;
}

/** State for the Step 7 typed piecewise assembly. */
export interface ConvolutionPiecewiseStepState extends BaseStepState {
	/** Rows aligned one-to-one with the verified Step 4 intervals. */
	rows: ConvolutionPiecewiseRowState[];
}
