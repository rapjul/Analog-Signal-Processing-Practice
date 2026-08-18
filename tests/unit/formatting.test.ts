import { describe, expect, it } from "vitest";
import {
	formatCoefficientTerm,
	formatExpTerm,
	formatLinearCombination,
	formatOdeLhs,
	formatPolynomial,
	formatQuadraticPolynomial,
	formatRootFactor,
	formatSignedLinearTerm,
	sanitizeLatexMath,
	sanitizeUnitCoefficients,
} from "$lib/math-engine/formatting";

describe("formatCoefficientTerm", () => {
	it("omits unit coefficient 1 for non-empty symbols", () => {
		expect(formatCoefficientTerm(1, "y(t)", false)).toBe("+ y(t)");
		expect(formatCoefficientTerm(1, "y(t)", true)).toBe("y(t)");
		expect(formatCoefficientTerm(1, "\\frac{dy}{dt}", false)).toBe(
			"+ \\frac{dy}{dt}",
		);
		expect(formatCoefficientTerm(1, "\\frac{d^2 y}{dt^2}", true)).toBe(
			"\\frac{d^2 y}{dt^2}",
		);
		expect(formatCoefficientTerm(1, "s", false)).toBe("+ s");
		expect(formatCoefficientTerm(1, "s", true)).toBe("s");
	});

	it("omits unit coefficient -1 for non-empty symbols with correct negative sign", () => {
		expect(formatCoefficientTerm(-1, "y(t)", false)).toBe("- y(t)");
		expect(formatCoefficientTerm(-1, "y(t)", true)).toBe("-y(t)");
		expect(formatCoefficientTerm(-1, "\\frac{dy}{dt}", false)).toBe(
			"- \\frac{dy}{dt}",
		);
		expect(formatCoefficientTerm(-1, "s", false)).toBe("- s");
		expect(formatCoefficientTerm(-1, "s", true)).toBe("-s");
	});

	it("includes numerical coefficient for values not equal to +/- 1", () => {
		expect(formatCoefficientTerm(2, "y(t)", false)).toBe("+ 2 y(t)");
		expect(formatCoefficientTerm(2, "y(t)", true)).toBe("2 y(t)");
		expect(formatCoefficientTerm(-3, "\\frac{dy}{dt}", false)).toBe(
			"- 3 \\frac{dy}{dt}",
		);
		expect(formatCoefficientTerm(-3, "\\frac{dy}{dt}", true)).toBe(
			"-3 \\frac{dy}{dt}",
		);
		expect(formatCoefficientTerm(4, "s", false)).toBe("+ 4 s");
	});

	it("formats pure numerical constants correctly when symbol is empty", () => {
		expect(formatCoefficientTerm(1, "", false)).toBe("+ 1");
		expect(formatCoefficientTerm(1, "", true)).toBe("1");
		expect(formatCoefficientTerm(-1, "", false)).toBe("- 1");
		expect(formatCoefficientTerm(-1, "", true)).toBe("-1");
		expect(formatCoefficientTerm(5, "", false)).toBe("+ 5");
		expect(formatCoefficientTerm(-5, "", false)).toBe("- 5");
		expect(formatCoefficientTerm(0, "", false)).toBe("");
	});

	it("returns empty string when coefficient is 0", () => {
		expect(formatCoefficientTerm(0, "y(t)", false)).toBe("");
		expect(formatCoefficientTerm(0, "s", true)).toBe("");
	});
});

describe("formatPolynomial", () => {
	it("formats arbitrary polynomial terms cleanly", () => {
		expect(
			formatPolynomial([
				{ coeff: 1, symbol: "s^2" },
				{ coeff: 2, symbol: "s" },
				{ coeff: 1, symbol: "" },
			]),
		).toBe("s^2 + 2 s + 1");

		expect(
			formatPolynomial([
				{ coeff: 1, symbol: "s^2" },
				{ coeff: -1, symbol: "s" },
				{ coeff: -1, symbol: "" },
			]),
		).toBe("s^2 - s - 1");

		expect(
			formatPolynomial([
				{ coeff: 2, symbol: "s^2" },
				{ coeff: 0, symbol: "s" },
				{ coeff: -4, symbol: "" },
			]),
		).toBe("2 s^2 - 4");
	});

	it("returns 0 when all terms are 0 or array is empty", () => {
		expect(
			formatPolynomial([
				{ coeff: 0, symbol: "s^2" },
				{ coeff: 0, symbol: "s" },
			]),
		).toBe("0");

		expect(formatPolynomial([])).toBe("0");
	});

	it("formats single-term polynomials correctly", () => {
		expect(formatPolynomial([{ coeff: 3, symbol: "s" }])).toBe("3 s");
		expect(formatPolynomial([{ coeff: 1, symbol: "s" }])).toBe("s");
		expect(formatPolynomial([{ coeff: -1, symbol: "s" }])).toBe("-s");
		expect(formatPolynomial([{ coeff: -5, symbol: "" }])).toBe("-5");
	});

	it("formats fractional and decimal coefficients cleanly", () => {
		expect(
			formatPolynomial([
				{ coeff: 0.5, symbol: "s^2" },
				{ coeff: -1.5, symbol: "s" },
				{ coeff: 0.25, symbol: "" },
			]),
		).toBe("0.5 s^2 - 1.5 s + 0.25");
	});
});

