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
