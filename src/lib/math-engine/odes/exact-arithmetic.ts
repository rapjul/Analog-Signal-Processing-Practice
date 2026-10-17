/** Signed normalized mantissa and unrestricted binary exponent; zero has exponent zero. */
export type ScaledNumber = readonly [mantissa: number, exponent: number];

/** Exact integer significand multiplied by an unrestricted binary power. */
interface Dyadic {
	/** Signed integer containing every input bit. */
	significand: bigint;
	/** Power of two applied to the significand. */
	exponent: number;
}

/**
 * Decodes a finite binary64 operand without rounding any significand bits.
 * @param value - Finite numeric operand.
 * @returns Exact signed integer significand and binary exponent.
 */
function dyadic(value: number): Dyadic {
	if (!Number.isFinite(value))
		throw new Error("Exact operands must be finite");
	const view = new DataView(new ArrayBuffer(8));
	view.setFloat64(0, value);
	const bits = view.getBigUint64(0);
	const encodedExponent = Number((bits >> 52n) & 2047n);
	const fraction = bits & ((1n << 52n) - 1n);
	const significand =
		encodedExponent === 0 ? fraction : fraction | (1n << 52n);
	return {
		significand: bits >> 63n === 0n ? significand : -significand,
		exponent: encodedExponent === 0 ? -1074 : encodedExponent - 1075,
	};
}

/**
 * Computes one product exactly, avoiding error bounds based on unrelated large terms.
 * @param factors - Finite original operands.
 * @returns Exact dyadic product.
 */
function product(factors: readonly number[]): Dyadic {
	let significand = 1n;
	let exponent = 0;
	for (const factor of factors) {
		const operand = dyadic(factor);
		significand *= operand.significand;
		exponent += operand.exponent;
	}
	return { significand, exponent };
}

/**
 * Rounds a nonzero exact result once, preserving its sign and unrestricted exponent.
 * @param significand - Signed exact integer result.
 * @param exponent - Common binary exponent.
 * @returns Nearest binary64 significand with ties rounded to even.
 */
function rounded(significand: bigint, exponent: number): ScaledNumber {
	if (significand === 0n) return [0, 0];
	const negative = significand < 0n;
	const magnitude = negative ? -significand : significand;
	const length = magnitude.toString(2).length;
	const shift = Math.max(0, length - 53);
	let leading = magnitude >> BigInt(shift);
	if (shift > 0) {
		const remainder = magnitude - (leading << BigInt(shift));
		const halfway = 1n << BigInt(shift - 1);
		if (
			remainder > halfway ||
			(remainder === halfway && (leading & 1n) !== 0n)
		)
			leading++;
	}
	const power = leading === 1n << 53n ? 53 : Math.min(52, length - 1);
	return [
		((negative ? -1 : 1) * Number(leading)) / 2 ** power,
		exponent + shift + power,
	];
}

/**
 * Sums finite-input products exactly before rounding, so cancellation has zero classification error.
 * @param products - Original factor lists for each signed contribution.
 * @returns Scaled residual; its mantissa is zero only when the exact residual is zero.
 */
export function exactProductSum(
	products: readonly (readonly number[])[],
): ScaledNumber {
	const terms = products.map(product).filter(
		/** @param term - Exact product contribution. */
		(term) => term.significand !== 0n,
	);
	if (terms.length === 0) return [0, 0];
	const exponent = Math.min(
		...terms.map(
			/** @param term - Nonzero exact contribution. */
			(term) => term.exponent,
		),
	);
	let significand = 0n;
	for (const term of terms)
		significand += term.significand << BigInt(term.exponent - exponent);
	return rounded(significand, exponent);
}
