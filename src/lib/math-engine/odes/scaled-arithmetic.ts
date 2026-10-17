/** Smallest normal binary64 value; smaller nonzero values have reduced precision. */
export const MIN_NORMAL_NUMBER = Number.MIN_VALUE / Number.EPSILON;

/** Signed mantissa and its base-two exponent for a finite nonzero number. */
type BinaryParts = readonly [mantissa: number, exponent: number];

/**
 * Decomposes finite nonzero values without overflowing the largest binary64 power.
 * @param value - Finite nonzero operand.
 * @returns Mantissa and exponent whose product reconstructs the operand.
 */
function binaryParts(value: number): BinaryParts {
	const exponent = Math.min(1023, Math.floor(Math.log2(Math.abs(value))));
	return [value / 2 ** exponent, exponent];
}

/**
 * Divides by factors without overflowing or underflowing a cancellable intermediate.
 * @param numerator - Finite forcing amplitude.
 * @param first - Finite nonzero removed equation scale.
 * @param second - Finite nonzero normalized solution divisor.
 * @param additional - Additional finite nonzero polynomial scaling factors.
 * @returns Quotient, with overflow only when the result itself exceeds binary64 range.
 */
export function divideByProduct(
	numerator: number,
	first: number,
	second: number,
	...additional: number[]
): number {
	const factors = [first, second, ...additional];
	if (
		!Number.isFinite(numerator) ||
		!factors.every(
			/** @param factor - Next denominator factor. */
			(factor) => Number.isFinite(factor) && factor !== 0,
		)
	)
		throw new Error(
			"Particular-solution factors must be finite and divisors non-zero",
		);
	if (numerator === 0)
		return factors.reduce(
			/** @param quotient - Signed zero quotient. @param factor - Next divisor. */
			(quotient, factor) => quotient / factor,
			numerator,
		);
	const product = first * second;
	if (
		additional.length === 0 &&
		Number.isFinite(product) &&
		Math.abs(product) >= MIN_NORMAL_NUMBER
	)
		return numerator / product;
	const [n, nExponent] = binaryParts(numerator);
	let mantissa = n;
	let exponent = nExponent;
	for (const factor of factors) {
		const [part, partExponent] = binaryParts(factor);
		mantissa /= part;
		exponent -= partExponent;
	}
	const initialExponent = Math.max(-1022, Math.min(1023, exponent));
	return mantissa * 2 ** initialExponent * 2 ** (exponent - initialExponent);
}

/**
 * Restores a forcing quotient when the monic polynomial overflows Horner evaluation.
 * @param numerator - Original forcing amplitude.
 * @param equationScale - Leading coefficient removed from the equation.
 * @param a2 - Monic quadratic coefficient, zero for first-order equations.
 * @param a1 - Monic linear coefficient.
 * @param a0 - Monic constant coefficient.
 * @param p - Finite exponential forcing exponent.
 * @returns Forcing divided by the polynomial without constructing its large powers.
 */
export function divideByScaledPolynomial(
	numerator: number,
	equationScale: number,
	a2: number,
	a1: number,
	a0: number,
	p: number,
): number {
	const frequencyScale = Math.max(1, Math.abs(p));
	const linear = a1 / frequencyScale;
	const constant = a0 / frequencyScale / frequencyScale;
	const coefficientScale = Math.max(
		Math.abs(a2),
		Math.abs(linear),
		Math.abs(constant),
	);
	const frequency = p / frequencyScale;
	const polynomial =
		(a2 / coefficientScale) * frequency * frequency +
		(linear / coefficientScale) * frequency +
		constant / coefficientScale;
	return divideByProduct(
		numerator,
		equationScale,
		frequencyScale,
		frequencyScale,
		coefficientScale,
		polynomial,
	);
}

/**
 * Detects cancellation relative to an already finite sum of term magnitudes.
 * @param value - Computed sum or difference.
 * @param magnitude - Finite sum of the absolute term magnitudes.
 * @returns Whether rounding error can explain the residual.
 */
export function isCancellationZero(value: number, magnitude: number): boolean {
	return (
		Number.isFinite(value) &&
		Number.isFinite(magnitude) &&
		Math.abs(value) <= 32 * Number.EPSILON * magnitude
	);
}

/**
 * Tests cancellation after scaling individual terms, before their sum can overflow.
 * @param value - Computed polynomial or derivative residual.
 * @param terms - Individual finite polynomial or derivative terms.
 * @returns Whether the scaled residual is zero within floating-point precision.
 */
export function hasCancellation(value: number, ...terms: number[]): boolean {
	const scale = Math.max(...terms.map(Math.abs));
	if (scale === 0) return value === 0;
	const magnitude = terms.reduce(
		/** @param total - Accumulated scaled bound. @param term - Next polynomial term. */
		(total, term) => total + Math.abs(term / scale),
		0,
	);
	return isCancellationZero(value / scale, magnitude);
}
