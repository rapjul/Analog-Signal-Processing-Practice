import { describe, expect, it } from "vitest";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import {
	computeParticularSolution,
	type ForcingType,
	generateOdeProblem,
	type RootType,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes";

function generateSecondOrderProblem(
	rootType: RootType | "random",
	forcingType: ForcingType | "random" = "random",
) {
	return generateOdeProblem({
		order: 2,
		rootType,
		forcingType,
		leadingCoefficient: "monic",
		resonance: "none",
	});
}

describe("LCC ODE Math Engine", () => {
	describe("Characteristic Equation Solver", () => {
		it("solves first-order and non-monic second-order equations", () => {
			const first = solveCharacteristicEquation({
				order: 1,
				a1: 3,
				a0: 6,
			});
			expect(first.roots.r1).toBe(-2);
			expect(first.a2).toBe(0);

			const second = solveCharacteristicEquation({
				order: 2,
				a2: 2,
				a1: 10,
				a0: 12,
			});
			expect(second.roots.r1).toBe(-2);
			expect(second.roots.r2).toBe(-3);
		});
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
		it("handles constant simple and repeated resonance", () => {
			const simple = computeParticularSolution(
				solveCharacteristicEquation({ order: 1, a1: 2, a0: 0 }),
				{ type: "constant", K: 6, latex: "6" },
			);
			expect(simple.resonanceMultiplicity).toBe(1);
			expect(simple.coeffs.Kp).toBe(3);
			expect(simple.eval(2)).toBe(6);

			const repeated = computeParticularSolution(
				solveCharacteristicEquation({
					order: 2,
					a2: 3,
					a1: 0,
					a0: 0,
				}),
				{ type: "constant", K: 12, latex: "12" },
			);
			expect(repeated.resonanceMultiplicity).toBe(2);
			expect(repeated.coeffs.Kp).toBe(2);
			expect(repeated.eval(2)).toBe(8);
		});

		it("handles exponential simple and repeated resonance for non-monic equations", () => {
			const simpleOde = solveCharacteristicEquation({
				order: 2,
				a2: 2,
				a1: 8,
				a0: 6,
			});
			const simple = computeParticularSolution(simpleOde, {
				type: "exponential",
				K: 8,
				p: -1,
				latex: "8e^{-t}",
			});
			expect(simple.resonanceMultiplicity).toBe(1);
			expect(simple.coeffs.Kp).toBe(2);

			const repeatedOde = solveCharacteristicEquation({
				order: 2,
				a2: 3,
				a1: 12,
				a0: 12,
			});
			const repeated = computeParticularSolution(repeatedOde, {
				type: "exponential",
				K: 12,
				p: -2,
				latex: "12e^{-2t}",
			});
			expect(repeated.resonanceMultiplicity).toBe(2);
			expect(repeated.coeffs.Kp).toBe(2);
			expect(repeated.latex).toContain("t^2");
		});

		it("handles sinusoidal resonance with the required t multiplier", () => {
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: 2,
				a1: 0,
				a0: 8,
			});
			const solution = computeParticularSolution(ode, {
				type: "sinusoid",
				K: 8,
				omega: 2,
				latex: "8\\cos(2t)",
			});
			expect(solution.resonanceMultiplicity).toBe(1);
			expect(solution.coeffs.A).toBe(0);
			expect(solution.coeffs.B).toBe(1);
			expect(solution.latex).toContain("t \\sin(2t)");
		});

		it("satisfies non-monic first- and second-order equation residuals", () => {
			const cases = [
				{
					ode: solveCharacteristicEquation({
						order: 1,
						a1: 3,
						a0: 6,
					}),
					forcing: {
						type: "sinusoid" as const,
						K: 7,
						omega: 2,
						latex: "7\\cos(2t)",
					},
				},
				{
					ode: solveCharacteristicEquation({
						order: 2,
						a2: 2,
						a1: 5,
						a0: 6,
					}),
					forcing: {
						type: "sinusoid" as const,
						K: 104,
						omega: 2,
						latex: "104\\cos(2t)",
					},
				},
				{
					ode: solveCharacteristicEquation({
						order: 2,
						a2: 3,
						a1: 12,
						a0: 12,
					}),
					forcing: {
						type: "exponential" as const,
						K: 12,
						p: -2,
						latex: "12e^{-2t}",
					},
				},
			];

			for (const { ode, forcing } of cases) {
				const particular = computeParticularSolution(ode, forcing);
				const t = 0.37;
				const h = 1e-4;
				const y = particular.eval(t);
				const dy =
					(particular.eval(t + h) - particular.eval(t - h)) / (2 * h);
				const ddy =
					(particular.eval(t + h) - 2 * y + particular.eval(t - h)) /
					(h * h);
				const lhs =
					ode.order === 1
						? ode.a1 * dy + ode.a0 * y
						: ode.a2 * ddy + ode.a1 * dy + ode.a0 * y;
				const rhs =
					forcing.type === "sinusoid"
						? forcing.K * Math.cos((forcing.omega ?? 1) * t)
						: forcing.K * Math.exp((forcing.p ?? 0) * t);
				expect(Number.isFinite(lhs)).toBe(true);
				expect(lhs).toBeCloseTo(rhs, 4);
			}
		});
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
			expect(Math.round(hs.C2 ?? 0)).toBe(1);
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
		it("reproduces all generated data and option shuffles from a seed", () => {
			const options = {
				order: 2 as const,
				rootType: "distinct_real" as const,
				forcingType: "exponential" as const,
				leadingCoefficient: "non_monic" as const,
				resonance: "simple" as const,
				seed: 210,
			};
			const first = generateOdeProblem(options);
			const second = generateOdeProblem(options);
			const view = (problem: typeof first) => ({
				id: problem.id,
				params: problem.params,
				forcing: problem.forcing,
				initialConditions: problem.initialConditions,
				odeLatex: problem.odeLatex,
				solutions: problem.solutions,
				step4Order: problem.itsData.step4.options.map(
					(option) => option.id,
				),
				step5Order: problem.itsData.step5.firstDerivativeOptions?.map(
					(option) => option.id,
				),
				conceptOrder: problem.itsData.step7.conceptQuestion.options.map(
					(option) => option.id,
				),
			});
			expect(view(first)).toEqual(view(second));
			expect(first.params.a2).toBeGreaterThan(1);
			expect(first.forcing.p).toBe(first.params.roots.r1);
			expect(first.params.roots.r1).toBeLessThan(0);
		});

		it("shuffles synthetic calculations but preserves ansatz ordering", () => {
			const correctDerivativePositions = new Set<number>();
			for (let seed = 0; seed < 24; seed++) {
				const problem = generateOdeProblem({
					order: 2,
					rootType: "distinct_real",
					forcingType: "exponential",
					leadingCoefficient: "monic",
					resonance: "none",
					seed,
				});
				expect(problem.itsData.step4.options[0].isCorrect).toBe(true);
				correctDerivativePositions.add(
					problem.itsData.step5.firstDerivativeOptions?.findIndex(
						(option) => option.isCorrect,
					) ?? -1,
				);
			}
			expect(correctDerivativePositions.size).toBeGreaterThan(1);
			expect(correctDerivativePositions).not.toContain(-1);
		});

		it("generates order-aware first-order monic and non-monic problems", () => {
			for (const leadingCoefficient of ["monic", "non_monic"] as const) {
				const problem = generateOdeProblem({
					order: 1,
					rootType: "complex_conjugate",
					forcingType: "sinusoid",
					leadingCoefficient,
					resonance: "none",
					seed: leadingCoefficient === "monic" ? 1 : 2,
				});
				expect(problem.params.order).toBe(1);
				expect(problem.params.a2).toBe(0);
				expect(problem.params.rootType).toBe("single_real");
				expect(problem.itsData.step3.formLatex).not.toContain("C_2");
				expect(problem.initialConditions.dy0).toBeUndefined();
				expect(problem.itsData.step6.expectedC2).toBeUndefined();
				expect(problem.itsData.step6.dyp0).toBeUndefined();
				expect(problem.itsData.step6.targetDYh0).toBeUndefined();
				expect(problem.evalComplete(0)).toBeCloseTo(
					problem.initialConditions.y0,
					10,
				);
			}
		});

		it("generates stable simple and repeated exponential resonance", () => {
			for (const resonance of ["simple", "repeated"] as const) {
				const problem = generateOdeProblem({
					order: 2,
					rootType: "random",
					forcingType: "random",
					leadingCoefficient: "non_monic",
					resonance,
					seed: resonance === "simple" ? 30 : 31,
				});
				expect(problem.forcing.type).toBe("exponential");
				expect(problem.forcing.p).toBe(problem.params.roots.r1);
				expect(problem.params.roots.r1).toBeLessThan(0);
				expect(
					problem.itsData.step4.options.find(
						(option) => option.isCorrect,
					)?.latex,
				).toContain(resonance === "simple" ? "t e" : "t^2 e");
			}
		});

		it("uses approximately 25% resonance in mixed mode", () => {
			let resonant = 0;
			const samples = 1_000;
			for (let seed = 0; seed < samples; seed++) {
				const problem = generateOdeProblem({
					order: "random",
					rootType: "random",
					forcingType: "random",
					leadingCoefficient: "random",
					resonance: "random",
					seed,
				});
				if (
					problem.forcing.type === "exponential" &&
					problem.forcing.p === problem.params.roots.r1
				)
					resonant++;
			}
			expect(resonant / samples).toBeGreaterThan(0.2);
			expect(resonant / samples).toBeLessThan(0.3);
		});
		it("generates a valid ODE problem with distinct real roots", () => {
			const problem = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			expect(problem.params.rootType).toBe("distinct_real");

			// Verify completeness of evaluation functions at t = 0
			const yComplete0 = problem.evalComplete(0);
			expect(
				Math.abs(yComplete0 - problem.initialConditions.y0),
			).toBeLessThan(1e-2);
		});

		it("generates a valid ODE problem with complex conjugate roots and sinusoidal forcing", () => {
			const problem = generateSecondOrderProblem(
				"complex_conjugate",
				"sinusoid",
			);
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
			const odeDistinct = generateSecondOrderProblem("distinct_real");
			expect(odeDistinct.itsData.step3.correctTemplate).toBe(
				"distinct_real",
			);
			expect(odeDistinct.itsData.step3.formLatex).toContain("C_1 e^{");
			expect(odeDistinct.itsData.step3.formLatex).toContain("C_2 e^{");

			// Repeated real
			const odeRepeated = generateSecondOrderProblem("repeated_real");
			expect(odeRepeated.itsData.step3.correctTemplate).toBe(
				"repeated_real",
			);
			expect(odeRepeated.itsData.step3.formLatex).toContain(
				"(C_1 + C_2 t) e^{",
			);

			// Complex conjugate
			const odeComplex = generateSecondOrderProblem("complex_conjugate");
			expect(odeComplex.itsData.step3.correctTemplate).toBe(
				"complex_conjugate",
			);
			expect(odeComplex.itsData.step3.formLatex).toContain("\\cos(");
			expect(odeComplex.itsData.step3.formLatex).toContain("\\sin(");
		});

		it("generates a random ODE problem with valid 7-step itsData", () => {
			const problem = generateSecondOrderProblem("random", "random");
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
			const constProb = generateSecondOrderProblem(
				"distinct_real",
				"constant",
			);
			expect(constProb.itsData.step5.expectedKp).toBeDefined();
			expect(constProb.solutions.y_p_latex).not.toBe("");

			// Exponential forcing
			const expProb = generateSecondOrderProblem(
				"distinct_real",
				"exponential",
			);
			expect(expProb.itsData.step5.expectedKp).toBeDefined();
			expect(expProb.solutions.y_p_latex).toContain("e^{");

			// Sinusoidal forcing
			const sinProb = generateSecondOrderProblem(
				"distinct_real",
				"sinusoid",
			);
			expect(sinProb.itsData.step5.expectedA).toBeDefined();
			expect(sinProb.itsData.step5.expectedB).toBeDefined();
			expect(
				sinProb.solutions.y_p_latex.includes("\\cos") ||
					sinProb.solutions.y_p_latex.includes("\\sin"),
			).toBe(true);
		});

		it("omits unit 1 and -1 coefficients from odeLatex and characteristic equations", () => {
			for (let i = 0; i < 30; i++) {
				const problem = generateSecondOrderProblem("random", "random");
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
			const distinctProblem = generateSecondOrderProblem("distinct_real");
			expect(
				distinctProblem.itsData.step2.factoredFormLatex,
			).toBeDefined();
			expect(distinctProblem.itsData.step2.factoredFormLatex).toContain(
				"(s",
			);
			expect(distinctProblem.itsData.step2.factoredFormLatex).toContain(
				"= 0",
			);

			const repeatedProblem = generateSecondOrderProblem("repeated_real");
			expect(
				repeatedProblem.itsData.step2.factoredFormLatex,
			).toBeDefined();
			expect(repeatedProblem.itsData.step2.factoredFormLatex).toContain(
				"^2 = 0",
			);

			const complexProblem =
				generateSecondOrderProblem("complex_conjugate");
			expect(
				complexProblem.itsData.step2.factoredFormLatex,
			).toBeUndefined();
		});
	});

	describe("Hybrid numeric comparison", () => {
		it("uses max(5e-4, 1e-4 * abs(expected))", () => {
			expect(approximatelyEqual(0.0005, 0)).toBe(true);
			expect(approximatelyEqual(0.00051, 0)).toBe(false);
			expect(approximatelyEqual(10_001, 10_000)).toBe(true);
			expect(approximatelyEqual(10_001.01, 10_000)).toBe(false);
		});
	});
});
