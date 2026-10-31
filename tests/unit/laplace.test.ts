import { describe, expect, it } from "vitest";
import {
	determineStability,
	evaluatePfdResidues,
	generateLaplaceProblem,
} from "$lib/math-engine/laplace/index";

describe("Laplace Transform Math Engine (laplace.ts)", () => {
	describe("Partial Fraction Decomposition (PFD) Residue Solver", () => {
		/** Distinct finite roots are required for cover-up division. */
		it("rejects duplicate and nonfinite cover-up inputs", () => {
			for (const poles of [
				[-1, -1],
				[-1, Infinity],
			])
				expect(() => evaluatePfdResidues([1, 1], poles)).toThrow();
			expect(() => evaluatePfdResidues([NaN, 1], [-1, -2])).toThrow();
		});
		it("should solve residues for distinct real poles: (s + 7) / ((s + 2)(s + 3))", () => {
			// X(s) = (s + 7) / ((s + 2)(s + 3)) = A / (s + 2) + B / (s + 3)
			// A = (-2 + 7)/(-2 + 3) = 5
			// B = (-3 + 7)/(-3 + 2) = -4
			const pfd = evaluatePfdResidues([1, 7], [-2, -3]);
			expect(pfd.poles).toEqual([-2, -3]);
			expect(pfd.residues[0]).toBeCloseTo(5);
			expect(pfd.residues[1]).toBeCloseTo(-4);
		});
	});

	describe("ROC & BIBO / Asymptotic Stability Analysis", () => {
		it("should identify causal system as BIBO stable if all poles are in LHP", () => {
			const stability = determineStability([-2, -3], "right-sided");
			expect(stability.isBiboStable).toBe(true);
			expect(stability.rocLatex).toBe("\\operatorname{Re}(s) > -2");
		});

		it("should identify causal system as unstable if any pole is in RHP", () => {
			const stability = determineStability([1, -3], "right-sided");
			expect(stability.isBiboStable).toBe(false);
		});
	});

	describe("Laplace Practice Problem Generator", () => {
		it("should generate valid PFD inverse Laplace practice problem", () => {
			const problem = generateLaplaceProblem("inverse_pfd");
			expect(problem.id).toBeDefined();
			expect(problem.problemType).toBe("inverse_pfd");
			expect(problem.promptLatex).toContain("X(s)");
			expect(problem.solutionSteps.length).toBeGreaterThanOrEqual(3);
		});

		it("should generate valid direct inverse Laplace practice problem", () => {
			const problem = generateLaplaceProblem("inverse_direct");
			expect(problem.id).toBeDefined();
			expect(problem.problemType).toBe("inverse_direct");
			expect(problem.solutionSteps.length).toBeGreaterThanOrEqual(2);
		});

		it("should generate valid forward Laplace transform practice problem", () => {
			const problem = generateLaplaceProblem("forward");
			expect(problem.id).toBeDefined();
			expect(problem.promptLatex).toContain("x(t)");
			expect(problem.referenceAnswerLatex).toContain("s");
			expect(problem.solutionSteps.length).toBeGreaterThanOrEqual(2);
		});

		it("should generate valid ROC and stability practice problem", () => {
			const problem = generateLaplaceProblem("roc_stability");
			expect(problem.id).toBeDefined();
			expect(problem.promptLatex).toContain("ROC");
			expect(problem.solutionSteps.length).toBeGreaterThanOrEqual(2);
		});
	});
});