describe("formatQuadraticPolynomial", () => {
	it("defaults to variable x", () => {
		expect(formatQuadraticPolynomial(1, 2, 1)).toBe("x^2 + 2 x + 1 = 0");
		expect(formatQuadraticPolynomial(1, -1, -1)).toBe("x^2 - x - 1 = 0");
	});

	it("formats characteristic equations with custom variable s", () => {
		expect(formatQuadraticPolynomial(1, 2, 1, "s")).toBe(
			"s^2 + 2 s + 1 = 0",
		);
		expect(formatQuadraticPolynomial(1, 1, 1, "s")).toBe("s^2 + s + 1 = 0");
		expect(formatQuadraticPolynomial(1, -1, -1, "s")).toBe(
			"s^2 - s - 1 = 0",
		);
		expect(formatQuadraticPolynomial(1, 4, 13, "s")).toBe(
			"s^2 + 4 s + 13 = 0",
		);
		expect(formatQuadraticPolynomial(1, -6, 9, "s")).toBe(
			"s^2 - 6 s + 9 = 0",
		);
	});
});

describe("formatOdeLhs", () => {
	it("formats ODE left-hand side omitting unit 1 and -1 coefficients", () => {
		expect(formatOdeLhs(1, 2, 1)).toBe(
			"\\frac{d^2 y}{dt^2} + 2 \\frac{dy}{dt} + y(t)",
		);
		expect(formatOdeLhs(1, 1, 1)).toBe(
			"\\frac{d^2 y}{dt^2} + \\frac{dy}{dt} + y(t)",
		);
		expect(formatOdeLhs(1, -1, -1)).toBe(
			"\\frac{d^2 y}{dt^2} - \\frac{dy}{dt} - y(t)",
		);
		expect(formatOdeLhs(1, 3, 2)).toBe(
			"\\frac{d^2 y}{dt^2} + 3 \\frac{dy}{dt} + 2 y(t)",
		);
	});
});

describe("formatRootFactor", () => {
	it("defaults to independent variable x", () => {
		expect(formatRootFactor(-2)).toBe("(x + 2)");
		expect(formatRootFactor(3)).toBe("(x - 3)");
		expect(formatRootFactor(0)).toBe("x");
	});

	it("formats negative roots with custom variable", () => {
		expect(formatRootFactor(-2, "s")).toBe("(s + 2)");
		expect(formatRootFactor(-5, "s")).toBe("(s + 5)");
	});

	it("formats positive roots with custom variable", () => {
		expect(formatRootFactor(3, "s")).toBe("(s - 3)");
		expect(formatRootFactor(1, "s")).toBe("(s - 1)");
	});

	it("formats zero root without parentheses", () => {
		expect(formatRootFactor(0, "s")).toBe("s");
	});
});

describe("sanitizeLatexMath", () => {
	it("replaces adjacent double operators (+ +, + -, - -, - +)", () => {
		expect(sanitizeLatexMath("2e^{-t} + + \\frac{1}{2}\\sin(2t)")).toBe(
			"2e^{-t} + \\frac{1}{2}\\sin(2t)",
		);
		expect(sanitizeLatexMath("C_1 e^{-t} + - 3 e^{-2t}")).toBe(
			"C_1 e^{-t} - 3 e^{-2t}",
		);
		expect(sanitizeLatexMath("e^{-t} - - 4 e^{-2t}")).toBe(
			"e^{-t} + 4 e^{-2t}",
		);
		expect(sanitizeLatexMath("5 - + 2")).toBe("5 - 2");
	});

	it("cleans unit multipliers and leading positive signs inside brackets", () => {
		expect(sanitizeLatexMath("e^{(-1t)}")).toBe("e^{-t}");
		expect(sanitizeLatexMath("e^{(1t)}")).toBe("e^{t}");
		expect(sanitizeLatexMath("[ + 2\\cos(t) - 3\\sin(t)]")).toBe(
			"[2\\cos(t) - 3\\sin(t)]",
		);
	});
});

