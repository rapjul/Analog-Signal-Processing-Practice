import { describe, expect, it } from "vitest";
import { parseNumericInput, toFractionLatex } from "$lib/math-engine/fraction";

describe("toFractionLatex", () => {
	it("formats integers correctly", () => {
		expect(toFractionLatex(0)).toBe("0");
		expect(toFractionLatex(1)).toBe("1");
		expect(toFractionLatex(-5)).toBe("-5");
	});

	it("formats standard repeating fractions correctly", () => {
		expect(toFractionLatex(1 / 3)).toBe("\\frac{1}{3}");
		expect(toFractionLatex(-1 / 3)).toBe("-\\frac{1}{3}");
		expect(toFractionLatex(1 / 6)).toBe("\\frac{1}{6}");
		expect(toFractionLatex(-7 / 6)).toBe("-\\frac{7}{6}");
	});

	it("formats ninths fractions correctly (1/9, 3/9, 10/9)", () => {
		expect(toFractionLatex(1 / 9)).toBe("\\frac{1}{9}");
		expect(toFractionLatex(3 / 9)).toBe("\\frac{1}{3}");
		expect(toFractionLatex(10 / 9)).toBe("\\frac{10}{9}");
		expect(toFractionLatex(-10 / 9)).toBe("-\\frac{10}{9}");
	});

	it("formats decimal fractions like 0.25, 0.75, -1.5", () => {
		expect(toFractionLatex(0.25)).toBe("\\frac{1}{4}");
		expect(toFractionLatex(0.75)).toBe("\\frac{3}{4}");
		expect(toFractionLatex(-1.5)).toBe("-\\frac{3}{2}");
	});
});

describe("parseNumericInput", () => {
	it("parses integers and decimals", () => {
		expect(parseNumericInput("42")).toBe(42);
		expect(parseNumericInput("-7")).toBe(-7);
		expect(parseNumericInput("+15")).toBe(15);
		expect(parseNumericInput("3.14")).toBeCloseTo(3.14);
		expect(parseNumericInput("-0.05")).toBeCloseTo(-0.05);
		expect(parseNumericInput(".5")).toBeCloseTo(0.5);
		expect(parseNumericInput("-.5")).toBeCloseTo(-0.5);
		expect(parseNumericInput("0")).toBe(0);
	});

	it("parses standard slash fractions", () => {
		expect(parseNumericInput("5/3")).toBeCloseTo(5 / 3);
		expect(parseNumericInput("-11/3")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("+7/2")).toBeCloseTo(3.5);
		expect(parseNumericInput(" 11 / 3 ")).toBeCloseTo(11 / 3);
		expect(parseNumericInput("- 11 / 3")).toBeCloseTo(-11 / 3);
	});

	it("parses parenthesized numerators and denominators", () => {
		expect(parseNumericInput("(-11)/3")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("-(11/3)")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("-11/(3)")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("11/(-3)")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("5/(-9)")).toBeCloseTo(-5 / 9);
		expect(parseNumericInput("(-11)/(-3)")).toBeCloseTo(11 / 3);
		expect(parseNumericInput("-(11/(-3))")).toBeCloseTo(11 / 3);
	});

	it("parses unreduced and arbitrary scale fractions", () => {
		expect(parseNumericInput("100/2")).toBe(50);
		expect(parseNumericInput("500/200000")).toBe(0.0025);
		expect(parseNumericInput("-300/100")).toBe(-3);
		expect(parseNumericInput("-22/6")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("10/6")).toBeCloseTo(5 / 3);
	});

	it("parses LaTeX fraction notation", () => {
		expect(parseNumericInput("\\frac{5}{3}")).toBeCloseTo(5 / 3);
		expect(parseNumericInput("-\\frac{11}{3}")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("\\frac{-11}{3}")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("\\frac{11}{-3}")).toBeCloseTo(-11 / 3);
		expect(parseNumericInput("\\frac{-5}{-9}")).toBeCloseTo(5 / 9);
	});

	it("returns NaN for invalid or empty inputs", () => {
		expect(Number.isNaN(parseNumericInput(""))).toBe(true);
		expect(Number.isNaN(parseNumericInput("   "))).toBe(true);
		expect(Number.isNaN(parseNumericInput("abc"))).toBe(true);
		expect(Number.isNaN(parseNumericInput("5/0"))).toBe(true);
		expect(Number.isNaN(parseNumericInput("5/"))).toBe(true);
		expect(Number.isNaN(parseNumericInput("/3"))).toBe(true);
		expect(Number.isNaN(parseNumericInput("--5"))).toBe(true);
		expect(Number.isNaN(parseNumericInput("++5"))).toBe(true);
	});
});
