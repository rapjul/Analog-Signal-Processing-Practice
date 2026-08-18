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
 * Formats an exponential term e^(power * varName) with automatic unit and zero simplification.
 *
 * @param {number | string} power The exponent coefficient or symbolic factor
 * @param {string} [varName="t"] The independent variable name (defaults to "t")
 * @returns {string} Clean LaTeX exponential term string
 *
 * Examples:
 * - formatExpTerm(0) -> "1"
 * - formatExpTerm(1) -> "e^{t}"
 * - formatExpTerm(-1) -> "e^{-t}"
 * - formatExpTerm(-2) -> "e^{-2t}"
 * - formatExpTerm("-j1") -> "e^{-jt}"
 * - formatExpTerm("-j10") -> "e^{-j10t}"
 */
export function formatExpTerm(power: number | string, varName = "t"): string {
	const pStr = String(power).trim();
	if (pStr === "0") return "1";

	const num = typeof power === "number" ? power : parseFloat(pStr);
	if (!Number.isNaN(num)) {
		if (num === 0) return "1";
		if (num === 1) return `e^{${varName}}`;
		if (num === -1) return `e^{-${varName}}`;
		return `e^{${pStr}${varName}}`;
	}

	// Symbolic string power handling
	if (pStr === "1") return `e^{${varName}}`;
	if (pStr === "-1") return `e^{-${varName}}`;
	if (pStr === "j1" || pStr === "1j") return `e^{j${varName}}`;
	if (pStr === "-j1" || pStr === "-1j") return `e^{-j${varName}}`;

	return sanitizeUnitCoefficients(`e^{${pStr}${varName}}`);
}

/**
 * Formats a linear combination (c1 + c2 * varName) with automatic unit reduction and zero elimination.
 *
 * @param {string | number} c1 Constant term or symbolic expression
 * @param {string | number} c2 Coefficient of the variable term or symbolic expression
 * @param {string} [varName="t"] The independent variable name (defaults to "t")
 * @returns {string} Clean LaTeX linear combination string
 *
 * Examples:
 * - formatLinearCombination(2, -1) -> "2 - t"
 * - formatLinearCombination(0, 1) -> "t"
 * - formatLinearCombination(0, -1) -> "-t"
 * - formatLinearCombination(0, -2) -> "-2t"
 * - formatLinearCombination(3, 0) -> "3"
 * - formatLinearCombination("C_{1,ZI}", "C_{2,ZI}") -> "C_{1,ZI} + C_{2,ZI}t"
 */
export function formatLinearCombination(
	c1: string | number,
	c2: string | number,
	varName = "t",
): string {
	const c1Str = String(c1).trim();
	const c2Str = String(c2).trim();

	const n1 = typeof c1 === "number" ? c1 : parseFloat(c1Str);
	const n2 = typeof c2 === "number" ? c2 : parseFloat(c2Str);

	const isN1 = !Number.isNaN(n1) && String(n1) === c1Str;
	const isN2 = !Number.isNaN(n2) && String(n2) === c2Str;

	if (isN1 && isN2) {
		if (Math.abs(n1) < 1e-9 && Math.abs(n2) < 1e-9) return "0";
		if (Math.abs(n1) < 1e-9) {
			if (n2 === 1) return varName;
			if (n2 === -1) return `-${varName}`;
			return `${c2Str}${varName}`;
		}
		if (Math.abs(n2) < 1e-9) return c1Str;

		let term2 = "";
		if (n2 === 1) term2 = `+ ${varName}`;
		else if (n2 === -1) term2 = `- ${varName}`;
		else if (n2 > 0) term2 = `+ ${c2Str}${varName}`;
		else
			term2 = `- ${c2Str.startsWith("-") ? c2Str.slice(1).trim() : Math.abs(n2)}${varName}`;

		return `${c1Str} ${term2}`;
	}

	// Symbolic representations
	if (c1Str === "0") {
		if (c2Str === "1") return varName;
		if (c2Str === "-1") return `-${varName}`;
		return `${c2Str}${varName}`;
	}

	if (c2Str === "0") return c1Str;

	let secondTerm = "";
	if (c2Str === "1") {
		secondTerm = `+ ${varName}`;
	} else if (c2Str === "-1") {
		secondTerm = `- ${varName}`;
	} else if (c2Str.startsWith("-")) {
		const absC2 = c2Str.slice(1).trim();
		secondTerm = absC2 === "1" ? `- ${varName}` : `- ${absC2}${varName}`;
	} else {
		secondTerm = `+ ${c2Str}${varName}`;
	}

	return `${c1Str} ${secondTerm}`;
}

/**
 * Strips redundant double outer parentheses from expressions like ((...)).
 *
 * @param {string} str Input mathematical expression string
 * @returns {string} Expression without redundant outer parentheses
 */
