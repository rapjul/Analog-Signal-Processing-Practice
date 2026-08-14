import { toFractionLatex } from "$lib/math-engine/fraction";
import { describe, expect, it } from "vitest";

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
