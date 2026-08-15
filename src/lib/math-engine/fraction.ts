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

/**
 * Checks if a string is completely enclosed by a single balanced pair of outer parentheses.
 * @param {string} s String to check
 * @returns {boolean} True if the string is wrapped in balanced outer parentheses
 */
function isFullyEnclosedInParens(s: string): boolean {
	if (!s.startsWith("(") || !s.endsWith(")")) {
		return false;
	}
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "(") {
			depth++;
		} else if (s[i] === ")") {
			depth--;
			if (depth === 0 && i < s.length - 1) {
				return false;
			}
		}
	}
	return depth === 0;
}

/**
 * Strips a balanced outer parenthesis layer and extracts any leading outer negative sign.
 * @param {string} str Raw input string
 * @returns {{ sign: number; content: string }} Outer sign multiplier and unwrapped content
 */
function stripOuterParens(str: string): { sign: number; content: string } {
	const s = str.trim();

	// Check if prefixed with negative e.g. -( ... )
	if (
		s.startsWith("-") &&
		s.slice(1).trim().startsWith("(") &&
		s.endsWith(")")
	) {
		const inner = s.slice(1).trim();
		if (isFullyEnclosedInParens(inner)) {
			return { sign: -1, content: inner.slice(1, -1).trim() };
		}
	}

	if (s.startsWith("(") && s.endsWith(")")) {
		if (isFullyEnclosedInParens(s)) {
			return { sign: 1, content: s.slice(1, -1).trim() };
		}
	}

	return { sign: 1, content: s };
}

/**
 * Helper to parse a single parenthesized or unparenthesized signed decimal/integer number.
 * @param {string} str Raw single term string (e.g. "42", "-.5", "- 11", "(-11)", "-(3)")
 * @returns {number} Parsed float or NaN if invalid
 */
function parseSingleNumber(str: string): number {
	const trimmed = str.trim();
	if (trimmed === "") {
		return Number.NaN;
	}

	// Case 1: Unparenthesized signed number e.g. "42", "-7", "- 11", "+ 3.14", ".5", "-.5"
	const simpleMatch = trimmed.match(/^([+-]?)\s*(\d+(?:\.\d*)?|\.\d+)$/);
	if (simpleMatch) {
		const sign = simpleMatch[1] === "-" ? -1 : 1;
		const val = Number.parseFloat(simpleMatch[2]);
		return Number.isNaN(val) ? Number.NaN : sign * val;
	}

	// Case 2: Parenthesized number e.g. "(-11)", "(+3.5)", "(.5)", "-(11)", "+(5)", "(- 11)", "-( -11 )"
	const parenMatch = trimmed.match(
		/^([+-]?)\s*\(\s*([+-]?)\s*(\d+(?:\.\d*)?|\.\d+)\s*\)$/,
	);
	if (parenMatch) {
		const sign1 = parenMatch[1] === "-" ? -1 : 1;
		const sign2 = parenMatch[2] === "-" ? -1 : 1;
		const val = Number.parseFloat(parenMatch[3]);
		return Number.isNaN(val) ? Number.NaN : sign1 * sign2 * val;
	}

	return Number.NaN;
}

/**
 * Parses a student numeric or fractional input string into an exact floating-point number.
 * Supports:
 * - Integers and decimals: "3", "-2.5", ".5", "+4", "- 11"
 * - Standard slash fractions: "-11/3", "5/3", "11 / 3", "+7/2", "- 11 / 3"
 * - Parenthesized numerators/denominators: "(-11)/3", "-(11/3)", "11/(-3)", "5/(-9)", "(-11)/(-3)"
 * - LaTeX fractions: "\frac{5}{3}", "-\frac{11}{3}", "\frac{-11}{3}", "\frac{11}{-3}"
 * - Arbitrary scale fractions: "100/2", "500/200000", "-300/100"
 *
 * @param {string} input Raw student input string
 * @returns {number} Evaluated numerical value, or NaN if input is empty, invalid, or divides by zero
 */
export function parseNumericInput(input: string): number {
	if (!input) {
		return Number.NaN;
	}

	let cleaned = input.trim();
	if (cleaned === "") {
		return Number.NaN;
	}

	// Normalize LaTeX \frac{num}{den} into num / den
	cleaned = cleaned.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, " $1 / $2 ");

	// Normalize outer negative parenthesis e.g. -(11/3) -> outerSign = -1, cleaned = "11/3"
	const { sign: outerSign, content: unwrapped } = stripOuterParens(cleaned);
	cleaned = unwrapped;

	// Check if input contains a division slash
	if (cleaned.includes("/")) {
		const parts = cleaned.split("/");
		if (parts.length !== 2) {
			return Number.NaN;
		}

		const num = parseSingleNumber(parts[0]);
		const den = parseSingleNumber(parts[1]);

		if (Number.isNaN(num) || Number.isNaN(den) || den === 0) {
			return Number.NaN;
		}

		return outerSign * (num / den);
	}

	// Single number (decimal or integer)
	const singleVal = parseSingleNumber(cleaned);
	if (Number.isNaN(singleVal)) {
		return Number.NaN;
	}

	return outerSign * singleVal;
}



