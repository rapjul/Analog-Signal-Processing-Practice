import { describe, expect, it } from "vitest";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
} from "../../src/lib/math-engine/odes/index";
import type { WithRandom } from "../../src/lib/math-engine/types";

/**
 * Helper to generate second-order ODE problem for generator tests.
 *
 * @param {WithRandom<SecondOrderRootType>} rootType Target root type configuration
 * @param {WithRandom<ForcingType>} [forcingType="random"] Target forcing function configuration
 * @returns Generated second-order ODE problem
 */
function generateSecondOrderProblem(
	rootType: WithRandom<SecondOrderRootType>,
	forcingType: WithRandom<ForcingType> = "random",
) {
	return generateOdeProblem({
		order: 2,
		rootType,
		forcingType,
		leadingCoefficient: "monic",
		resonance: "none",
	});
}

describe("LCC ODE Problem Generator", () => {
	describe("Generator Configuration & Determinism", () => {
		/**
		 * Verifies deterministic reproducibility across seeds.
		 */
		it("generates identical problems when provided the same seed", () => {
			const p1 = generateOdeProblem({ seed: 12345 });
			const p2 = generateOdeProblem({ seed: 12345 });
			expect(p1.odeLatex).toBe(p2.odeLatex);
			expect(p1.params).toEqual(p2.params);
			expect(p1.forcing).toEqual(p2.forcing);
			expect(p1.itsData).toEqual(p2.itsData);
		});

		/**
		 * Verifies distinct problems when provided different seeds.
		 */
		it("generates different problems when provided different seeds", () => {
			const p1 = generateOdeProblem({ seed: 101 });
			const p2 = generateOdeProblem({ seed: 202 });
			expect(p1.odeLatex).not.toBe(p2.odeLatex);
		});

		/**
		 * Verifies first-order problem structure and leading coefficient handling.
		 */
		it("generates valid first-order ODE problems", () => {
			const problem = generateOdeProblem({
				order: 1,
				rootType: "random",
				forcingType: "constant",
				leadingCoefficient: "non_monic",
				resonance: "none",
				seed: 42,
			});
			expect(problem.params.order).toBe(1);
			expect(problem.params.a2).toBe(0);
			expect(problem.params.a1).toBeGreaterThanOrEqual(2);
			expect(problem.params.rootType).toBe("single_real");
			expect(problem.initialConditions.y0).toBeDefined();
			expect(problem.initialConditions.dy0).toBeUndefined();
		});

		/**
		 * Verifies custom numeric leading coefficients.
		 */
		it("supports custom numeric leading coefficients and validates non-zero finite bounds", () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				forcingType: "constant",
				leadingCoefficient: 5,
				resonance: "none",
				seed: 7,
			});
			expect(problem.params.a2).toBe(5);

			// Invalid leading coefficients
			expect(() =>
				generateOdeProblem({
					leadingCoefficient: 0,
				}),
			).toThrow("leadingCoefficient must be a finite non-zero number");

			expect(() =>
				generateOdeProblem({
					leadingCoefficient: Number.NaN,
				}),
			).toThrow("leadingCoefficient must be a finite non-zero number");

			expect(() =>
				generateOdeProblem({
					leadingCoefficient: Number.POSITIVE_INFINITY,
				}),
			).toThrow("leadingCoefficient must be a finite non-zero number");
		});

		/**
		 * Verifies defensive handling for unhandled root types and forcing types.
		 */
		it("throws an error when an invalid rootType is provided to generator", () => {
			expect(() =>
				generateOdeProblem({
					order: 2,
					rootType: "invalid_type" as unknown as "distinct_real",
				}),
			).toThrow("Unhandled root type: invalid_type");
		});

		/**
		 * Verifies defensive handling for unhandled forcing types in generator.
		 */
		it("throws an error when an invalid forcingType is provided to generator", () => {
			expect(() =>
				generateOdeProblem({
					order: 2,
					forcingType: "unsupported" as unknown as "constant",
				}),
			).toThrow("Unhandled forcing type: unsupported");
		});
	});

	describe("Resonant Problem Generation", () => {
		/**
		 * Verifies simple resonance generation: root matches characteristic root with multiplicity 1.
		 */
		it("generates simple resonant problems with matching exponential decay parameter", () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "distinct_real",
				resonance: "simple",
				seed: 99,
			});
			expect(problem.forcing.type).toBe("exponential");
			if (problem.forcing.type === "exponential") {
				expect(problem.forcing.p).toBe(problem.params.roots.r1);
				expect(problem.solutions.y_p_latex).toContain("t e^{");
			}
		});

		/**
		 * Verifies repeated resonance generation: root matches repeated characteristic root with multiplicity 2.
		 */
		it("generates repeated resonant problems with multiplicity 2 particular solution", () => {
			const problem = generateOdeProblem({
				order: 2,
				rootType: "repeated_real",
				resonance: "repeated",
				seed: 105,
			});
			expect(problem.forcing.type).toBe("exponential");
			if (problem.forcing.type === "exponential") {
				expect(problem.forcing.p).toBe(problem.params.roots.r1);
				expect(problem.solutions.y_p_latex).toContain("t^2 e^{");
			}
		});
	});

	describe("Second-Order Root Types", () => {
		/**
		 * Verifies distinct real root problem structures.
		 */
		it("generates distinct real root problems with valid sub-step data", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			expect(problem.params.rootType).toBe("distinct_real");
			expect(problem.params.roots.r1).toBeLessThan(0);
			expect(problem.params.roots.r2).toBeLessThan(0);
			expect(problem.params.roots.r1).not.toBe(problem.params.roots.r2);
		});

		/**
		 * Verifies repeated real root problem structures.
		 */
		it("generates repeated real root problems with equal roots", () => {
			const problem = generateSecondOrderProblem(
				"repeated_real",
				"constant",
			);
			expect(problem.params.rootType).toBe("repeated_real");
			expect(problem.params.roots.r1).toBe(problem.params.roots.r2);
		});

		/**
		 * Verifies complex conjugate root problem structures with imaginary parts.
		 */
		it("generates complex conjugate root problems with non-zero imaginary part", () => {
			const problem = generateSecondOrderProblem(
				"complex_conjugate",
				"constant",
			);
			expect(problem.params.rootType).toBe("complex_conjugate");
			expect(problem.params.roots.im).toBeGreaterThan(0);
		});

		/**
		 * Verifies order clamping when repeated resonance is requested for first-order or random order.
		 */
		it("clamps repeated resonance on first-order problems to simple resonance", () => {
			const p1 = generateOdeProblem({
				order: 1,
				resonance: "repeated",
				seed: 123,
			});
			expect(p1.params.order).toBe(1);
			expect(p1.forcing.type).toBe("exponential");

			const p2 = generateOdeProblem({
				order: "random",
				resonance: "repeated",
				seed: 456,
			});
			expect(p2.params.order).toBe(2);
			expect(p2.params.rootType).toBe("repeated_real");
		});

		/**
		 * Verifies boolean and alias options for resonance in problem generation.
		 */
		it("handles boolean and alias strings for resonance correctly", () => {
			const resonantProblem = generateOdeProblem({
				order: 2,
				resonance: true,
				seed: 789,
			});
			expect(resonantProblem.forcing.type).toBe("exponential");

			const nonResonantProblem = generateOdeProblem({
				order: 2,
				resonance: "nonresonant",
				forcingType: "constant",
				seed: 789,
			});
			expect(nonResonantProblem.forcing.type).toBe("constant");
		});
	});
});
