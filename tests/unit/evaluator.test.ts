import { describe, expect, it } from "vitest";
import {
	evaluateLatexAt,
	evaluatePiecewiseLatexAt,
	validateConvolutionResponse,
	validateLatexAnswer,
} from "$lib/math-engine/evaluator";

describe("Math Engine Evaluator (evaluator.ts)", () => {
	describe("evaluateLatexAt", () => {
		it("evaluates basic algebraic expressions at point t", () => {
			const val = evaluateLatexAt("2t + 5", 3);
			expect(val).toBe(11);
		});

		it("evaluates exponential and trigonometric expressions", () => {
			const val = evaluateLatexAt("e^{-2t} + \\cos(3t)", 0);
			expect(val).toBeCloseTo(2, 5);
		});

		it("evaluates expressions containing unit step functions u(t)", () => {
			const val = evaluateLatexAt("5 e^{-t} u(t)", 1);
			expect(val).toBeCloseTo(5 * Math.exp(-1), 4);

			const shiftedVal = evaluateLatexAt("3 e^{-2(t-1)} u(t-1)", 2);
			expect(shiftedVal).toBeCloseTo(3 * Math.exp(-2), 4);
		});

		it("evaluates fractions formatted with \\frac", () => {
			const val = evaluateLatexAt("\\frac{3}{4} t + \\frac{1}{2}", 2);
			expect(val).toBeCloseTo(2, 5);
		});

		it("returns 0 gracefully on unparseable / malformed syntax", () => {
			const val = evaluateLatexAt("((( malformed % syntax", 1);
			expect(val).toBe(0);
		});
	});

	describe("evaluatePiecewiseLatexAt", () => {
		it("evaluates piecewise interval expressions with & separators", () => {
			const piecewise =
				"\\begin{cases} 0, & t < 0 \\\\ t, & 0 \\le t < 1 \\\\ 2 - t, & 1 \\le t \\le 2 \\\\ 0, & t \\ge 2 \\end{cases}";
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 0.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 1.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 3)).toBe(0);
		});

		it("evaluates piecewise interval expressions with \\text{for} syntax", () => {
			const piecewise =
				"\\begin{cases} 0 \\quad \\text{for} \\quad t < 0 \\\\ 3t \\quad \\text{for} \\quad 0 \\le t < 2 \\\\ 6 \\quad \\text{for} \\quad t \\ge 2 \\end{cases}";
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 1)).toBe(3);
			expect(evaluatePiecewiseLatexAt(piecewise, 4)).toBe(6);
		});

		it("falls back to single-expression evaluation if cases environment is absent", () => {
			const singleExpr = "2t + 4";
			expect(evaluatePiecewiseLatexAt(singleExpr, 3)).toBe(10);
		});
	});

	describe("validateLatexAnswer", () => {
		it("validates a matching LaTeX answer against reference function", () => {
			const refEval = (t: number): number =>
				2 * Math.exp(-t) + Math.sin(t);
			const result = validateLatexAnswer("2e^{-t} + \\sin(t)", refEval);
			expect(result.isCorrect).toBe(true);
			expect(result.score).toBe(100);
			expect(result.message).toContain("Correct");
		});

		it("rejects an incorrect LaTeX answer", () => {
			const refEval = (t: number): number => 2 * Math.exp(-t);
			const result = validateLatexAnswer("5t + 10", refEval);
			expect(result.isCorrect).toBe(false);
			expect(result.score).toBe(0);
			expect(result.message).toContain("Incorrect");
		});

		it("rejects empty or whitespace-only student submissions with prompt message", () => {
			const refEval = (t: number): number => 2 * t;
			const emptyRes = validateLatexAnswer("", refEval);
			expect(emptyRes.isCorrect).toBe(false);
			expect(emptyRes.score).toBe(0);
			expect(emptyRes.message).toBe(
				"Please enter an answer before submitting.",
			);

			const spaceRes = validateLatexAnswer("   ", refEval);
			expect(spaceRes.isCorrect).toBe(false);
			expect(spaceRes.score).toBe(0);
			expect(spaceRes.message).toBe(
				"Please enter an answer before submitting.",
			);
		});
	});

	describe("validateConvolutionResponse", () => {
		it("validates a matching piecewise convolution solution", () => {
			const piecewise =
				"\\begin{cases} 0, & t < 0 \\\\ t, & 0 \\le t < 1 \\\\ 2 - t, & 1 \\le t \\le 2 \\\\ 0, & t \\ge 2 \\end{cases}";
			const refEval = (t: number): number => {
				if (t < 0) return 0;
				if (t < 1) return t;
				if (t <= 2) return 2 - t;
				return 0;
			};
			const isAccurate = validateConvolutionResponse(
				piecewise,
				refEval,
				[-2, 4],
			);
			expect(isAccurate).toBe(true);
		});

		it("rejects an incorrect convolution expression", () => {
			const refEval = (t: number): number => (t >= 0 && t <= 2 ? 1 : 0);
			const isAccurate = validateConvolutionResponse(
				"5t + 2",
				refEval,
				[-2, 4],
			);
			expect(isAccurate).toBe(false);
		});

		it("returns false for empty or whitespace-only convolution response", () => {
			const refEval = (t: number): number => (t >= 0 ? 1 : 0);
			expect(validateConvolutionResponse("", refEval)).toBe(false);
			expect(validateConvolutionResponse("   ", refEval)).toBe(false);
		});
	});
});
