import { exactProductSum, type ScaledNumber } from "./exact-arithmetic";
import { divideScaled } from "./scaled-arithmetic";
import type { SecondOrderOdeParams } from "./types";

/**
 * Takes a square root without restoring a potentially unrepresentable discriminant.
 * @param value - Nonzero signed discriminant magnitude and binary exponent.
 * @returns Positive scaled square root of the absolute discriminant.
 */
function squareRoot(value: ScaledNumber): ScaledNumber {
	const half = Math.floor(value[1] / 2);
	return [Math.sqrt(Math.abs(value[0]) * 2 ** (value[1] - 2 * half)), half];
}

/**
 * Solves quadratics whose monic intermediates exceed the binary64 range.
 * @param a2 - Original nonzero leading coefficient.
 * @param a1 - Original linear coefficient.
 * @param a0 - Original constant coefficient.
 * @returns Classified roots with only final quotients materialized.
 */
export function solveScaledQuadratic(
	a2: number,
	a1: number,
	a0: number,
): SecondOrderOdeParams {
	const discriminant = exactProductSum([
		[a1, a1],
		[-4, a2, a0],
	]);
	const denominator = exactProductSum([[2, a2]]);
	const real = divideScaled(
		a1 === 0 ? [-a1, 0] : exactProductSum([[-a1]]),
		denominator,
	);
	const common = { order: 2 as const, a2, a1, a0 };
	if (discriminant[0] === 0)
		return {
			...common,
			rootType: "repeated_real",
			roots: { r1: real, r2: real },
		};
	const root = squareRoot(discriminant);
	if (discriminant[0] < 0)
		return {
			...common,
			rootType: "complex_conjugate",
			roots: { r1: real, im: Math.abs(divideScaled(root, denominator)) },
		};
	// Align the signed square root and linear coefficient before halving q.
	const linear = exactProductSum([[a1]]);
	const exponent = Math.max(root[1], linear[1]);
	const sign = a1 < 0 ? -1 : 1;
	const q: ScaledNumber = [
		-(
			linear[0] * 2 ** (linear[1] - exponent) +
			sign * root[0] * 2 ** (root[1] - exponent)
		),
		exponent - 1,
	];
	const first = divideScaled(q, exactProductSum([[a2]]));
	const companion = divideScaled(
		a0 === 0 ? [a0, 0] : exactProductSum([[a0]]),
		q,
	);
	return {
		...common,
		rootType: "distinct_real",
		roots: {
			r1: Math.max(first, companion),
			r2: Math.min(first, companion),
		},
	};
}
