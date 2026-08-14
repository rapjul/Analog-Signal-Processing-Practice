import {
	computeParticularSolution,
	generateOdeProblem,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes";
import { describe, expect, it } from "vitest";

describe("LCC ODE Math Engine", () => {
	describe("Characteristic Equation Solver", () => {
		it("solves distinct real roots s^2 + 5s + 6 = 0", () => {
			const res = solveCharacteristicEquation(5, 6);
			expect(res.rootType).toBe("distinct_real");
			expect(res.roots.r1).toBe(-2);
			expect(res.roots.r2).toBe(-3);
		});

		it("solves repeated real roots s^2 + 4s + 4 = 0", () => {
			const res = solveCharacteristicEquation(4, 4);
			expect(res.rootType).toBe("repeated_real");
			expect(res.roots.r1).toBe(-2);
		});

		it("solves complex conjugate roots s^2 + 2s + 5 = 0", () => {
			const res = solveCharacteristicEquation(2, 5);
			expect(res.rootType).toBe("complex_conjugate");
			expect(res.roots.r1).toBe(-1); // sigma
			expect(res.roots.im).toBe(2); // omega_d
		});
	});

	describe("Particular Solution Solver", () => {
		it("computes constant forcing particular solution for y'' + 5y' + 6y = 12", () => {
			const ode = solveCharacteristicEquation(5, 6);
			const forcing = { type: "constant" as const, K: 12, latex: "12" };
			const ps = computeParticularSolution(ode, forcing);
			expect(ps.coeffs.Kp).toBe(2);
			expect(ps.eval(0)).toBe(2);
		});

		it("computes exponential forcing particular solution for y'' + 5y' + 6y = 12 e^{-4t}", () => {
			const ode = solveCharacteristicEquation(5, 6);
			const forcing = {
				type: "exponential" as const,
				K: 12,
				p: -4,
				latex: "12 e^{-4t}",
			};
			const ps = computeParticularSolution(ode, forcing);
			// denom = (-4)^2 + 5(-4) + 6 = 16 - 20 + 6 = 2 => Kp = 12 / 2 = 6
			expect(ps.coeffs.Kp).toBe(6);
			expect(ps.eval(0)).toBe(6);
		});
	});

	describe("Homogeneous Constants Solver", () => {
		it("solves C1, C2 for distinct real roots r1 = -2, r2 = -3 with y(0+) = 3, y'(0+) = -7", () => {
			const ode = solveCharacteristicEquation(5, 6);
			const hs = solveHomogeneousConstants(ode, 3, -7);
			// C1 + C2 = 3
			// -2 C1 - 3 C2 = -7 => C1 = 2, C2 = 1
			expect(Math.round(hs.C1)).toBe(2);
			expect(Math.round(hs.C2)).toBe(1);
		});
	});

	describe("Backward Constructive Problem Generator", () => {
		it("generates a valid ODE problem with distinct real roots", () => {
			const problem = generateOdeProblem("distinct_real", "constant");
			expect(problem.params.rootType).toBe("distinct_real");
			expect(problem.steps.length).toBe(9);

			// Verify completeness of evaluation functions at t = 0
			const yComplete0 = problem.evalComplete(0);
			expect(Math.abs(yComplete0 - problem.initialConditions.y0)).toBeLessThan(
				1e-2,
			);
		});

		it("generates a valid ODE problem with complex conjugate roots and sinusoidal forcing", () => {
			const problem = generateOdeProblem("complex_conjugate", "sinusoid");
			expect(problem.params.rootType).toBe("complex_conjugate");
			expect(problem.steps.length).toBe(9);
			expect(problem.forcing.type).toBe("sinusoid");

			// Zero-Input + Zero-State linearity check at t = 1s: y(t) == y_zi(t) + y_zs(t)
			const yComp = problem.evalComplete(1);
			const yZI = problem.evalZI(1);
			const yZS = problem.evalZS(1);
			expect(Math.abs(yComp - (yZI + yZS))).toBeLessThan(1e-3);
		});
	});

	describe("ODE Step Breakdown Generation", () => {
		it("generates clean formal LaTeX templates for Step 2 across root types", () => {
			// Distinct real
			const odeDistinct = generateOdeProblem("distinct_real");
			expect(odeDistinct.steps[1].latex).toBe(
				"y_h(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}"
			);

			// Repeated real
			const odeRepeated = generateOdeProblem("repeated_real");
			expect(odeRepeated.steps[1].latex).toBe(
				"y_h(t) = (C_1 + C_2 t) e^{r t}"
			);

			// Complex conjugate
			const odeComplex = generateOdeProblem("complex_conjugate");
			expect(odeComplex.steps[1].latex).toBe(
				"y_h(t) = e^{\\sigma t} [C_1 \\cos(\\omega_d t) + C_2 \\sin(\\omega_d t)]"
			);
		});

		it("generates factored forms in Step 1 for integer roots and quadratic formula for complex conjugate roots", () => {
			const odeDistinct = generateOdeProblem("distinct_real");
			expect(odeDistinct.steps[0].latex).toContain("(s ");

			const odeRepeated = generateOdeProblem("repeated_real");
			expect(odeRepeated.steps[0].latex).toContain(")^2 &= 0");

			const odeComplex = generateOdeProblem("complex_conjugate");
			expect(odeComplex.steps[0].latex).toContain("\\sqrt{");
		});

		it("renders explicit 2x2 linear system of equations in Step 7 for initial conditions", () => {
			const problem = generateOdeProblem("distinct_real", "exponential");
			expect(problem.steps[6].aligned).toBe(true);
			expect(problem.steps[6].latex).toContain("C_1");
			expect(problem.steps[6].latex).toContain("C_2");
		});
	});
});
