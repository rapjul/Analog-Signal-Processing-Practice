/** Smallest normal binary64 value; smaller nonzero values have reduced precision. */
export const MIN_NORMAL_NUMBER = Number.MIN_VALUE / Number.EPSILON;

/** Signed normalized mantissa and unrestricted integer binary exponent; zero has exponent zero. */
type ScaledNumber = readonly [mantissa: number, exponent: number];

/** Particular amplitude and collision order evaluated in a common scale. */
interface PolynomialResponse {
	/** Particular amplitude after restoring equation scale. */
	Kp: number;
	/** Number of resonance factors required by the characteristic polynomial. */
	multiplicity: 0 | 1 | 2;
}

/** Harmonic amplitudes and exact undamped-resonance classification. */
interface HarmonicResponse {
	/** Cosine amplitude, zero for the resonant trial. */
	A: number;
	/** Sine amplitude, including the resonant trial coefficient. */
	B: number;
	/** Whether the harmonic trial requires a factor of time. */
	multiplicity: 0 | 1;
}

/** Ordered polynomial and first-derivative factor lists shared by detection and evaluation. */
type PolynomialProducts = readonly [
	value: readonly (readonly number[])[],
	derivative: readonly (readonly number[])[],
];

/**
 * Defines polynomial and derivative products once for both arithmetic paths.
 * @param a2 - Monic quadratic coefficient.
 * @param a1 - Monic linear coefficient.
 * @param a0 - Monic constant coefficient.
 * @param p - Forcing exponent.
 * @returns Polynomial contributions followed by derivative contributions.
 */
function polynomialProducts(
	a2: number,
	a1: number,
	a0: number,
	p: number,
): PolynomialProducts {
	return [
		[[a2, p, p], [a1, p], [a0]],
		[[2, a2, p], [a1]],
	];
}

/**
 * Detects unsafe polynomial or derivative products using the evaluator's definitions.
 * @param a2 - Monic quadratic coefficient.
 * @param a1 - Monic linear coefficient.
 * @param a0 - Monic constant coefficient.
 * @param p - Forcing exponent.
 * @returns Whether any expanded product needs scaled evaluation.
 */
export function polynomialNeedsScaling(
	a2: number,
	a1: number,
	a0: number,
	p: number,
): boolean {
	const [terms, derivatives] = polynomialProducts(a2, a1, a0, p);
	return [...terms, ...derivatives].some(
		/** @param factors - Original factors for one contribution. */
		(factors) => productNeedsScaling(...factors),
	);
}

/**
 * Decomposes finite operands without losing subnormal values or signed zero.
 * @param value - Finite operand.
 * @returns Signed mantissa with magnitude in [1, 2), or signed zero, and its exponent.
 */
function binaryParts(value: number): ScaledNumber {
	if (!Number.isFinite(value))
		throw new Error("Scaled operands must be finite");
	if (value === 0) return [value, 0];
	let exponent = Math.min(1023, Math.floor(Math.log2(Math.abs(value))));
	let mantissa = value / 2 ** exponent;
	// Math.log2 can round across a power-of-two boundary.
	if (Math.abs(mantissa) < 1) {
		mantissa *= 2;
		exponent--;
	} else if (Math.abs(mantissa) >= 2) {
		mantissa /= 2;
		exponent++;
	}
	return [mantissa, exponent];
}

/**
 * Normalizes bounded arithmetic while retaining an unrestricted exponent.
 * @param mantissa - Finite arithmetic result.
 * @param exponent - Removed binary exponent.
 * @returns Normalized value, preserving signed zero.
 */
function normalized(mantissa: number, exponent: number): ScaledNumber {
	const [part, adjustment] = binaryParts(mantissa);
	return [part, part === 0 ? 0 : exponent + adjustment];
}

/**
 * Multiplies scaled values without materializing their powers of two.
 * @param values - Scaled factors.
 * @returns Normalized product, including products outside the binary64 range.
 */
function multiplyScaled(...values: ScaledNumber[]): ScaledNumber {
	let result: ScaledNumber = [1, 0];
	for (const value of values)
		result = normalized(result[0] * value[0], result[1] + value[1]);
	return result;
}

/**
 * Builds a product before multiplication can overflow or underflow.
 * @param factors - Finite numeric factors.
 * @returns Product with a normalized mantissa and unrestricted exponent.
 */
