/**
 * Rational Fraction Formatting Utilities.
 * Converts numerical values to exact reduced LaTeX fractions (e.g. 1/6 -> \frac{1}{6}).
 */

/**
 * Finds greatest common divisor of two integers.
 * @param {number} a First integer
 * @param {number} b Second integer
 * @returns {number} Greatest common divisor
 */
function gcd(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y) {
		const t = y;
		y = x % y;
		x = t;
	}
	return x;
}

/**
 * Converts a floating-point number into an exact or approximate reduced fraction string in LaTeX.
 * @param {number} val Floating-point number to format
 * @param {number} [maxDenominator=1000] Maximum denominator limit for continued fraction approximation
 * @param {number} [tolerance=1e-6] Tolerance for floating point exactness matching
 * @returns {string} Reduced LaTeX fraction string or formatted integer
 */
export function toFractionLatex(
	val: number,
	maxDenominator = 1000,
	tolerance = 1e-6,
): string {
	if (Math.abs(val) < tolerance) {
		return "0";
	}

	const isNegative = val < 0;
	const absVal = Math.abs(val);

	// Check if integer
	const nearestInt = Math.round(absVal);
	if (Math.abs(absVal - nearestInt) < tolerance) {
		return isNegative ? `-${nearestInt}` : `${nearestInt}`;
	}

	// Best rational approximation using continued fractions algorithm
	let h1 = 1;
	let h2 = 0;
	let k1 = 0;
	let k2 = 1;
	let b = absVal;

	do {
		const a = Math.floor(b);
		let aux = h1;
		h1 = a * h1 + h2;
		h2 = aux;

		aux = k1;
		k1 = a * k1 + k2;
		k2 = aux;

		if (Math.abs(absVal - h1 / k1) < tolerance) {
			break;
		}

		b = 1 / (b - a);
	} while (k1 <= maxDenominator && Math.abs(b) < 1e10);

	// Fallback if denominator exceeded limit
	if (k1 > maxDenominator || Math.abs(absVal - h1 / k1) >= 1e-4) {
		const rounded = Number(val.toFixed(3));
		return `${rounded}`;
	}

	// Simplify fraction
	const common = gcd(h1, k1);
	const num = h1 / common;
	const den = k1 / common;

	if (den === 1) {
		return isNegative ? `-${num}` : `${num}`;
	}

	const fracStr = `\\frac{${num}}{${den}}`;
	return isNegative ? `-${fracStr}` : fracStr;
}
