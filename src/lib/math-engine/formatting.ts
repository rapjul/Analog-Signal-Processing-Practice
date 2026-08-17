/**
 * Mathematical LaTeX Formatting Utilities.
 * Provides clean formatting for algebraic polynomial terms, differential equations,
 * and signed polynomial expressions by omitting unitary coefficients (1 and -1)
 * and avoiding negative/plus sign formatting anomalies.
 */

/**
 * Formats a single algebraic term with an optional variable or differential operator symbol.
 * Omits unitary coefficients (1 and -1) for non-empty symbols while preserving proper mathematical signs and spacing.
 *
 * Examples:
 * - formatCoefficientTerm(1, "y(t)", false) -> "+ y(t)"
 * - formatCoefficientTerm(-1, "y(t)", false) -> "- y(t)"
 * - formatCoefficientTerm(1, "\\frac{d^2 y}{dt^2}", true) -> "\\frac{d^2 y}{dt^2}"
 * - formatCoefficientTerm(-1, "s", true) -> "-s"
 * - formatCoefficientTerm(2, "s", false) -> "+ 2s"
 * - formatCoefficientTerm(-3, "s", false) -> "- 3s"
 * - formatCoefficientTerm(5, "", false) -> "+ 5"
 * - formatCoefficientTerm(-5, "", false) -> "- 5"
 *
 * @param {number} coeff Numerical coefficient of the term
 * @param {string} [symbol=""] Variable or operator LaTeX string (e.g. "\\frac{dy}{dt}", "y(t)", "s")
 * @param {boolean} [isLeading=false] Whether this term is the first leading term of an expression
 * @returns {string} Formatted LaTeX term string (or empty string if coeff is 0)
 */
export function formatCoefficientTerm(
	coeff: number,
	symbol = "",
	isLeading = false,
): string {
	if (coeff === 0) return "";

	const isUnit = Math.abs(coeff) === 1 && symbol !== "";
	const coeffMagnitude = isUnit ? "" : `${Math.abs(coeff)}`;
	const termBody =
		symbol !== ""
			? coeffMagnitude
				? `${coeffMagnitude} ${symbol}`
				: symbol
			: `${Math.abs(coeff)}`;

	if (isLeading) {
		return coeff < 0 ? `-${termBody}` : termBody;
	}

	return coeff < 0 ? `- ${termBody}` : `+ ${termBody}`;
}

/**
 * Term descriptor interface for arbitrary polynomial expressions.
 */
export interface PolynomialTerm {
	/** Numerical coefficient */
	coeff: number;
	/** Optional variable or operator symbol (e.g. "s^2", "s", "\\frac{dy}{dt}", "") */
	symbol?: string;
}

/**
 * Formats an arbitrary array of polynomial/differential terms into a clean LaTeX expression.
 * Strips zero-coefficient terms and applies leading signs appropriately.
 *
 * @param {PolynomialTerm[]} terms Array of polynomial terms ordered from highest to lowest degree
 * @returns {string} LaTeX formatted polynomial expression
 */
export function formatPolynomial(terms: PolynomialTerm[]): string {
	const nonZeroTerms = terms.filter((t) => t.coeff !== 0);
	if (nonZeroTerms.length === 0) return "0";

	return nonZeroTerms
		.map((t, index) =>
			formatCoefficientTerm(t.coeff, t.symbol ?? "", index === 0),
		)
		.join(" ");
}

/**
 * Formats a 2nd-order quadratic polynomial equation ($a_2 x^2 + a_1 x + a_0 = 0$).
 * Omits unit coefficients (1 and -1) on powers of the independent variable and formats signs cleanly.
 *
 * @param {number} a2 Coefficient of the quadratic term ($x^2$)
 * @param {number} a1 Coefficient of the linear term ($x$)
 * @param {number} a0 Constant coefficient ($a_0$)
 * @param {string} [variable="x"] Independent variable symbol (defaults to "x")
 * @returns {string} LaTeX formatted quadratic equation (e.g. "x^2 + 2x + 1 = 0", "s^2 - s - 1 = 0")
 */
export function formatQuadraticPolynomial(
	a2: number,
	a1: number,
	a0: number,
	variable = "x",
): string {
	const terms: PolynomialTerm[] = [
		{ coeff: a2, symbol: `${variable}^2` },
		{ coeff: a1, symbol: variable },
		{ coeff: a0, symbol: "" },
	];

	const lhs = formatPolynomial(terms);
	return `${lhs} = 0`;
}

/**
 * Formats the left-hand side of a 2nd-order linear constant-coefficient ODE.
 * Omits unit coefficients (1 and -1) for derivative terms and $y(t)$.
 *
 * @param {number} a2 Coefficient of $\\frac{d^2 y}{dt^2}$
 * @param {number} a1 Coefficient of $\\frac{dy}{dt}$
 * @param {number} a0 Coefficient of $y(t)$
 * @returns {string} LaTeX formatted ODE left-hand side (e.g. "\\frac{d^2 y}{dt^2} + 2 \\frac{dy}{dt} + y(t)")
 */
