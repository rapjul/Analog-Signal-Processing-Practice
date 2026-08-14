import {
	evaluateLatexAt,
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
});
