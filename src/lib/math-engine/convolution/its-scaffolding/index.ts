/** Public package boundary for continuous-time convolution tutoring metadata. */

export type {
	ConvolutionBreakpointContact,
	ConvolutionBreakpointPart,
	ConvolutionIntegralPathSetup,
	ConvolutionItsBuildContext,
	ConvolutionItsChoiceStep,
	ConvolutionItsData,
	ConvolutionItsFlipStep,
	ConvolutionItsIntervalPart,
	ConvolutionItsOption,
	ConvolutionItsTimingStep,
	ConvolutionItsTransitionStep,
	ConvolutionMovingSignal,
	ConvolutionOverlapBounds,
	ConvolutionTimingPart,
	ConvolutionTransformedSection,
	ConvolutionTransitionGroup,
} from "$lib/math-engine/convolution/its-types";
export type { ConvolutionSignalSection } from "$lib/math-engine/convolution/types";
export {
	buildConvolutionItsData,
	formatConvolutionPiecewiseLatex,
	formatConvolutionScalar,
	getFiniteConvolutionTransitionTimes,
} from "./helpers";