function scaledProduct(...factors: number[]): ScaledNumber {
	return multiplyScaled(...factors.map(binaryParts));
}

/**
 * Adds largest terms first so exact cancellation exposes smaller contributions.
 * @param terms - Signed scaled contributions.
 * @returns Scaled sum without materializing large or tiny terms.
 */
function sumScaled(...terms: ScaledNumber[]): ScaledNumber {
	const ordered = [...terms].sort(
		/** @param left - First contribution. @param right - Second contribution. */
		(left, right) => right[1] - left[1],
	);
	let result: ScaledNumber = [0, 0];
	for (const term of ordered) {
		if (term[0] === 0) continue;
		if (result[0] === 0) {
			result = term;
			continue;
		}
		const exponent = Math.max(result[1], term[1]);
		result = normalized(
			result[0] * 2 ** (result[1] - exponent) +
				term[0] * 2 ** (term[1] - exponent),
			exponent,
		);
	}
	return result;
}

/**
 * Applies the existing relative cancellation tolerance to unmaterialized terms.
 * @param terms - Contributions whose cancellation is being classified.
 * @returns Whether the residual is within the existing rounding-error bound.
 */
function scaledCancellation(...terms: ScaledNumber[]): boolean {
	const nonzero = terms.filter(
		/** @param term - Scaled contribution. */
		(term) => term[0] !== 0,
	);
	if (nonzero.length === 0) return true;
	const exponent = Math.max(
		...nonzero.map(
			/** @param term - Nonzero contribution. */
			(term) => term[1],
		),
	);
	const aligned = nonzero.map(
		/** @param term - Contribution expressed in the common exponent. */
		(term) => term[0] * 2 ** (term[1] - exponent),
	);
	const residual = aligned.reduce(
		/** @param total - Accumulated sum. @param term - Next aligned contribution. */
		(total, term) => total + term,
		0,
	);
	return hasCancellation(residual, ...aligned);
}

/**
 * Materializes only the final quotient, preserving representable subnormal answers.
 * @param numerator - Scaled numerator, including signed zero.
 * @param denominator - Nonzero scaled denominator.
 * @returns Final binary64 quotient; only the final result may overflow or underflow.
 */
function divideScaled(
	numerator: ScaledNumber,
	denominator: ScaledNumber,
): number {
	if (denominator[0] === 0)
		throw new Error("Particular-solution divisor must be non-zero");
	const [mantissa, exponent] = normalized(
		numerator[0] / denominator[0],
		numerator[1] - denominator[1],
	);
	if (mantissa === 0) return mantissa;
	if (exponent > 1023) return Math.sign(mantissa) * Number.POSITIVE_INFINITY;
	if (exponent < -1075) return Math.sign(mantissa) * 0;
	if (exponent < -1022) return mantissa * 2 ** -1022 * 2 ** (exponent + 1022);
	return mantissa * 2 ** exponent;
}

/**
 * Detects unsafe product intermediates before they lose magnitude information.
 * @param factors - Original finite factors, including possible exact zeros.
 * @returns Whether the product needs the shared scaled representation.
 */
export function productNeedsScaling(...factors: number[]): boolean {
	if (factors.includes(0)) return false;
	let product = 1;
	for (const factor of factors) {
		product *= factor;
		if (!Number.isFinite(product) || Math.abs(product) < MIN_NORMAL_NUMBER)
			return true;
	}
	return false;
}

/**
 * Divides without overflowing or underflowing a cancellable intermediate.
 * @param numerator - Finite forcing amplitude.
 * @param first - Finite nonzero equation scale.
 * @param second - Finite nonzero solution divisor.
 * @param additional - Additional finite nonzero divisor factors.
 * @returns Final quotient with signed-zero handling.
 */
export function divideByProduct(
	numerator: number,
	first: number,
	second: number,
	...additional: number[]
): number {
	const factors = [first, second, ...additional];
	if (![numerator, ...factors].every(Number.isFinite) || factors.includes(0))
		throw new Error(
			"Particular-solution factors must be finite and divisors non-zero",
		);
	if (additional.length === 0 && !productNeedsScaling(first, second))
		return numerator / (first * second);
	return divideScaled(scaledProduct(numerator), scaledProduct(...factors));
}

