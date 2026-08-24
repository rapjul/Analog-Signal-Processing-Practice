/** Shared exact LaTeX formatting for configured convolution pulses. */

import {
	formatScaledMathBody,
	formatSubstitutedDifference,
	formatTranslatedArgument,
	sanitizeLatexMath,
} from "$lib/math-engine/formatting";

export { formatSubstitutedDifference, formatTranslatedArgument };

/**
 * Formats an amplitude multiplier without writing a redundant coefficient.
 *
 * @param amplitude - Exact real pulse amplitude.
 * @param body - LaTeX signal body to scale.
 * @returns Scaled LaTeX expression.
 */
export function formatPulseScale(amplitude: number, body: string): string {
	return sanitizeLatexMath(formatScaledMathBody(amplitude, body));
}

/**
 * Formats a rectangular pulse while simplifying a unit denominator.
 *
 * @param width - Positive pulse width.
 * @param shift - Pulse center.
 * @param amplitude - Pulse amplitude.
 * @returns Exact rectangular-pulse LaTeX.
 */
export function formatRectPulseLatex(
	width: number,
	shift = 0,
	amplitude = 1,
): string {
	const argument = formatTranslatedArgument("t", shift);
	const body =
		width === 1
			? `\\operatorname{rect}(${argument})`
			: `\\operatorname{rect}\\left(\\frac{${argument}}{${width}}\\right)`;
	return sanitizeLatexMath(formatPulseScale(amplitude, body));
}
