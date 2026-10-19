import { exactProductSum } from "./exact-arithmetic";
import {
	divideScaled,
	MIN_NORMAL_NUMBER,
	productNeedsScaling,
} from "./scaled-arithmetic";

/**
 * Detects a rounded intermediate whose magnitude requires extended-range arithmetic.
 * @param value - Ordinary intermediate result.
 * @returns Whether the result is nonfinite or nonzero subnormal.
 */
function unsafeMagnitude(value: number): boolean {
	return (
		!Number.isFinite(value) ||
		(value !== 0 && Math.abs(value) < MIN_NORMAL_NUMBER)
	);
}

/**
 * Solves distinct-mode constants with symmetric quotients when ordinary arithmetic loses range.
 * @param r1 - First natural root.
 * @param r2 - Second natural root.
 * @param y - Target initial value.
 * @param dy - Target initial derivative.
 * @returns Constants in first-mode, second-mode order.
 */
export function distinctInitialConstants(
	r1: number,
	r2: number,
	y: number,
	dy: number,
): readonly [number, number] {
	const numerator = dy - r1 * y;
	const denominator = r2 - r1;
	const C2 = numerator / denominator;
	const C1 = y - C2;
	if (![r1, r2, y, dy].every(Number.isFinite) || denominator === 0)
		return [C1, C2];
	const safe =
		!productNeedsScaling(r1, y) &&
		![numerator, denominator, C1, C2].some(unsafeMagnitude) &&
		(C2 !== 0 || numerator === 0);
	if (safe) return [C1, C2];
	const divisor = exactProductSum([[r2], [-r1]]);
	return [
		divideScaled(exactProductSum([[r2, y], [-dy]]), divisor),
		divideScaled(exactProductSum([[dy], [-r1, y]]), divisor),
	];
}

/**
 * Solves the second repeated or complex constant without materializing an unsafe numerator.
 * @param root - Repeated root or real part of a complex root.
 * @param y - Target initial value and first constant.
 * @param dy - Target initial derivative.
 * @param divisor - One for repeated roots, imaginary frequency for complex roots.
 * @returns Second constant, retaining legacy IEEE behavior for nonfinite inputs.
 */
export function secondInitialConstant(
	root: number,
	y: number,
	dy: number,
	divisor: number,
): number {
	const numerator = dy - root * y;
	const result = numerator / divisor;
	if (![root, y, dy, divisor].every(Number.isFinite) || divisor === 0)
		return result;
	if (
		!productNeedsScaling(root, y) &&
		!unsafeMagnitude(numerator) &&
		!unsafeMagnitude(result) &&
		(result !== 0 || numerator === 0)
	)
		return result;
	return divideScaled(
		exactProductSum([[dy], [-root, y]]),
		exactProductSum([[divisor]]),
	);
}
