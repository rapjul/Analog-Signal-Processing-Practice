/**
 * Formats the angular frequency from the actual fundamental period.
 * @param period - Fundamental period in seconds.
 * @returns Exact frequency LaTeX, preserving the standard drill notation.
 */
export function formatFourierFrequency(period: number): string {
	if (period === 2) return "\\pi";
	if (period === 4) return "\\frac{\\pi}{2}";
	return `\\frac{2\\pi}{${period}}`;
}
