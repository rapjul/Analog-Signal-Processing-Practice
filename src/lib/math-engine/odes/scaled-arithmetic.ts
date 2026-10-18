import { exactProductSum, type ScaledNumber } from "./exact-arithmetic";

/** Smallest normal binary64 value; smaller nonzero values have reduced precision. */
export const MIN_NORMAL_NUMBER = Number.MIN_VALUE / Number.EPSILON;

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
 * @param a2 - Working quadratic coefficient.
 * @param a1 - Working linear coefficient.
 * @param a0 - Working constant coefficient.
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
 * Materializes only the final quotient, preserving representable subnormal answers.
 * @param numerator - Scaled numerator, including signed zero.
 * @param denominator - Nonzero scaled denominator.
 * @returns Final binary64 quotient; only the final result may overflow or underflow.
 */
export function divideScaled(
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
	if (exponent < -1075) return mantissa < 0 ? -0 : 0;
	if (exponent < -1022) return mantissa * 2 ** -1022 * 2 ** (exponent + 1022);
	return mantissa * 2 ** exponent;
}

/**
 * Restores a binary scale only after the final value is known.
 * @param value - Finite mantissa to restore.
 * @param exponent - Unrestricted binary exponent.
 * @returns Final binary64 value, including representable subnormals.
 */
export function restoreBinaryScale(value: number, exponent: number): number {
	return divideScaled([value, exponent], [1, 0]);
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
 * Evaluates a resonant harmonic product without overflowing before sine compensation.
 * @param coefficient - Resonant sine coefficient.
 * @param frequency - Angular forcing frequency.
 * @param t - Sampling time.
 * @param derivative - Whether to evaluate the analytic first derivative.
 * @returns Response or derivative after the final scaled conversion.
 */
export function evaluateScaledResonantHarmonic(
	coefficient: number,
	frequency: number,
	t: number,
	derivative = false,
): number {
	const angle = frequency * t;
	const sine = Math.sin(angle);
	const cosine = Math.cos(angle);
	if (![coefficient, frequency, t, angle].every(Number.isFinite))
		return derivative
			? coefficient * (sine + frequency * t * cosine)
			: coefficient * t * sine;
	// Below this bound, replacing sin(x)/x with one loses less than half an ulp.
	// Retain frequency and time separately even when their product rounds to zero.
	const sineFactors = Math.abs(angle) < 2 ** -26 ? [frequency, t] : [sine];
	const products = derivative
		? [
				[coefficient, ...sineFactors],
				[coefficient, frequency, t, cosine],
			]
		: [[coefficient, t, ...sineFactors]];
	return divideScaled(exactProductSum(products), [1, 0]);
}

/**
 * Solves a polynomial response with independently scaled polynomial and derivative terms.
 * @param numerator - Original forcing amplitude.
 * @param equationScale - Removed leading coefficient.
 * @param a2 - Working quadratic coefficient, zero for first-order equations.
 * @param a1 - Working linear coefficient.
 * @param a0 - Working constant coefficient.
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
	const polynomial = exactProductSum(products);
	const derivative = exactProductSum(derivatives);
	const multiplicity =
		polynomial[0] === 0 ? (derivative[0] === 0 ? 2 : 1) : 0;
	const divisor =
		multiplicity === 0
			? polynomial
			: multiplicity === 1
				? derivative
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
 * @param a2 - Working quadratic coefficient, zero for first-order equations.
 * @param a1 - Working damping coefficient.
 * @param a0 - Working constant coefficient.
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
	const real = exactProductSum([[a0], [-a2, w, w]]);
	const imaginary = scaledProduct(a1, w);
	if (real[0] === 0 && (a1 === 0 || w === 0)) {
		if (a2 === 0 || w === 0)
			throw new Error("Unsupported degenerate sinusoidal resonance");
		return {
			A: 0,
			B: divideByProduct(numerator, equationScale, 2, a2, w),
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
 * Retains exponential magnitude when Math.exp alone leaves the binary64 range.
 * @param argument - Exponential argument for a finite evaluation time.
 * @returns Scaled exponential; distant tails exceed every possible finite polynomial factor.
 */
function exponentialScale(argument: number): ScaledNumber {
	const value = Math.exp(argument);
	if (value >= MIN_NORMAL_NUMBER && Number.isFinite(value))
		return binaryParts(value);
	// Degree-two responses and their derivatives have at most four finite factors,
	// so these exponential tails exceed every possible compensating binary exponent.
	if (argument > 10000) return [1, 100000];
	if (argument < -10000) return [1, -100000];
	const exponent = Math.floor(argument / Math.LN2);
	return normalized(Math.exp(argument - exponent * Math.LN2), exponent);
}

/**
 * Evaluates polynomial-exponential responses without materializing their powers first.
 * @param coefficient - Particular solution coefficient.
 * @param p - Finite exponential exponent.
 * @param multiplicity - Polynomial degree from resonance.
 * @param t - Evaluation time; nonfinite values retain direct IEEE arithmetic behavior.
 * @param derivative - Whether to evaluate the analytic first derivative.
 * @returns Final response or derivative with compensation retained through multiplication.
 */
export function evaluateScaledExponential(
	coefficient: number,
	p: number,
	multiplicity: 0 | 1 | 2,
	t: number,
	derivative = false,
): number {
	if (!Number.isFinite(coefficient) || !Number.isFinite(t)) {
		const power = multiplicity === 0 ? 1 : t ** multiplicity;
		const factor = derivative
			? multiplicity === 0
				? p
				: multiplicity * t ** (multiplicity - 1) + p * power
			: power;
		return coefficient * Math.exp(p * t) * factor;
	}
	if (coefficient === 0) return coefficient;
	const powers = multiplicity === 0 ? [] : multiplicity === 1 ? [t] : [t, t];
	let polynomial = scaledProduct(coefficient, ...powers);
	if (derivative) {
		const terms = [scaledProduct(coefficient, p, ...powers)];
		if (multiplicity !== 0)
			terms.push(
				scaledProduct(
					coefficient,
					multiplicity,
					...(multiplicity === 1 ? [] : [t]),
				),
			);
		polynomial = sumScaled(...terms);
	}
	return divideScaled(
		multiplyScaled(polynomial, exponentialScale(p * t)),
		[1, 0],
	);
}
