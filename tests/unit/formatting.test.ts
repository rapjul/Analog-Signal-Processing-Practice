import { describe, expect, it } from "vitest";
import {
	formatCoefficientTerm,
	formatOdeLhs,
	formatPolynomial,
	formatQuadraticPolynomial,
	formatRootFactor,
	formatSignedLinearTerm,
	sanitizeLatexMath,
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
