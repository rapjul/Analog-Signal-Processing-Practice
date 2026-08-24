/**
 * Public package boundary for the convolution tutor controller.
 *
 * State shapes and controller implementation live in the adjacent
 * `convolution-solver-state` package so consumers do not depend on internals.
 */

export {
	ConvolutionStepSolverState,
	convolutionExpressionsMatch,
	parseConvolutionScalarInput,
} from "$lib/components/solvers/convolution-solver-state/controller.svelte";
export type {
	ConvolutionBoundsStepState,
	ConvolutionChoiceStepState,
	ConvolutionEvaluationStepState,
	ConvolutionFlipStepState,
	ConvolutionPiecewiseStepState,
	ConvolutionTimingStepState,
	ConvolutionTransitionStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
