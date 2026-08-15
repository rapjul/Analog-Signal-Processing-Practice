import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "../../src/lib/math-engine/odes";

describe("Linear ODE ITS Stage Generator Engine", () => {
	it("generates valid 7-stage ITS data for distinct real roots with constant forcing", () => {
		const problem = generateOdeProblem("distinct_real", "constant");

		expect(problem.title).toBe("Practice Problem: 2nd-Order LCC ODE");
		expect(problem.itsData).toBeDefined();

		// Stage 1: Characteristic Equation
		expect(problem.itsData.stage1.expectedA2).toBe(1);
		expect(problem.itsData.stage1.expectedA1).toBe(problem.params.a1);
		expect(problem.itsData.stage1.expectedA0).toBe(problem.params.a0);
		expect(problem.itsData.stage1.hints.length).toBe(3);

		// Stage 2: Characteristic Roots
		expect(problem.itsData.stage2.rootType).toBe("distinct_real");
		expect(problem.itsData.stage2.hints.length).toBe(3);

		// Stage 3: Homogeneous Form
		expect(problem.itsData.stage3.correctTemplate).toBe("distinct_real");
		expect(problem.itsData.stage3.misconceptions.repeated_real).toBeDefined();

		// Stage 4: Particular Solution Ansatz
		expect(problem.itsData.stage4.options.length).toBe(4);
		const correctAnsatz = problem.itsData.stage4.options.find((o) => o.isCorrect);
		expect(correctAnsatz).toBeDefined();
		expect(correctAnsatz?.latex).toContain("K_p");

		// Stage 5: Particular Coefficients
		expect(problem.itsData.stage5.expectedKp).toBeDefined();

		// Stage 6: Initial Conditions
		expect(problem.itsData.stage6.expectedC1).toBeDefined();
		expect(problem.itsData.stage6.expectedC2).toBeDefined();

		// Stage 7: Response Decomposition
		expect(problem.itsData.stage7.expectedZI).toBeDefined();
		expect(problem.itsData.stage7.expectedZS).toBeDefined();
	});

	it("generates valid 7-stage ITS data for complex conjugate roots with sinusoidal forcing", () => {
		const problem = generateOdeProblem("complex_conjugate", "sinusoid");

		// Stage 1
		expect(problem.itsData.stage1.expectedA2).toBe(1);
		expect(problem.itsData.stage1.expectedA1).toBe(problem.params.a1);

		// Stage 2
		expect(problem.itsData.stage2.rootType).toBe("complex_conjugate");
		expect(problem.itsData.stage2.im).toBeGreaterThan(0);

		// Stage 3
		expect(problem.itsData.stage3.correctTemplate).toBe("complex_conjugate");

		// Stage 4
		const correctAnsatz = problem.itsData.stage4.options.find((o) => o.isCorrect);
		expect(correctAnsatz?.latex).toContain("\\cos");
		expect(correctAnsatz?.latex).toContain("\\sin");

		// Stage 5
		expect(problem.itsData.stage5.expectedA).toBeDefined();
		expect(problem.itsData.stage5.expectedB).toBeDefined();
	});
});
