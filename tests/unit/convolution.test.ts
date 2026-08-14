/**
 * Unit Test Suite for Continuous-Time Convolution Math Engine (TDD Phase 1 - RED).
 * Tests analytical piecewise convolution solvers, numerical integration, and problem generator.
 */

import {
	evalExpDecay,
	evalRect,
	evalTri,
	generateConvolutionProblem,
	solveExpExpConvolution,
	solveMultiRectConvolution,
	solveRectExpConvolution,
	solveRectRectConvolution,
	solveShiftedRectConvolution,
} from "$lib/math-engine/convolution";
import { describe, expect, it } from "vitest";

describe("Continuous-Time Convolution Math Engine", () => {
	describe("Primitive Signal Evaluators", () => {
		it("evaluates rectangular pulse rect(t / T) correctly", () => {
			// rect of width 2 centered at t = 1 (active in [0, 2])
			expect(evalRect(-0.5, 0, 2, 3)).toBe(0);
			expect(evalRect(0.5, 0, 2, 3)).toBe(3);
			expect(evalRect(1.5, 0, 2, 3)).toBe(3);
			expect(evalRect(2.5, 0, 2, 3)).toBe(0);
		});

		it("evaluates causal exponential decay K * exp(-a * t) * u(t) correctly", () => {
			expect(evalExpDecay(-1, 2, 5)).toBe(0);
			expect(evalExpDecay(0, 2, 5)).toBe(5);
			expect(evalExpDecay(1, 2, 5)).toBeCloseTo(5 * Math.exp(-2), 4);
		});

		it("evaluates symmetric triangular pulse correctly", () => {
			// tri centered at 0, width 4 (span [-2, 2]), peak 2
			expect(evalTri(-3, 0, 4, 2)).toBe(0);
			expect(evalTri(0, 0, 4, 2)).toBe(2);
			expect(evalTri(1, 0, 4, 2)).toBe(1);
			expect(evalTri(3, 0, 4, 2)).toBe(0);
		});
	});

	describe("Analytical Piecewise Convolution Solvers", () => {
		it("solves Rect(0,2) * Rect(0,2) convolution (Identical Width Rects)", () => {
			// x(t) = rect in [0, 2] with height 1
			// h(t) = rect in [0, 2] with height 1
			// y(t) = x * h is a triangle in [0, 4] peaking at t = 2 with max area 2
			const result = solveRectRectConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ tStart: 0, width: 2, height: 1 }
			);

			expect(result.eval(-1)).toBe(0);
			expect(result.eval(0)).toBe(0);
			expect(result.eval(1)).toBe(1); // half area
			expect(result.eval(2)).toBe(2); // max overlap area
			expect(result.eval(3)).toBe(1); // receding area
			expect(result.eval(4)).toBe(0);
			expect(result.intervals.length).toBeGreaterThanOrEqual(3);
		});

		it("solves Rect(0,1) * Rect(0,3) convolution (Unequal Width Rects)", () => {
			// x(t) = rect in [0, 1], h(t) = rect in [0, 3]
			// y(t) increases 0->1 in [0, 1], plateaus at 1 in [1, 3], decreases 1->0 in [3, 4]
			const result = solveRectRectConvolution(
				{ tStart: 0, width: 1, height: 1 },
				{ tStart: 0, width: 3, height: 1 }
			);

			expect(result.eval(0.5)).toBe(0.5);
			expect(result.eval(2.0)).toBe(1.0);
			expect(result.eval(3.5)).toBe(0.5);
			expect(result.eval(4.5)).toBe(0);
		});

		it("solves Shifted Rect Pulse convolution (Trapezoid Response)", () => {
			// x(t) in [0, 2], h(t) in [1, 4]
			const result = solveShiftedRectConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ tStart: 1, width: 3, height: 1 },
			);

			expect(result.pairType).toBe("rect_shifted_rect");
			expect(result.eval(0.5)).toBe(0);
			expect(result.eval(2.0)).toBe(1.0); // growing
			expect(result.eval(3.5)).toBe(2.0); // plateau
			expect(result.eval(5.0)).toBe(1.0); // receding
			expect(result.eval(6.5)).toBe(0);
		});

		it("solves Multi-Rect Pulse Array convolution", () => {
			const result = solveMultiRectConvolution();
			expect(result.pairType).toBe("multi_rect");
			expect(result.eval(0.5)).toBe(0.5);
			expect(result.eval(1.5)).toBe(1.0);
			expect(result.eval(3.5)).toBe(0.5);
			expect(result.eval(4.5)).toBe(1.0);
		});

		it("solves Rect(0,2) * Exponential(a=1) convolution", () => {
			// x(t) = rect in [0, 2] with height 1
			// h(t) = e^{-t} u(t)
			// For t in [0, 2]: integral_0^t e^{-tau} dtau = 1 - e^{-t}
			// For t > 2: integral_{t-2}^t e^{-tau} dtau = e^{-(t-2)} - e^{-t}
			const result = solveRectExpConvolution(
				{ tStart: 0, width: 2, height: 1 },
				{ a: 1, K: 1 }
			);

			expect(result.eval(-0.5)).toBe(0);
			expect(result.eval(1.0)).toBeCloseTo(1 - Math.exp(-1), 4);
			expect(result.eval(3.0)).toBeCloseTo(Math.exp(-1) - Math.exp(-3), 4);
			expect(result.evalX).toBeDefined();
			expect(result.evalH).toBeDefined();
			expect(result.evalH(1)).toBeCloseTo(Math.exp(-1), 4);
		});

		it("solves Exponential(a=1) * Exponential(b=2) convolution", () => {
			// x(t) = e^{-t} u(t), h(t) = e^{-2t} u(t)
			// y(t) = (e^{-t} - e^{-2t}) u(t)
			const result = solveExpExpConvolution(
				{ a: 1, K: 1 },
				{ a: 2, K: 1 }
			);

			expect(result.eval(-1)).toBe(0);
			expect(result.eval(0)).toBe(0);
			expect(result.eval(1)).toBeCloseTo(Math.exp(-1) - Math.exp(-2), 4);
			expect(result.eval(2)).toBeCloseTo(Math.exp(-2) - Math.exp(-4), 4);
		});
	});

	describe("Problem Generator", () => {
		it("generates a valid convolution problem for rect_rect pair", () => {
			const problem = generateConvolutionProblem("rect_rect");
			expect(problem.pairType).toBe("rect_rect");
			expect(problem.title).toBeDefined();
			expect(problem.xLatex).toBeDefined();
			expect(problem.hLatex).toBeDefined();
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.eval(2)).toBeGreaterThanOrEqual(0);
			expect(problem.evalX).toBeDefined();
			expect(problem.evalH).toBeDefined();
		});

		it("generates a valid convolution problem for rect_shifted_rect pair", () => {
			const problem = generateConvolutionProblem("rect_shifted_rect");
			expect(problem.pairType).toBe("rect_shifted_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for multi_rect pair", () => {
			const problem = generateConvolutionProblem("multi_rect");
			expect(problem.pairType).toBe("multi_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for rect_exp pair", () => {
			const problem = generateConvolutionProblem("rect_exp");
			expect(problem.pairType).toBe("rect_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.evalH(0)).toBe(1);
			expect(problem.evalH(1)).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for exp_exp pair", () => {
			const problem = generateConvolutionProblem("exp_exp");
			expect(problem.pairType).toBe("exp_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for step_exp pair", () => {
			const problem = generateConvolutionProblem("step_exp");
			expect(problem.pairType).toBe("step_exp");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
			expect(problem.eval(0)).toBe(0);
			expect(problem.eval(2)).toBeGreaterThan(0);
		});

		it("generates a valid convolution problem for step_rect pair", () => {
			const problem = generateConvolutionProblem("step_rect");
			expect(problem.pairType).toBe("step_rect");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});
	});
});

