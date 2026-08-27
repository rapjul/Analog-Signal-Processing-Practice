/** Shared analytical types for continuous-time convolution. */

/** Rectangular pulse signal parameters. */
export interface RectSignal {
	/** Start time of the pulse. */
	tStart: number;
	/** Width of the pulse. */
	width: number;
	/** Amplitude of the pulse. */
	height: number;
}

/** Exponential decay signal parameters for K exp(-a t) u(t). */
export interface ExpSignal {
	/** Positive decay rate. */
	a: number;
	/** Scale coefficient. */
	K: number;
}

/** One connected section of a generated signal. */
export interface ConvolutionSignalSection {
	/** Stable section identifier. */
	id: string;
	/** Left endpoint. */
	start: number;
	/** Right endpoint. */
	end: number;
	/** Whether the left endpoint is included. */
	startIncluded: boolean;
	/** Whether the right endpoint is included. */
	endIncluded: boolean;
}

/** Piecewise convolution interval segment. */
export interface ConvolutionInterval {
	/** LaTeX interval condition. */
	labelLatex: string;
	/** Minimum time threshold. */
	min: number;
	/** Maximum time threshold. */
	max: number;
	/** Piecewise formula in LaTeX. */
	exprLatex: string;
	/** Exact active support intersection for this interval. */
	supportIntersectionLatex?: string | undefined;
	/** Exact unevaluated convolution integral for this interval. */
	integralSetupLatex?: string | undefined;
	/** Exact support intersection when x is the moving signal. */
	flipXSupportIntersectionLatex?: string | undefined;
	/** Exact integral setup when x is the moving signal. */
	flipXIntegralSetupLatex?: string | undefined;
	/** Whether the original signals geometrically overlap in this region. */
	hasGeometricOverlap?: boolean | undefined;
	/** Numerical evaluator for this interval. */
	eval: (t: number) => number;
}

/** Complete piecewise convolution result. */
export interface ConvolutionResult {
	/** Convolution pair classification. */
	pairType: string;
	/** Piecewise intervals. */
	intervals: ConvolutionInterval[];
	/** Complete numerical output evaluator. */
	eval: (t: number) => number;
	/** Input-signal evaluator. */
	evalX: (tau: number) => number;
	/** Impulse-response evaluator. */
	evalH: (tau: number) => number;
}

/** Supported analytical signal-pair categories. */
export type ConvolutionPairType =
	| "rect_rect"
	| "rect_shifted_rect"
	| "rect_both_shifted"
	| "multi_rect"
	| "rect_exp"
	| "exp_exp"
	| "tri_rect"
	| "tri_shifted_tri"
	| "step_exp"
	| "step_rect"
	| "bilateral_exp_rect";

/** Deterministic problem-generation controls. */
export interface ConvolutionGenerationOptions {
	/** Unsigned seed used for randomized parameters. */
	seed?: number | undefined;
}
