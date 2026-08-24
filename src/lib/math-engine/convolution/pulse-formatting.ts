/** Shared exact LaTeX formatting for configured convolution pulses. */

/**
 * Formats a translated variable without redundant signs.
 *
 * @param variable - Mathematical variable to translate.
 * @param shift - Pulse center applied as `variable - shift`.
 * @returns Simplified translated argument.
 */
export function formatTranslatedArgument(
	variable: string,
	shift: number,
): string {
	if (shift === 0) return variable;
	return shift > 0
		? `${variable} - ${shift}`
		: `${variable} + ${Math.abs(shift)}`;
}

/**
 * Formats an amplitude multiplier without writing a redundant coefficient.
 *
 * @param amplitude - Exact real pulse amplitude.
 * @param body - LaTeX signal body to scale.
 * @returns Scaled LaTeX expression.
 */
export function formatPulseScale(amplitude: number, body: string): string {
	if (amplitude === 1) return body;
	if (amplitude === -1) return `-${body}`;
	return `${amplitude}${body}`;
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
	return formatPulseScale(amplitude, body);
}
