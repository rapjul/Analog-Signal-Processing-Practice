/** Shared analytical types for continuous-time convolution. */

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

/** Deterministic problem-generation controls. */
export interface ConvolutionGenerationOptions {
	/** Unsigned seed used for randomized parameters. */
	seed?: number | undefined;
}
