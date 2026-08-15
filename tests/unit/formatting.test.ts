import {
	formatCoefficientTerm,
	formatOdeLhs,
	formatPolynomial,
	formatQuadraticPolynomial,
} from "$lib/math-engine/formatting";
import { describe, expect, it } from "vitest";

describe("formatCoefficientTerm", () => {
	it("omits unit coefficient 1 for non-empty symbols", () => {
		expect(formatCoefficientTerm(1, "y(t)", false)).toBe("+ y(t)");
		expect(formatCoefficientTerm(1, "y(t)", true)).toBe("y(t)");
		expect(formatCoefficientTerm(1, "\\frac{dy}{dt}", false)).toBe("+ \\frac{dy}{dt}");
		expect(formatCoefficientTerm(1, "\\frac{d^2 y}{dt^2}", true)).toBe("\\frac{d^2 y}{dt^2}");
		expect(formatCoefficientTerm(1, "s", false)).toBe("+ s");
		expect(formatCoefficientTerm(1, "s", true)).toBe("s");
	});

	it("omits unit coefficient -1 for non-empty symbols with correct negative sign", () => {
		expect(formatCoefficientTerm(-1, "y(t)", false)).toBe("- y(t)");
		expect(formatCoefficientTerm(-1, "y(t)", true)).toBe("-y(t)");
		expect(formatCoefficientTerm(-1, "\\frac{dy}{dt}", false)).toBe("- \\frac{dy}{dt}");
		expect(formatCoefficientTerm(-1, "s", false)).toBe("- s");
		expect(formatCoefficientTerm(-1, "s", true)).toBe("-s");
	});

	it("includes numerical coefficient for values not equal to +/- 1", () => {
		expect(formatCoefficientTerm(2, "y(t)", false)).toBe("+ 2 y(t)");
		expect(formatCoefficientTerm(2, "y(t)", true)).toBe("2 y(t)");
		expect(formatCoefficientTerm(-3, "\\frac{dy}{dt}", false)).toBe("- 3 \\frac{dy}{dt}");
		expect(formatCoefficientTerm(-3, "\\frac{dy}{dt}", true)).toBe("-3 \\frac{dy}{dt}");
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

	it("returns 0 when all terms are 0", () => {
		expect(
			formatPolynomial([
				{ coeff: 0, symbol: "s^2" },
				{ coeff: 0, symbol: "s" },
			]),
		).toBe("0");
	});
});

describe("formatQuadraticPolynomial", () => {
	it("defaults to variable x", () => {
		expect(formatQuadraticPolynomial(1, 2, 1)).toBe("x^2 + 2 x + 1 = 0");
		expect(formatQuadraticPolynomial(1, -1, -1)).toBe("x^2 - x - 1 = 0");
	});

	it("formats characteristic equations with custom variable s", () => {
		expect(formatQuadraticPolynomial(1, 2, 1, "s")).toBe("s^2 + 2 s + 1 = 0");
		expect(formatQuadraticPolynomial(1, 1, 1, "s")).toBe("s^2 + s + 1 = 0");
		expect(formatQuadraticPolynomial(1, -1, -1, "s")).toBe("s^2 - s - 1 = 0");
		expect(formatQuadraticPolynomial(1, 4, 13, "s")).toBe("s^2 + 4 s + 13 = 0");
		expect(formatQuadraticPolynomial(1, -6, 9, "s")).toBe("s^2 - 6 s + 9 = 0");
	});
});

describe("formatOdeLhs", () => {
	it("formats ODE left-hand side omitting unit 1 and -1 coefficients", () => {
		expect(formatOdeLhs(1, 2, 1)).toBe("\\frac{d^2 y}{dt^2} + 2 \\frac{dy}{dt} + y(t)");
		expect(formatOdeLhs(1, 1, 1)).toBe("\\frac{d^2 y}{dt^2} + \\frac{dy}{dt} + y(t)");
		expect(formatOdeLhs(1, -1, -1)).toBe("\\frac{d^2 y}{dt^2} - \\frac{dy}{dt} - y(t)");
		expect(formatOdeLhs(1, 3, 2)).toBe("\\frac{d^2 y}{dt^2} + 3 \\frac{dy}{dt} + 2 y(t)");
	});
});
