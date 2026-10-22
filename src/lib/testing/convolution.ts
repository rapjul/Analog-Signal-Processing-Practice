/** Configured problems shared by convolution lifecycle and component tests. */
import {
	TEXTBOOK_CONVOLUTION_SIGNAL_SELECTION as base,
	type ConvolutionProblem,
	type ConvolutionSignalType,
	generateConfiguredConvolutionProblem,
} from "$lib/math-engine/convolution/index";

/**
 * Builds a reproducible problem using only the production configured engine.
 * @param x - Input signal family.
 * @param h - Moving signal family before the learner chooses a path.
 * @param seed - Reproducible parameter and option-ordering seed.
 * @returns Complete configured problem with concrete teaching metadata.
 */
export function convolutionProblem(
	x: ConvolutionSignalType = "rect",
	h: ConvolutionSignalType = "rect",
	seed = 12,
): ConvolutionProblem {
	return generateConfiguredConvolutionProblem(
		{
			x: { ...base, type: x },
			h: { ...base, type: h, shiftState: "shifted", shiftValue: "1" },
		},
		{ seed },
	);
}
