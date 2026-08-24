/** Numerical evaluators for canonical continuous-time convolution signals. */

/**
 * Evaluates a rectangular pulse.
 *
 * @param {number} t - Sample time.
 * @param {number} tStart - Pulse start time.
 * @param {number} width - Pulse width.
 * @param {number} height - Pulse amplitude.
 * @returns {number} Signal value.
 */
export function evalRect(
	t: number,
	tStart: number,
	width: number,
	height: number,
): number {
	return t >= tStart && t < tStart + width ? height : 0;
}

/**
 * Evaluates a causal exponential decay.
 *
 * @param {number} t - Sample time.
 * @param {number} a - Positive decay rate.
 * @param {number} K - Amplitude multiplier.
 * @returns {number} Signal value.
 */
export function evalExpDecay(t: number, a: number, K: number): number {
	return t < 0 ? 0 : K * Math.exp(-a * t);
}

/**
 * Evaluates a symmetric triangular pulse.
 *
 * @param {number} t - Sample time.
 * @param {number} tCenter - Peak time.
 * @param {number} width - Total base width.
 * @param {number} height - Peak height.
 * @returns {number} Signal value.
 */
export function evalTri(
	t: number,
	tCenter: number,
	width: number,
	height: number,
): number {
	const halfWidth = width / 2;
	const distance = Math.abs(t - tCenter);
	return distance >= halfWidth ? 0 : height * (1 - distance / halfWidth);
}
