/** Exact analytical transfer functions alongside unchanged numerical polynomial coefficients. */
import { ExactFraction } from "$lib/math-engine/exact-fraction";

/** Parameters required to reconstruct every supported analytical coefficient. */
interface Components {
	/** Positive resistance. */
	R: number;
	/** Positive inductance or a harmless placeholder for unused inductance. */
	L: number;
	/** Positive capacitance or a harmless placeholder for unused capacitance. */
	C: number;
}

/**
 * Associates numerical engine coefficients with exact arithmetic from decimal components.
 * @param components - Component values, sanitized only for unused parameters.
 * @returns Exact representations of every coefficient used by the current topologies.
 */
function coefficientFractions(
	components: Components,
): Map<number, ExactFraction> {
	const { R, L, C } = components;
	const r = ExactFraction.fromDecimal(R),
		l = ExactFraction.fromDecimal(L),
		c = ExactFraction.fromDecimal(C);
	const one = new ExactFraction(1n),
		two = new ExactFraction(2n),
		four = new ExactFraction(4n);
	const rc = r.multiply(c),
		wc = one.divide(rc),
		lc = one.divide(l.multiply(c));
	const numericWc = 1 / (R * C);
	return new Map([
		[0, new ExactFraction(0n)],
		[1, one],
		[R / L, r.divide(l)],
		[1 / (L * C), lc],
		[numericWc, wc],
		[2 * numericWc, two.multiply(wc)],
		[4 * numericWc, four.multiply(wc)],
		[numericWc * numericWc, wc.multiply(wc)],
		[1 / numericWc, rc],
	]);
}

/**
 * Formats a polynomial without rounded derived coefficients.
 * @param coefficients - Numerical coefficients in descending order.
 * @param fractions - Exact magnitude representations.
 * @returns Reduced-fraction polynomial in the s variable.
 */
function polynomialLatex(
	coefficients: number[],
	fractions: Map<number, ExactFraction>,
): string {
	const terms: string[] = [];
	for (const [index, coefficient] of coefficients.entries()) {
		if (coefficient === 0) continue;
		const degree = coefficients.length - index - 1;
		const magnitude = Math.abs(coefficient);
		const exact = fractions.get(magnitude);
		if (!exact) throw new Error("Missing exact circuit coefficient");
		const coefficientText =
			degree > 0 && magnitude === 1 ? "" : exact.toLatex();
		const powerText =
			degree === 0 ? "" : degree === 1 ? "s" : `s^${degree}`;
		const sign =
			coefficient < 0
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
 * Builds exact display text from the same coefficient formulas as the numerical engine.
 * @param numerator - Numerical numerator coefficients.
 * @param denominator - Numerical denominator coefficients.
 * @param components - Decimal component values.
 * @returns Analytical rational function with exact fractions.
 */
export function formatCircuitTransferFunction(
	numerator: number[],
	denominator: number[],
	components: Components,
): string {
	const fractions = coefficientFractions(components);
	const negative =
		numerator.every((value) => value <= 0) &&
		numerator.some((value) => value < 0);
	const signedNumerator = negative ? numerator.map(Math.abs) : numerator;
	const num = polynomialLatex(signedNumerator, fractions),
		den = polynomialLatex(denominator, fractions);
	const sign = negative ? "-" : "";
	return den === "1"
		? `${sign}${num}`
		: String.raw`${sign}\frac{${num}}{${den}}`;
}
