import {
	evaluateLatexAt,
	evaluatePiecewiseLatexAt,
	validateConvolutionResponse,
	validateLatexAnswer,
} from "$lib/math-engine/evaluator";
import { describe, expect, it } from "vitest";

describe("Math Engine Evaluator", () => {
	describe("evaluateLatexAt", () => {
		it("evaluates basic algebraic expressions at point t", () => {
			const val = evaluateLatexAt("2t + 5", 3);
			expect(val).toBe(11);
		});

		it("evaluates exponential and trigonometric expressions", () => {
			const val = evaluateLatexAt("e^{-2t} + \\cos(3t)", 0);
			expect(val).toBeCloseTo(2, 5);
		});
	});

	describe("evaluatePiecewiseLatexAt", () => {
		it("evaluates piecewise interval expressions accurately across different domains", () => {
			const piecewise = "\\begin{cases} 0, & t < 0 \\\\ t, & 0 \\le t < 1 \\\\ 2 - t, & 1 \\le t \\le 2 \\\\ 0, & t \\ge 2 \\end{cases}";
			expect(evaluatePiecewiseLatexAt(piecewise, -1)).toBe(0);
			expect(evaluatePiecewiseLatexAt(piecewise, 0.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 1.5)).toBe(0.5);
			expect(evaluatePiecewiseLatexAt(piecewise, 3)).toBe(0);
		});
	});

	describe("validateLatexAnswer", () => {
		it("validates a matching LaTeX answer against reference function", () => {
			const refEval = (t: number): number => 2 * Math.exp(-t) + Math.sin(t);
			const result = validateLatexAnswer("2e^{-t} + \\sin(t)", refEval);
			expect(result.isCorrect).toBe(true);
			expect(result.score).toBe(100);
		});

		it("rejects an incorrect LaTeX answer", () => {
			const refEval = (t: number): number => 2 * Math.exp(-t);
			const result = validateLatexAnswer("5t + 10", refEval);
			expect(result.isCorrect).toBe(false);
			expect(result.score).toBe(0);
		});
	});

	describe("validateConvolutionResponse", () => {
		it("validates a matching piecewise convolution solution", () => {
			const piecewise = "\\begin{cases} 0, & t < 0 \\\\ t, & 0 \\le t < 1 \\\\ 2 - t, & 1 \\le t \\le 2 \\\\ 0, & t \\ge 2 \\end{cases}";
			const refEval = (t: number): number => {
				if (t < 0) return 0;
				if (t < 1) return t;
				if (t <= 2) return 2 - t;
				return 0;
			};
			const isAccurate = validateConvolutionResponse(piecewise, refEval, [-2, 4]);
			expect(isAccurate).toBe(true);
		});

		it("rejects an incorrect convolution expression", () => {
			const refEval = (t: number): number => (t >= 0 && t <= 2 ? 1 : 0);
			const isAccurate = validateConvolutionResponse("5t + 2", refEval, [-2, 4]);
			expect(isAccurate).toBe(false);
		});
	});
});
