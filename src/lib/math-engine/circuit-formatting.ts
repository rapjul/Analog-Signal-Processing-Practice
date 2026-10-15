/** Exact analytical displays retain coefficient identity independently of rounded numerical values. */
import type {
	CircuitCoefficient,
	CircuitPolynomials,
} from "$lib/math-engine/circuit-types";

/**
 * Formats a polynomial using the exact value attached to each position.
 * @param coefficients - Paired coefficients in descending powers.
 * @param reverseSign - Whether to display the additive inverse.
 * @returns Reduced-fraction polynomial in the s variable.
 */
function polynomialLatex(
	coefficients: CircuitCoefficient[],
	reverseSign = false,
): string {
	const terms: string[] = [];
	for (const [index, coefficient] of coefficients.entries()) {
		const exact = reverseSign
			? coefficient.exact.negate()
			: coefficient.exact;
		if (exact.numerator === 0n) continue;
		const degree = coefficients.length - index - 1;
		const negative = exact.numerator < 0n;
		const magnitude = negative ? exact.negate() : exact;
		const coefficientText =
			degree > 0 && magnitude.numerator === magnitude.denominator
				? ""
				: magnitude.toLatex();
		const powerText =
			degree === 0 ? "" : degree === 1 ? "s" : `s^${degree}`;
		const sign = negative
			? terms.length
				? " - "
				: "-"
			: terms.length
				? " + "
				: "";
		terms.push(
			`${sign}${coefficientText}${coefficientText && powerText ? " " : ""}${powerText}`,
		);
	}
	return terms.join("") || "0";
}

/**
 * Builds analytical text without looking up coefficients by floating-point value.
 * @param polynomials - Numeric/exact coefficient pairs from the topology calculation.
 * @returns Analytical rational function with exact fractions.
 */
export function formatCircuitTransferFunction(
	polynomials: CircuitPolynomials,
): string {
	const { numerator, denominator } = polynomials;
	const negative =
		numerator.every(
			/**
			 * @param value - Numerator coefficient.
			 * @returns Whether it is nonpositive exactly.
			 */
			(value) => value.exact.numerator <= 0n,
		) &&
		numerator.some(
			/**
			 * @param value - Numerator coefficient.
			 * @returns Whether it is negative exactly.
			 */
			(value) => value.exact.numerator < 0n,
		);
	const num = polynomialLatex(numerator, negative),
		den = polynomialLatex(denominator);
	const sign = negative ? "-" : "";
	return den === "1"
		? `${sign}${num}`
		: String.raw`${sign}\frac{${num}}{${den}}`;
}
