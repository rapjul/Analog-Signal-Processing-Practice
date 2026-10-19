import { exactProductSum } from "./exact-arithmetic";
import { divideScaled } from "./scaled-arithmetic";

/**
 * Evaluates harmonic products with one final rounding after exact accumulation.
 * @param A - Cosine amplitude.
 * @param B - Sine amplitude.
 * @param frequency - Angular frequency.
 * @param t - Evaluation time.
 * @param derivative - Whether to evaluate the analytic derivative.
 * @returns Finite compensated response, or legacy IEEE behavior for nonfinite inputs.
 */
export function evaluateHarmonic(
	A: number,
	B: number,
	frequency: number,
	t: number,
	derivative = false,
): number {
	const angle = frequency * t;
	const sine = Math.sin(angle);
	const cosine = Math.cos(angle);
	if (![A, B, frequency, t, angle].every(Number.isFinite))
		return derivative
			? -A * frequency * sine + B * frequency * cosine
			: A * cosine + B * sine;
	// sin(x)/x rounds to one here, including when frequency*time underflows.
	const sineFactors = Math.abs(angle) < 2 ** -26 ? [frequency, t] : [sine];
	const products = derivative
		? [
				[-A, frequency, ...sineFactors],
				[B, frequency, cosine],
			]
		: [
				[A, cosine],
				[B, ...sineFactors],
			];
	return divideScaled(exactProductSum(products), [1, 0]);
}
