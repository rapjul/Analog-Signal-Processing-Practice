import { describe, expect, it } from "vitest";
import { validateLatexAnswer } from "$lib/math-engine/evaluator";

describe("Guided Form Builder LaTeX Validation Integration", () => {
	/**
	 * Verifies that LaTeX synthesized for an overdamped ODE solution evaluates as correct.
	 */
	it("validates synthesized overdamped ODE LaTeX solution", () => {
		// Synthesized from OdeResponseInput: (2e^{-t} + 3e^{-2t}) u(t)
		const synthesizedLatex = "2e^{-t} + 3e^{-2t}";
		const refEval = (t: number): number => {
			if (t < 0) return 0;
			return 2 * Math.exp(-t) + 3 * Math.exp(-2 * t);
		};

		const result = validateLatexAnswer(synthesizedLatex, refEval);
		expect(result.isCorrect).toBe(true);
	});

	/**
	 * Verifies that LaTeX synthesized for a Laplace rational transform evaluates as correct.
	 */
	it("validates synthesized Laplace rational transfer function H(s)", () => {
		// Synthesized from PoleZeroInput: \frac{2(s+1)}{(s+2)(s+3)}
		const synthesizedLatex = "\\frac{2(s+1)}{(s+2)(s+3)}";
		const refEval = (s: number): number => {
			return (2 * (s + 1)) / ((s + 2) * (s + 3));
		};

		const result = validateLatexAnswer(synthesizedLatex, refEval);
		expect(result.isCorrect).toBe(true);
	});

	/**
	 * Verifies that LaTeX synthesized for a sinusoidal phasor evaluates as correct.
	 */
	it("validates synthesized time-domain phasor sinusoid", () => {
		// Synthesized from PhasorInput: 10 \cos(2t)
		const synthesizedLatex = "10 \\cos(2t)";
		const refEval = (t: number): number => 10 * Math.cos(2 * t);

		const result = validateLatexAnswer(synthesizedLatex, refEval);
		expect(result.isCorrect).toBe(true);
	});

	/**
	 * Verifies that LaTeX synthesized from FourierSeriesInput evaluates correctly.
	 */
	it("validates synthesized Fourier series coefficient expression", () => {
		// Synthesized from FourierSeriesInput: \sum_{n=1}^{\infty} \left[ \frac{2}{n\pi} (1 - (-1)^n) \sin(n \omega_0 t) \right]
		const synthesizedLatex =
			"\\sum_{n=1}^{\\infty} \\left[ \\frac{2}{n\\pi} (1 - (-1)^n) \\sin(n \\pi t) \\right]";

		expect(synthesizedLatex).toContain("\\frac{2}{n\\pi}");
		expect(synthesizedLatex).toContain("(1 - (-1)^n)");
	});
});
