import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "../../src/lib/math-engine/odes";

describe("Linear ODE ITS Stage Generator Engine", () => {
	it("generates valid 6-stage ITS data for distinct real roots with constant forcing", () => {
		const problem = generateOdeProblem("distinct_real", "constant");

		expect(problem.title).toBe("Practice Problem: 2nd-Order LCC ODE");
		expect(problem.itsData).toBeDefined();

		// Stage 1
		expect(problem.itsData.stage1.rootType).toBe("distinct_real");
		expect(problem.itsData.stage1.hints.length).toBe(3);

		// Stage 2
		expect(problem.itsData.stage2.correctTemplate).toBe("distinct_real");
		expect(problem.itsData.stage2.misconceptions.repeated_real).toBeDefined();

		// Stage 3
		expect(problem.itsData.stage3.options.length).toBe(4);
		const correctAnsatz = problem.itsData.stage3.options.find((o) => o.isCorrect);
		expect(correctAnsatz).toBeDefined();
		expect(correctAnsatz?.latex).toContain("K_p");

		// Stage 4
		expect(problem.itsData.stage4.expectedKp).toBeDefined();

		// Stage 5
		expect(problem.itsData.stage5.expectedC1).toBeDefined();
		expect(problem.itsData.stage5.expectedC2).toBeDefined();

		// Stage 6
		expect(problem.itsData.stage6.expectedZI).toBeDefined();
		expect(problem.itsData.stage6.expectedZS).toBeDefined();
	});

	it("generates valid 6-stage ITS data for complex conjugate roots with sinusoidal forcing", () => {
		const problem = generateOdeProblem("complex_conjugate", "sinusoid");

		expect(problem.itsData.stage1.rootType).toBe("complex_conjugate");
		expect(problem.itsData.stage1.im).toBeGreaterThan(0);
		expect(problem.itsData.stage2.correctTemplate).toBe("complex_conjugate");

		const correctAnsatz = problem.itsData.stage3.options.find((o) => o.isCorrect);
		expect(correctAnsatz?.latex).toContain("\\cos");
		expect(correctAnsatz?.latex).toContain("\\sin");

		expect(problem.itsData.stage4.expectedA).toBeDefined();
		expect(problem.itsData.stage4.expectedB).toBeDefined();
	});
});