/**
 * Solves a polynomial response with independently scaled polynomial and derivative terms.
 * @param numerator - Original forcing amplitude.
 * @param equationScale - Removed leading coefficient.
 * @param a2 - Monic quadratic coefficient, zero for first-order equations.
 * @param a1 - Monic linear coefficient.
 * @param a0 - Monic constant coefficient.
 * @param p - Finite exponential forcing exponent.
 * @returns Particular amplitude and resonance multiplicity.
 */
export function computeScaledPolynomialResponse(
	numerator: number,
	equationScale: number,
	a2: number,
	a1: number,
	a0: number,
	p: number,
): PolynomialResponse {
	const [products, derivatives] = polynomialProducts(a2, a1, a0, p);
	const terms = products.map(
		/** @param factors - Original factors for one polynomial term. */
		(factors) => scaledProduct(...factors),
	);
	const derivativeTerms = derivatives.map(
		/** @param factors - Original factors for one derivative term. */
		(factors) => scaledProduct(...factors),
	);
	const multiplicity = scaledCancellation(...terms)
		? scaledCancellation(...derivativeTerms)
			? 2
			: 1
		: 0;
	const divisor =
		multiplicity === 0
			? sumScaled(...terms)
			: multiplicity === 1
				? sumScaled(...derivativeTerms)
				: scaledProduct(2, a2);
	return {
		Kp: divideScaled(
			scaledProduct(numerator),
			multiplyScaled(scaledProduct(equationScale), divisor),
		),
		multiplicity,
	};
}

/**
 * Solves the harmonic matrix without materializing its products, determinant, or common amplitude.
 * @param numerator - Original forcing amplitude.
 * @param equationScale - Removed leading coefficient.
 * @param a2 - Monic quadratic coefficient, zero for first-order equations.
 * @param a1 - Monic damping coefficient.
 * @param a0 - Monic constant coefficient.
 * @param w - Finite angular frequency.
 * @returns Finite harmonic coefficients whenever their final values are representable.
 */
export function computeScaledHarmonicResponse(
	numerator: number,
	equationScale: number,
	a2: number,
	a1: number,
	a0: number,
	w: number,
): HarmonicResponse {
	const constant = scaledProduct(a0);
	const negativeQuadratic = scaledProduct(-a2, w, w);
	const real = sumScaled(constant, negativeQuadratic);
	const imaginary = scaledProduct(a1, w);
	if (
		scaledCancellation(constant, negativeQuadratic) &&
		(a1 === 0 || w === 0)
	) {
		if (a2 === 0 || w === 0)
			throw new Error("Unsupported degenerate sinusoidal resonance");
		return {
			A: 0,
			B: divideByProduct(numerator, equationScale, 2 * a2, w),
			multiplicity: 1,
		};
	}
	const determinant = sumScaled(
		multiplyScaled(real, real),
		multiplyScaled(imaginary, imaginary),
	);
	const denominator = multiplyScaled(
		scaledProduct(equationScale),
		determinant,
	);
	return {
		A: divideScaled(
			multiplyScaled(scaledProduct(numerator), real),
			denominator,
		),
		B: divideScaled(
			multiplyScaled(scaledProduct(numerator), imaginary),
			denominator,
		),
		multiplicity: 0,
	};
}

/**
 * Detects cancellation relative to a finite term-magnitude sum.
 * @param value - Computed sum or difference.
 * @param magnitude - Finite sum of absolute term magnitudes.
 * @returns Whether rounding error explains the residual.
 */
export function isCancellationZero(value: number, magnitude: number): boolean {
	return (
		Number.isFinite(value) &&
		Number.isFinite(magnitude) &&
		Math.abs(value) <= 32 * Number.EPSILON * magnitude
	);
}

/**
 * Tests cancellation after scaling individual materialized terms.
 * @param value - Computed polynomial or derivative residual.
 * @param terms - Individual finite contributions.
 * @returns Whether the scaled residual is zero within floating-point precision.
 */
export function hasCancellation(value: number, ...terms: number[]): boolean {
	const scale = Math.max(...terms.map(Math.abs));
	if (scale === 0) return value === 0;
	const magnitude = terms.reduce(
		/** @param total - Accumulated bound. @param term - Next contribution. */
		(total, term) => total + Math.abs(term / scale),
		0,
	);
	return isCancellationZero(value / scale, magnitude);
}