describe("formatSignedLinearTerm", () => {
	it("formats positive, negative, and zero coefficients correctly", () => {
		expect(formatSignedLinearTerm("2", "e^{-t}", true)).toBe("2 e^{-t}");
		expect(formatSignedLinearTerm("2", "e^{-t}", false)).toBe("+ 2 e^{-t}");
		expect(formatSignedLinearTerm("-3", "e^{-2t}", true)).toBe(
			"-3 e^{-2t}",
		);
		expect(formatSignedLinearTerm("-3", "e^{-2t}", false)).toBe(
			"- 3 e^{-2t}",
		);
		expect(formatSignedLinearTerm("1", "e^{-t}", true)).toBe("e^{-t}");
		expect(formatSignedLinearTerm("1", "e^{-t}", false)).toBe("+ e^{-t}");
		expect(formatSignedLinearTerm("-1", "e^{-t}", true)).toBe("-e^{-t}");
		expect(formatSignedLinearTerm("-1", "e^{-t}", false)).toBe("- e^{-t}");
		expect(formatSignedLinearTerm("0", "e^{-t}", false)).toBe("");
	});
});

describe("formatExpTerm", () => {
	it("formats numerical powers with zero and unit simplification", () => {
		expect(formatExpTerm(0)).toBe("1");
		expect(formatExpTerm(1)).toBe("e^{t}");
		expect(formatExpTerm(-1)).toBe("e^{-t}");
		expect(formatExpTerm(2)).toBe("e^{2t}");
		expect(formatExpTerm(-2)).toBe("e^{-2t}");
		expect(formatExpTerm(-10)).toBe("e^{-10t}");
	});

	it("formats symbolic powers with custom variables and imaginary units", () => {
		expect(formatExpTerm("j1")).toBe("e^{jt}");
		expect(formatExpTerm("-j1")).toBe("e^{-jt}");
		expect(formatExpTerm("-j10")).toBe("e^{-j10t}");
		expect(formatExpTerm("1", "s")).toBe("e^{s}");
		expect(formatExpTerm("-1", "s")).toBe("e^{-s}");
	});
});

describe("formatLinearCombination", () => {
	it("formats numeric combinations with unit reduction and zero handling", () => {
		expect(formatLinearCombination(2, -1)).toBe("2 - t");
		expect(formatLinearCombination(-4, -7)).toBe("-4 - 7t");
		expect(formatLinearCombination(0, 1)).toBe("t");
		expect(formatLinearCombination(0, -1)).toBe("-t");
		expect(formatLinearCombination(0, -2)).toBe("-2t");
		expect(formatLinearCombination(3, 0)).toBe("3");
		expect(formatLinearCombination(0, 0)).toBe("0");
		expect(formatLinearCombination(5, 1)).toBe("5 + t");
	});

	it("formats symbolic constants cleanly", () => {
		expect(formatLinearCombination("C_{1,ZI}", "C_{2,ZI}")).toBe(
			"C_{1,ZI} + C_{2,ZI}t",
		);
		expect(formatLinearCombination("C_{1,ZS}", "-1")).toBe("C_{1,ZS} - t");
	});
});

