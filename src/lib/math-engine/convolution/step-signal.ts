/** Causal constant signal construction shared by the configured solver. */

import {
	formatScaledMathBody,
	formatTranslatedArgument,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";
import type { ResolvedConvolutionSignal } from "./configuration";

/**
 * Resolves a signed and translated unit step with its concrete polynomial piece.
 * @param amplitude - Nonzero signed amplitude.
 * @param shift - Inclusive onset of the causal step.
 * @param key - Signal identifier used for stable section and piece IDs.
 * @returns A constant signal on the right-unbounded support.
 */
export function resolveStepSignal(
	amplitude: number,
	shift: number,
	key: "x" | "h",
): ResolvedConvolutionSignal {
	return {
		kind: "step",
		parameter: 1,
		shift,
		amplitude,
		latex: sanitizeLatexMath(
			formatScaledMathBody(
				amplitude,
				`u(${formatTranslatedArgument("t", shift)})`,
			),
		),
		sections: [
			{
				id: `${key}-1`,
				start: shift,
				end: Infinity,
				startIncluded: true,
				endIncluded: false,
			},
		],
		breakpoints: [shift],
		pieces: [
			{
				id: `${key}-piece-1`,
				start: shift,
				end: Infinity,
				coefficients: [amplitude, 0],
			},
		],
		/** @param time - Signal evaluation time. @returns The active amplitude or zero. */
		eval: (time: number): number => (time >= shift ? amplitude : 0),
	};
}