export function formatOdeLhs(a2: number, a1: number, a0: number): string {
	const terms: PolynomialTerm[] = [
		{ coeff: a2, symbol: "\\frac{d^2 y}{dt^2}" },
		{ coeff: a1, symbol: "\\frac{dy}{dt}" },
		{ coeff: a0, symbol: "y(t)" },
	];

	return formatPolynomial(terms);
}

/**
 * Formats a linear root factor term $(x - r)$ with clean signs.
 *
 * Examples:
 * - formatRootFactor(-2) -> "(x + 2)"
 * - formatRootFactor(3) -> "(x - 3)"
 * - formatRootFactor(0) -> "x"
 * - formatRootFactor(-2, "s") -> "(s + 2)"
 *
 * @param {number} root Numerical root value
 * @param {string} [variable="x"] Variable symbol (defaults to "x")
 * @returns {string} Formatted LaTeX factor string
 */
export function formatRootFactor(root: number, variable = "x"): string {
	if (root === 0) return variable;
	if (root < 0) return `(${variable} + ${Math.abs(root)})`;
	return `(${variable} - ${root})`;
}

/**
 * Sanitizes and normalizes LaTeX mathematical strings by collapsing redundant signs,
 * stripping extraneous spacing around operators, and preventing double-sign artifacts.
 *
 * Examples:
 * - sanitizeLatexMath("(-4t)e^{-2t} + + \\frac{1}{2}\\sin(2t)") -> "(-4t)e^{-2t} + \\frac{1}{2}\\sin(2t)"
 * - sanitizeLatexMath("C_1 e^{-2t} + - 4 e^{-3t}") -> "C_1 e^{-2t} - 4 e^{-3t}"
 * - sanitizeLatexMath("3t - - 5") -> "3t + 5"
 * - sanitizeLatexMath("y(t) = + 2e^{-t}") -> "y(t) = 2e^{-t}"
 * - sanitizeLatexMath("(+ 2t)") -> "(2t)"
 *
 * @param {string} latex Input raw or interpolated LaTeX math string
 * @returns {string} Sanitized LaTeX string
 */
export function sanitizeLatexMath(latex: string): string {
	if (!latex) return "";
	let s = latex;

	// Replace double plus: "+ +" -> "+"
	s = s.replace(/\+\s*\+/g, "+");

	// Replace plus-minus: "+ -" -> "-"
	s = s.replace(/\+\s*-/g, "-");

	// Replace minus-minus: "- -" -> "+"
	s = s.replace(/-\s*-/g, "+");

	// Replace minus-plus: "- +" -> "-"
	s = s.replace(/-\s*\+/g, "-");

	// Clean up second pass if any cascaded signs remain
	s = s.replace(/\+\s*\+/g, "+");
	s = s.replace(/\+\s*-/g, "-");

	// Clean up leading "+ " after opening delimiter, parenthesis, bracket, or equals sign
	s = s.replace(/([([{=])\s*\+\s*/g, "$1");
	s = s.replace(/([([{=])\s*-\s*/g, "$1-");
	s = s.replace(/^\s*\+\s*/, "");

	// Clean up unit coefficients inside parens like (-1t) -> (-t) or (+1t) -> (t)
	s = s.replace(/\{\((-?\+?)(?:1)?([a-zA-Z]+)\)\}/g, "{$1$2}");
	s = s.replace(/\(-1([a-zA-Z])/g, "(-$1");
	s = s.replace(/\(\+?1([a-zA-Z])/g, "($1");

	// Standardize spacing around binary operators
	s = s.replace(/([^\s([{=^_-])\s*\+\s*([^\s)\]}])/g, "$1 + $2");
	s = s.replace(/([^\s([{=^_-])\s*-\s*([^\s)\]}])/g, "$1 - $2");

	// Collapse multiple spaces
	s = s.replace(/[ \t]{2,}/g, " ");

	return s.trim();
}

/**
 * Formats a signed linear or functional term with algebraic sign reduction.
 *
 * @param {number | string} coeff Numerical coefficient or fractional string
 * @param {string} term Body term (e.g. "e^{-2t}", "\\cos(2t)")
 * @param {boolean} [isFirst=false] Whether this term is the first leading term
 * @returns {string} Formatted term
 */
export function formatSignedLinearTerm(
	coeff: number | string,
	term: string,
	isFirst = false,
): string {
	const coeffStr = String(coeff).trim();
	if (coeffStr === "0" || coeffStr === "") return "";

	const isNegative = coeffStr.startsWith("-");
	const absCoeffStr = isNegative ? coeffStr.slice(1).trim() : coeffStr;

	const isUnit = absCoeffStr === "1" && term !== "";
	const body = isUnit ? term : `${absCoeffStr} ${term}`.trim();

	if (isFirst) {
		return isNegative ? `-${body}` : body;
	}

	return isNegative ? `- ${body}` : `+ ${body}`;
}