function stripRedundantWrappingParens(str: string): string {
	let res = str.trim();
	while (res.startsWith("((") && res.endsWith(")")) {
		let depth = 0;
		let canStrip = true;
		for (let i = 0; i < res.length - 1; i++) {
			if (res[i] === "(") depth++;
			else if (res[i] === ")") depth--;
			if (depth === 0) {
				canStrip = false;
				break;
			}
		}
		if (canStrip) {
			res = res.slice(1, -1).trim();
		} else {
			break;
		}
	}
	return res;
}

/**
 * Sanitizes isolated unit coefficients (1 or -1) before variables, imaginary unit j,
 * exponents, and functions while strictly preserving multi-digit numbers, decimals, and constants.
 *
 * @param {string} latex Input raw LaTeX math string
 * @returns {string} Sanitized LaTeX string without spurious unit coefficients
 */
export function sanitizeUnitCoefficients(latex: string): string {
	if (!latex) return "";
	let s = latex;

	// Reduce redundant double parentheses
	s = stripRedundantWrappingParens(s);
	s = s.replace(/\(\(\s*([^()]+)\s*\)\)/g, "($1)");

	// Clean up parens inside exponents: e^{(-t)} -> e^{-t}, e^{(2t)} -> e^{2t}
	s = s.replace(/e\^\{\s*\(([^()]+)\)\s*\}/g, "e^{$1}");

	// EE Imaginary Unit j unit reduction:
	// Isolated j1 -> j, 1j -> j, -j1 -> -j, -1j -> -j, \pm j1 -> \pm j
	// Lookaround ensures we do NOT match multi-digit numbers like j10, j11, -j10, 10j, 31j, 151j, 0.1j
	s = s.replace(/(?<![\d.])j1(?![0-9])/g, "j");
	s = s.replace(/(?<![\d.])1j(?![0-9])/g, "j");
	s = s.replace(/(?<![\d.])\\pm\s*j1(?![0-9])/g, "\\pm j");

	// Standalone and linear variables:
	// 1x -> x, -1x -> -x, + 1t -> + t, - 1t -> - t, (1t -> (t, (-1t -> (-t
	// Lookaround ensures we do NOT match 11x, 101x, 151t, 0.1t, 21t, 10x, 1111t
	s = s.replace(/(?<![\d.])1([a-zA-Z])(?![0-9a-zA-Z])/g, "$1");

	// Exponents with unit numbers:
	// e^{-1t} -> e^{-t}, e^{1t} -> e^{t}, e^{-j1t} -> e^{-jt}
	// Lookahead (?![0-9]) ensures e^{-10t}, e^{-11t}, e^{-101t}, e^{-j10t} remain untouched
	s = s.replace(/e\^\{\s*(-?)1([a-zA-Z])(?![0-9])\s*\}/g, "e^{$1$2}");
	s = s.replace(/e\^\{\s*(-?)j1([a-zA-Z])(?![0-9])\s*\}/g, "e^{$1j$2}");
	s = s.replace(/e\^\{\s*(-?)1j([a-zA-Z])(?![0-9])\s*\}/g, "e^{$1j$2}");

	// Trigonometric and function arguments with unit factor:
	// \cos(1t) -> \cos(t), \sin(1t) -> \sin(t), \cos(-1t) -> \cos(-t)
	// Lookahead (?![0-9]) preserves \cos(10t), \cos(11t), \sin(151t)
	s = s.replace(
		/\\(cos|sin|tan|cot|sec|csc)\(\s*(-?)1([a-zA-Z])(?![0-9])\s*\)/g,
		"\\$1($2$3)",
	);
	s = s.replace(
		/\\(cos|sin|tan|cot|sec|csc)\(\s*(-?)j1([a-zA-Z])(?![0-9])\s*\)/g,
		"\\$1($2j$3)",
	);

	// Unit multiplier before functions: 1\cos -> \cos, -1\cos -> -\cos, 1e^{ -> e^{
	s = s.replace(
		/(?<![\d.])1\\(cos|sin|tan|cot|sec|csc|exp|frac)(?![0-9])/g,
		"\\$1",
	);

	return s;
}

/**
 * Sanitizes and normalizes LaTeX mathematical strings by collapsing redundant signs,
 * stripping extraneous spacing around operators, dropping unit coefficients, and preventing double-sign artifacts.
 *
 * Examples:
 * - sanitizeLatexMath("(-4t)e^{-2t} + + \\frac{1}{2}\\sin(2t)") -> "(-4t)e^{-2t} + \\frac{1}{2}\\sin(2t)"
 * - sanitizeLatexMath("C_1 e^{-2t} + - 4 e^{-3t}") -> "C_1 e^{-2t} - 4 e^{-3t}"
 * - sanitizeLatexMath("3t - - 5") -> "3t + 5"
 * - sanitizeLatexMath("y(t) = + 2e^{-1t}") -> "y(t) = 2e^{-t}"
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

	// Apply unit coefficient and parenthesis reduction
	s = sanitizeUnitCoefficients(s);

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
