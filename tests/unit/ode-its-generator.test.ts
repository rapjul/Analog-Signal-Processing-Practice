import { describe, expect, it } from "vitest";
import {
	type ForcingType,
	generateOdeProblem,
	type SecondOrderRootType,
	type WithRandom,
} from "../../src/lib/math-engine/odes/index";

/**
 * Helper to generate second-order ODE problem for ITS generator tests.
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

describe("Linear ODE ITS Step Generator Engine", () => {
	/**
	 * Verifies 7-step ITS scaffolding data generation for distinct real roots with constant forcing.
	 */
	it("generates valid 7-step ITS data for distinct real roots with constant forcing", () => {
		const problem = generateSecondOrderProblem("distinct_real", "constant");

		expect(problem.title).toBe("Practice Problem: 2nd-Order LCC ODE");
		expect(problem.itsData).toBeDefined();

		// Step 1: Characteristic Equation
		expect(problem.itsData.step1.expectedA2).toBe(1);
		expect(problem.itsData.step1.expectedA1).toBe(problem.params.a1);
		expect(problem.itsData.step1.expectedA0).toBe(problem.params.a0);
		expect(problem.itsData.step1.hints.length).toBe(3);

		// Step 2: Characteristic Roots
		expect(problem.itsData.step2.rootType).toBe("distinct_real");
		expect(problem.itsData.step2.hints.length).toBe(3);

		// Step 3: Homogeneous Form
		expect(problem.itsData.step3.correctTemplate).toBe("distinct_real");
		expect(
			problem.itsData.step3.misconceptions.repeated_real,
		).toBeDefined();

		// Step 4: Particular Solution Ansatz
		expect(problem.itsData.step4.options.length).toBe(4);
		const correctAnsatz = problem.itsData.step4.options.find(
			(o) => o.isCorrect,
		);
		expect(correctAnsatz).toBeDefined();
		expect(correctAnsatz?.latex).toContain("K_p");

		// Step 5: Particular Coefficients
		expect(problem.itsData.step5.expectedKp).toBeDefined();

		// Step 6: Initial Conditions
		expect(problem.itsData.step6.expectedC1).toBeDefined();
		expect(problem.itsData.step6.expectedC2).toBeDefined();

		// Step 7: Dual Response Decomposition & Conceptual Mastery
		expect(problem.itsData.step7.expectedZI).toBeDefined();
		expect(problem.itsData.step7.expectedZS).toBeDefined();
		expect(problem.itsData.step7.ziConstants.C1).toBeDefined();
		expect(problem.itsData.step7.ziConstants.C2).toBeDefined();
		expect(problem.itsData.step7.zsConstants.C1).toBeDefined();
		expect(problem.itsData.step7.zsConstants.C2).toBeDefined();
		expect(problem.itsData.step7.y_tr_latex).toBeDefined();
		expect(problem.itsData.step7.y_ss_latex).toBeDefined();
		expect(
			problem.itsData.step7.transientOptions.length,
		).toBeGreaterThanOrEqual(2);
		expect(
			problem.itsData.step7.steadyStateOptions.length,
		).toBeGreaterThanOrEqual(2);
		expect(problem.itsData.step7.conceptQuestion).toBeDefined();
		expect(
			problem.itsData.step7.conceptQuestion.options.some(
				(o) => o.isCorrect,
			),
		).toBe(true);
		expect(
			problem.itsData.step7.conceptQuestion.explanation.length,
		).toBeGreaterThan(10);
	});

	/**
	 * Verifies 7-step ITS scaffolding data generation for complex conjugate roots with sinusoidal forcing.
	 */
	it("generates valid 7-step ITS data for complex conjugate roots with sinusoidal forcing", () => {
		const problem = generateSecondOrderProblem(
			"complex_conjugate",
			"sinusoid",
		);

		// Step 1
		expect(problem.itsData.step1.expectedA2).toBe(1);
		expect(problem.itsData.step1.expectedA1).toBe(problem.params.a1);

		// Step 2
		expect(problem.itsData.step2.rootType).toBe("complex_conjugate");
		expect(problem.itsData.step2.im).toBeGreaterThan(0);

		// Step 3
		expect(problem.itsData.step3.correctTemplate).toBe("complex_conjugate");

		// Step 4
		const correctAnsatz = problem.itsData.step4.options.find(
			(o) => o.isCorrect,
		);
		expect(correctAnsatz?.latex).toContain("\\cos");
		expect(correctAnsatz?.latex).toContain("\\sin");

		// Step 5
		expect(problem.itsData.step5.expectedA).toBeDefined();
		expect(problem.itsData.step5.expectedB).toBeDefined();

		// Step 7
		expect(problem.itsData.step7.ziConstants).toBeDefined();
		expect(problem.itsData.step7.zsConstants).toBeDefined();
		expect(problem.itsData.step7.ziSystemLatex).toContain("C_{1,ZI}");
		expect(
			problem.itsData.step7.conceptQuestion.options.length,
		).toBeGreaterThanOrEqual(2);
	});

	/**
	 * Verifies 7-step ITS scaffolding data generation for repeated real roots.
	 */
	it("generates valid 7-step ITS data for repeated real roots", () => {
		const problem = generateSecondOrderProblem(
			"repeated_real",
			"exponential",
		);

		expect(problem.itsData.step2.rootType).toBe("repeated_real");
		expect(problem.itsData.step3.correctTemplate).toBe("repeated_real");
		expect(problem.itsData.step7.ziSystemLatex).toContain("C_{2,ZI}");
	});

	/**
	 * Verifies 7-step ITS scaffolding data generation for first-order ODEs.
	 */
	it("generates valid ITS scaffolding data for first-order ODEs", () => {
		const problem = generateOdeProblem({
			order: 1,
			rootType: "random",
			forcingType: "constant",
			seed: 555,
		});

		expect(problem.itsData.step1.expectedA2).toBe(0);
		expect(problem.itsData.step1.expectedA1).toBe(problem.params.a1);
		expect(problem.itsData.step2.rootType).toBe("single_real");
		expect(problem.itsData.step3.correctTemplate).toBe("single_real");
		expect(problem.itsData.step6.expectedC1).toBeDefined();
		expect(problem.itsData.step7.ziConstants.C1).toBeDefined();
	});
});
