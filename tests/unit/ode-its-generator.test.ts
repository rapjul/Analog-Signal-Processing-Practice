import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "../../src/lib/math-engine/odes";

describe("Linear ODE ITS Step Generator Engine", () => {
	it("generates valid 7-step ITS data for distinct real roots with constant forcing", () => {
		const problem = generateOdeProblem("distinct_real", "constant");

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
		expect(problem.itsData.step3.misconceptions.repeated_real).toBeDefined();

		// Step 4: Particular Solution Ansatz
		expect(problem.itsData.step4.options.length).toBe(4);
		const correctAnsatz = problem.itsData.step4.options.find((o) => o.isCorrect);
		expect(correctAnsatz).toBeDefined();
		expect(correctAnsatz?.latex).toContain("K_p");

		// Step 5: Particular Coefficients
		expect(problem.itsData.step5.expectedKp).toBeDefined();

		// Step 6: Initial Conditions
		expect(problem.itsData.step6.expectedC1).toBeDefined();
		expect(problem.itsData.step6.expectedC2).toBeDefined();

		// Step 7: Response Decomposition
		expect(problem.itsData.step7.expectedZI).toBeDefined();
		expect(problem.itsData.step7.expectedZS).toBeDefined();
	});

	it("generates valid 7-step ITS data for complex conjugate roots with sinusoidal forcing", () => {
		const problem = generateOdeProblem("complex_conjugate", "sinusoid");

		// Step 1
		expect(problem.itsData.step1.expectedA2).toBe(1);
		expect(problem.itsData.step1.expectedA1).toBe(problem.params.a1);

		// Step 2
		expect(problem.itsData.step2.rootType).toBe("complex_conjugate");
		expect(problem.itsData.step2.im).toBeGreaterThan(0);

		// Step 3
		expect(problem.itsData.step3.correctTemplate).toBe("complex_conjugate");

		// Step 4
		const correctAnsatz = problem.itsData.step4.options.find((o) => o.isCorrect);
		expect(correctAnsatz?.latex).toContain("\\cos");
		expect(correctAnsatz?.latex).toContain("\\sin");

		// Step 5
		expect(problem.itsData.step5.expectedA).toBeDefined();
		expect(problem.itsData.step5.expectedB).toBeDefined();
	});
});
