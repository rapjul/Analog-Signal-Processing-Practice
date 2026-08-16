import { describe, expect, it } from "vitest";
import {
	computeParticularSolution,
	generateOdeProblem,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes";

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

		it("computes sinusoidal forcing particular solution for y'' + 5y' + 6y = 104 \\cos(2t)", () => {
			const ode = solveCharacteristicEquation(5, 6);
			const forcing = {
				type: "sinusoid" as const,
				K: 104,
				omega: 2,
				latex: "104 \\cos(2t)",
			};
			const ps = computeParticularSolution(ode, forcing);
			// m11 = 6 - 4 = 2, m12 = 10, m21 = -10, m22 = 2, det = 4 - (-100) = 104
			// A = (104 * 2) / 104 = 2
			// B = (-104 * (-10)) / 104 = 10
			expect(ps.coeffs.A).toBeCloseTo(2, 5);
			expect(ps.coeffs.B).toBeCloseTo(10, 5);
			expect(ps.eval(0)).toBeCloseTo(2, 5);
			expect(ps.evalDeriv(0)).toBeCloseTo(20, 5); // B * omega = 10 * 2 = 20
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
			expect(hs.eval(0)).toBeCloseTo(3, 5);
		});

		it("solves C1, C2 for repeated real roots r1 = -2 with y(0+) = 3, y'(0+) = 2", () => {
			const ode = solveCharacteristicEquation(4, 4);
			const hs = solveHomogeneousConstants(ode, 3, 2);
			// C1 = 3
			// C2 = y'(0) - r*C1 = 2 - (-2)(3) = 8
			expect(hs.C1).toBe(3);
			expect(hs.C2).toBe(8);
			expect(hs.eval(0)).toBeCloseTo(3, 5);
		});

		it("solves C1, C2 for complex conjugate roots sigma = -1, omega_d = 2 with y(0+) = 2, y'(0+) = 4", () => {
			const ode = solveCharacteristicEquation(2, 5);
			const hs = solveHomogeneousConstants(ode, 2, 4);
			// C1 = 2
			// C2 = (4 - (-1)(2)) / 2 = 3
			expect(hs.C1).toBe(2);
			expect(hs.C2).toBe(3);
			expect(hs.eval(0)).toBeCloseTo(2, 5);
		});
	});

	describe("Backward Constructive Problem Generator", () => {
		it("generates a valid ODE problem with distinct real roots", () => {
			const problem = generateOdeProblem("distinct_real", "constant");
			expect(problem.params.rootType).toBe("distinct_real");

			// Verify completeness of evaluation functions at t = 0
			const yComplete0 = problem.evalComplete(0);
			expect(
				Math.abs(yComplete0 - problem.initialConditions.y0),
			).toBeLessThan(1e-2);
		});

		it("generates a valid ODE problem with complex conjugate roots and sinusoidal forcing", () => {
			const problem = generateOdeProblem("complex_conjugate", "sinusoid");
			expect(problem.params.rootType).toBe("complex_conjugate");
			expect(problem.forcing.type).toBe("sinusoid");

			// Zero-Input + Zero-State linearity check at t = 1s: y(t) == y_zi(t) + y_zs(t)
			const yComp = problem.evalComplete(1);
			const yZI = problem.evalZI(1);
			const yZS = problem.evalZS(1);
			expect(Math.abs(yComp - (yZI + yZS))).toBeLessThan(1e-3);
		});
	});

	describe("ODE ITS Data Generation", () => {
		it("generates instantiated homogeneous formulas in Step 3 across root types", () => {
			// Distinct real
			const odeDistinct = generateOdeProblem("distinct_real");
			expect(odeDistinct.itsData.step3.correctTemplate).toBe(
				"distinct_real",
			);
			expect(odeDistinct.itsData.step3.formLatex).toContain("C_1 e^{");
			expect(odeDistinct.itsData.step3.formLatex).toContain("C_2 e^{");

			// Repeated real
			const odeRepeated = generateOdeProblem("repeated_real");
			expect(odeRepeated.itsData.step3.correctTemplate).toBe(
				"repeated_real",
			);
			expect(odeRepeated.itsData.step3.formLatex).toContain(
				"(C_1 + C_2 t) e^{",
			);

			// Complex conjugate
			const odeComplex = generateOdeProblem("complex_conjugate");
			expect(odeComplex.itsData.step3.correctTemplate).toBe(
				"complex_conjugate",
			);
			expect(odeComplex.itsData.step3.formLatex).toContain("\\cos(");
			expect(odeComplex.itsData.step3.formLatex).toContain("\\sin(");
		});

		it("generates a random ODE problem with valid 7-step itsData", () => {
			const problem = generateOdeProblem("random", "random");
			expect([
				"distinct_real",
				"repeated_real",
				"complex_conjugate",
			]).toContain(problem.params.rootType);
			expect(["constant", "exponential", "sinusoid"]).toContain(
				problem.forcing.type,
			);
			expect(problem.itsData.step1.expectedA2).toBe(1);
			expect(problem.itsData.step1.expectedA1).toBe(problem.params.a1);
			expect(problem.itsData.step1.expectedA0).toBe(problem.params.a0);
			expect(problem.itsData.step2.rootType).toBe(
				problem.params.rootType,
			);
			expect(problem.itsData.step3.correctTemplate).toBe(
				problem.params.rootType,
			);
			expect(problem.itsData.step4.options.length).toBeGreaterThanOrEqual(
				3,
			);
			expect(problem.solutions.y_p_latex).toBeDefined();
			expect(problem.itsData.step6.expectedC1).toBeDefined();
			expect(problem.itsData.step6.expectedC2).toBeDefined();
			expect(problem.itsData.step7.expectedZI).toBeTruthy();
			expect(problem.itsData.step7.expectedZS).toBeTruthy();
		});

		it("generates correct Step 5 particular solution data across forcing types", () => {
			// Constant forcing
			const constProb = generateOdeProblem("distinct_real", "constant");
			expect(constProb.itsData.step5.expectedKp).toBeDefined();
			expect(constProb.solutions.y_p_latex).not.toBe("");

			// Exponential forcing
			const expProb = generateOdeProblem("distinct_real", "exponential");
			expect(expProb.itsData.step5.expectedKp).toBeDefined();
			expect(expProb.solutions.y_p_latex).toContain("e^{");

			// Sinusoidal forcing
			const sinProb = generateOdeProblem("distinct_real", "sinusoid");
			expect(sinProb.itsData.step5.expectedA).toBeDefined();
			expect(sinProb.itsData.step5.expectedB).toBeDefined();
			expect(
				sinProb.solutions.y_p_latex.includes("\\cos") ||
					sinProb.solutions.y_p_latex.includes("\\sin"),
			).toBe(true);
		});

		it("omits unit 1 and -1 coefficients from odeLatex and characteristic equations", () => {
			for (let i = 0; i < 30; i++) {
				const problem = generateOdeProblem("random", "random");
				// Ensure neither + 1 y(t), - 1 y(t), + 1 \frac{dy}{dt}, - 1 \frac{dy}{dt}, + 1 s, nor - 1 s appear
				expect(problem.odeLatex).not.toMatch(/[+-]\s*1\s*y\(t\)/);
				expect(problem.odeLatex).not.toMatch(/[+-]\s*1\s*\\frac\{dy\}/);
				expect(problem.itsData.step1.latex).not.toMatch(/[+-]\s*1s\b/);
				expect(problem.itsData.step1.latex).not.toMatch(
					/[+-]\s*1\s*s\b/,
				);
			}
		});

		it("generates correct factoredFormLatex for factorable roots and undefined for complex roots", () => {
			const distinctProblem = generateOdeProblem("distinct_real");
			expect(
				distinctProblem.itsData.step2.factoredFormLatex,
			).toBeDefined();
			expect(distinctProblem.itsData.step2.factoredFormLatex).toContain(
				"(s",
			);
			expect(distinctProblem.itsData.step2.factoredFormLatex).toContain(
				"= 0",
			);

			const repeatedProblem = generateOdeProblem("repeated_real");
			expect(
				repeatedProblem.itsData.step2.factoredFormLatex,
			).toBeDefined();
			expect(repeatedProblem.itsData.step2.factoredFormLatex).toContain(
				"^2 = 0",
			);

			const complexProblem = generateOdeProblem("complex_conjugate");
			expect(
				complexProblem.itsData.step2.factoredFormLatex,
			).toBeUndefined();
		});
	});
});