describe("sanitizeUnitCoefficients", () => {
	it("drops isolated 1 before standalone and linear variables", () => {
		expect(sanitizeUnitCoefficients("1x")).toBe("x");
		expect(sanitizeUnitCoefficients("-1x")).toBe("-x");
		expect(sanitizeUnitCoefficients("1x - 1y = 1r")).toBe("x - y = r");
		expect(sanitizeUnitCoefficients("2 - 1t")).toBe("2 - t");
		expect(sanitizeUnitCoefficients("-4 - 1t")).toBe("-4 - t");
		expect(sanitizeUnitCoefficients("3 + 1t")).toBe("3 + t");
	});

	it("drops isolated 1 before exponential terms and function multipliers", () => {
		expect(sanitizeUnitCoefficients("1e^{-1t}")).toBe("e^{-t}");
		expect(sanitizeUnitCoefficients("-1e^{-1t}")).toBe("-e^{-t}");
		expect(sanitizeUnitCoefficients("1e^{1t}")).toBe("e^{t}");
		expect(sanitizeUnitCoefficients("1\\cos(1t)")).toBe("\\cos(t)");
		expect(sanitizeUnitCoefficients("1\\sin(-1t)")).toBe("\\sin(-t)");
		expect(sanitizeUnitCoefficients("-1\\cos(2t)")).toBe("-\\cos(2t)");
	});

	it("handles Electrical Engineering imaginary unit j notation", () => {
		expect(sanitizeUnitCoefficients("j1")).toBe("j");
		expect(sanitizeUnitCoefficients("-j1")).toBe("-j");
		expect(sanitizeUnitCoefficients("5 + j1")).toBe("5 + j");
		expect(sanitizeUnitCoefficients("5 - j1")).toBe("5 - j");
		expect(sanitizeUnitCoefficients("1j")).toBe("j");
		expect(sanitizeUnitCoefficients("-1j")).toBe("-j");
		expect(sanitizeUnitCoefficients("j1e^{-j1t}")).toBe("je^{-jt}");
		expect(sanitizeUnitCoefficients("1je^{-1jt}")).toBe("je^{-jt}");
		expect(sanitizeUnitCoefficients("\\pm j1")).toBe("\\pm j");
	});

	it("reduces nested double parentheses", () => {
		expect(sanitizeUnitCoefficients("((2 - t)e^{-t} + 6)")).toBe(
			"(2 - t)e^{-t} + 6",
		);
		expect(sanitizeUnitCoefficients("1t + 1e^{-1t}")).toBe("t + e^{-t}");
	});

	it("strictly preserves multi-digit numbers with leading/trailing/embedded 1s", () => {
		expect(sanitizeUnitCoefficients("10x")).toBe("10x");
		expect(sanitizeUnitCoefficients("11x")).toBe("11x");
		expect(sanitizeUnitCoefficients("17t")).toBe("17t");
		expect(sanitizeUnitCoefficients("21t")).toBe("21t");
		expect(sanitizeUnitCoefficients("31x")).toBe("31x");
		expect(sanitizeUnitCoefficients("101x")).toBe("101x");
		expect(sanitizeUnitCoefficients("105t")).toBe("105t");
		expect(sanitizeUnitCoefficients("111x")).toBe("111x");
		expect(sanitizeUnitCoefficients("151t")).toBe("151t");
		expect(sanitizeUnitCoefficients("201t")).toBe("201t");
		expect(sanitizeUnitCoefficients("1111t")).toBe("1111t");
	});

	it("strictly preserves multi-digit numbers with imaginary unit j", () => {
		expect(sanitizeUnitCoefficients("j10")).toBe("j10");
		expect(sanitizeUnitCoefficients("-j10")).toBe("-j10");
		expect(sanitizeUnitCoefficients("10j")).toBe("10j");
		expect(sanitizeUnitCoefficients("-10j")).toBe("-10j");
		expect(sanitizeUnitCoefficients("j11")).toBe("j11");
		expect(sanitizeUnitCoefficients("-j11")).toBe("-j11");
		expect(sanitizeUnitCoefficients("j101")).toBe("j101");
		expect(sanitizeUnitCoefficients("j111")).toBe("j111");
		expect(sanitizeUnitCoefficients("j151")).toBe("j151");
		expect(sanitizeUnitCoefficients("-j151")).toBe("-j151");
		expect(sanitizeUnitCoefficients("-201j")).toBe("-201j");
		expect(sanitizeUnitCoefficients("-j31")).toBe("-j31");
	});

	it("strictly preserves exponents with multi-digit numbers", () => {
		expect(sanitizeUnitCoefficients("e^{-10t}")).toBe("e^{-10t}");
		expect(sanitizeUnitCoefficients("e^{-11t}")).toBe("e^{-11t}");
		expect(sanitizeUnitCoefficients("e^{-101t}")).toBe("e^{-101t}");
		expect(sanitizeUnitCoefficients("e^{-151t}")).toBe("e^{-151t}");
		expect(sanitizeUnitCoefficients("e^{-j10t}")).toBe("e^{-j10t}");
		expect(sanitizeUnitCoefficients("e^{111t}")).toBe("e^{111t}");
	});

	it("strictly preserves decimals starting or ending with 1", () => {
		expect(sanitizeUnitCoefficients("0.1t")).toBe("0.1t");
		expect(sanitizeUnitCoefficients("0.1x")).toBe("0.1x");
		expect(sanitizeUnitCoefficients("1.1t")).toBe("1.1t");
		expect(sanitizeUnitCoefficients("0.01t")).toBe("0.01t");
		expect(sanitizeUnitCoefficients("1.01t")).toBe("1.01t");
		expect(sanitizeUnitCoefficients("10.1t")).toBe("10.1t");
	});

	it("strictly preserves standalone constants and equations", () => {
		expect(sanitizeUnitCoefficients("s + 1 = 0")).toBe("s + 1 = 0");
		expect(sanitizeUnitCoefficients("y(0) = 1")).toBe("y(0) = 1");
		expect(sanitizeUnitCoefficients("5 + 1")).toBe("5 + 1");
		expect(sanitizeUnitCoefficients("\\frac{1}{2}")).toBe("\\frac{1}{2}");
		expect(sanitizeUnitCoefficients("\\frac{1}{10}")).toBe("\\frac{1}{10}");
		expect(sanitizeUnitCoefficients("\\cos(10t)")).toBe("\\cos(10t)");
		expect(sanitizeUnitCoefficients("\\sin(151t)")).toBe("\\sin(151t)");
		expect(sanitizeUnitCoefficients("100")).toBe("100");
	});
});
