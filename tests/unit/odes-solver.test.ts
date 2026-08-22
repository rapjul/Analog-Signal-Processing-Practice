import { describe, expect, it } from "vitest";
import { approximatelyEqual } from "$lib/math-engine/numeric";
import {
	computeParticularSolution,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes/solver";

describe("LCC ODE Analytical Math Engine", () => {
	describe("Characteristic Equation & Root Solving", () => {
		/**
		 * Verifies first-order and non-monic second-order polynomial root finding.
		 */
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

		/**
		 * Verifies default parameter handling in characteristic equation overloads.
		 */
		it("handles default coefficient parameters when a2 is omitted in second-order object", () => {
			const defaultA2 = solveCharacteristicEquation({
				order: 2,
				a1: 4,
				a0: 4,
			});
			expect(defaultA2.a2).toBe(1);
			expect(defaultA2.rootType).toBe("repeated_real");
		});

		/**
		 * Verifies distinct real roots for second-order characteristic equations.
		 */
		it("solves distinct real roots s^2 + 5s + 6 = 0", () => {
			const res = solveCharacteristicEquation(5, 6);
			expect(res.rootType).toBe("distinct_real");
			expect(res.roots.r1).toBe(-2);
			expect(res.roots.r2).toBe(-3);
		});

		/**
		 * Verifies repeated real roots for second-order characteristic equations.
		 */
		it("solves repeated real roots s^2 + 4s + 4 = 0", () => {
			const res = solveCharacteristicEquation(4, 4);
			expect(res.rootType).toBe("repeated_real");
			expect(res.roots.r1).toBe(-2);
		});

		/**
		 * Verifies complex conjugate roots for underdamped second-order characteristic equations.
		 */
		it("solves complex conjugate roots s^2 + 2s + 5 = 0", () => {
			const res = solveCharacteristicEquation(2, 5);
			expect(res.rootType).toBe("complex_conjugate");
			expect(res.roots.r1).toBe(-1);
			expect(res.roots.im).toBe(2);
		});

		/**
		 * Verifies defensive error throwing when leading coefficient is zero.
		 */
		it("throws an error when first-order leading coefficient a1 is zero", () => {
			expect(() =>
				solveCharacteristicEquation({
					order: 1,
					a1: 0,
					a0: 5,
				}),
			).toThrow("First-order leading coefficient a1 must be non-zero");
		});

		/**
		 * Verifies defensive error throwing when second-order leading coefficient a2 is zero.
		 */
		it("throws an error when second-order leading coefficient a2 is zero", () => {
			expect(() =>
				solveCharacteristicEquation({
					order: 2,
					a2: 0,
					a1: 3,
					a0: 2,
				}),
			).toThrow("Second-order leading coefficient a2 must be non-zero");
		});

		/**
		 * Verifies defensive error throwing for unhandled or invalid root types.
		 */
		it("throws an error when solving homogeneous constants for an unhandled root type", () => {
			expect(() =>
				solveHomogeneousConstants(
					{
						order: 2,
						a2: 1,
						a1: 2,
						a0: 1,
						rootType:
							"invalid_root_type" as unknown as "distinct_real",
						roots: { r1: -1, r2: -1 },
					},
					1,
					0,
				),
			).toThrow("Unhandled root type: invalid_root_type");
		});
	});

	describe("Particular Solution (Method of Undetermined Coefficients)", () => {
		/**
		 * Verifies constant forcing term solving: y'' + 5y' + 6y = 12.
		 */
		it("computes particular solution for constant input: y'' + 5y' + 6y = 12", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 5,
				a0: 6,
				rootType: "distinct_real" as const,
				roots: { r1: -2, r2: -3 },
			};
			const particular = computeParticularSolution(ode, {
				type: "constant",
				K: 12,
				latex: "12",
			});
			expect(particular.coeffs.Kp).toBe(2);
			expect(particular.eval(0)).toBe(2);
			expect(particular.evalDeriv(0)).toBe(0);
			expect(particular.latex).toBe("2");
		});

		/**
		 * Verifies non-resonant exponential forcing: y'' + 5y' + 6y = 20 e^{-t}.
		 */
		it("computes particular solution for non-resonant exponential forcing", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 5,
				a0: 6,
				rootType: "distinct_real" as const,
				roots: { r1: -2, r2: -3 },
			};
			// P(-1) = (-1)^2 + 5(-1) + 6 = 1 - 5 + 6 = 2
			// Kp = 20 / 2 = 10
			const particular = computeParticularSolution(ode, {
				type: "exponential",
				K: 20,
				p: -1,
				latex: "20 e^{-t}",
			});
			expect(particular.coeffs.Kp).toBe(10);
			expect(particular.eval(0)).toBe(10);
			expect(particular.evalDeriv(0)).toBe(-10);
			expect(particular.latex).toBe("10 e^{-t}");
		});

		/**
		 * Verifies simple resonant exponential forcing (root matches characteristic root of multiplicity 1).
		 */
		it("computes simple resonance particular solution: y'' + 5y' + 6y = 10 e^{-2t}", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 5,
				a0: 6,
				rootType: "distinct_real" as const,
				roots: { r1: -2, r2: -3 },
			};
			// P'(-2) = 2(-2) + 5 = 1
			// Kp = 10 / 1 = 10 -> yp(t) = 10 t e^{-2t}
			const particular = computeParticularSolution(ode, {
				type: "exponential",
				K: 10,
				p: -2,
				latex: "10 e^{-2t}",
			});
			expect(particular.coeffs.Kp).toBe(10);
			expect(particular.resonanceMultiplicity).toBe(1);
			expect(particular.eval(0)).toBe(0);
			// yp'(t) = 10 e^{-2t} - 20 t e^{-2t} => yp'(0) = 10
			expect(particular.evalDeriv(0)).toBe(10);
			expect(particular.latex).toBe("10 t e^{-2t}");
		});

		/**
		 * Verifies repeated resonance particular solution (root matches repeated characteristic root of multiplicity 2).
		 */
		it("computes repeated resonance particular solution: y'' + 4y' + 4y = 6 e^{-2t}", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 4,
				a0: 4,
				rootType: "repeated_real" as const,
				roots: { r1: -2, r2: -2 },
			};
			// P''(-2) = 2(1) = 2
			// Kp = 6 / 2 = 3 -> yp(t) = 3 t^2 e^{-2t}
			const particular = computeParticularSolution(ode, {
				type: "exponential",
				K: 6,
				p: -2,
				latex: "6 e^{-2t}",
			});
			expect(particular.coeffs.Kp).toBe(3);
			expect(particular.resonanceMultiplicity).toBe(2);
			expect(particular.eval(0)).toBe(0);
			expect(particular.evalDeriv(0)).toBe(0);
			expect(particular.latex).toBe("3 t^2 e^{-2t}");
		});

		/**
		 * Verifies sinusoidal forcing without resonance.
		 */
		it("computes particular solution for sinusoidal forcing: y'' + 3y' + 2y = 10 cos(2t)", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 3,
				a0: 2,
				rootType: "distinct_real" as const,
				roots: { r1: -1, r2: -2 },
			};
			// w = 2, K = 10
			// m11 = a0 - a2*w^2 = 2 - 1(4) = -2
			// m12 = a1*w = 3(2) = 6
			// m21 = -6, m22 = -2
			// det = (-2)(-2) - (6)(-6) = 4 + 36 = 40
			// A = (10 * -2) / 40 = -0.5
			// B = (-10 * -6) / 40 = 1.5
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: 10,
				omega: 2,
				latex: "10 \\cos(2t)",
			});
			expect(particular.coeffs.A).toBe(-0.5);
			expect(particular.coeffs.B).toBe(1.5);
			expect(particular.eval(0)).toBe(-0.5);
			expect(particular.evalDeriv(0)).toBe(1.5 * 2);
			expect(particular.latex).toBe(
				"-\\frac{1}{2} \\cos(2t) + \\frac{3}{2} \\sin(2t)",
			);
		});

		/**
		 * Verifies sinusoidal forcing with negative B coefficient sign rendering.
		 */
		it("formats sinusoidal particular solution with negative B coefficient correctly", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: -3,
				a0: 2,
				rootType: "distinct_real" as const,
				roots: { r1: 1, r2: 2 },
			};
			// w = 2, K = 10
			// m11 = 2 - 4 = -2, m12 = -3(2) = -6
			// m21 = 6, m22 = -2
			// det = (-2)(-2) - (-6)(6) = 4 + 36 = 40
			// A = (10 * -2) / 40 = -0.5
			// B = (-10 * 6) / 40 = -1.5
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: 10,
				omega: 2,
				latex: "10 \\cos(2t)",
			});
			expect(particular.coeffs.B).toBe(-1.5);
			expect(particular.latex).toContain("- \\frac{3}{2} \\sin(2t)");
		});

		/**
		 * Verifies sinusoidal pure resonance on undamped system: y'' + 4y = 8 cos(2t).
		 */
		it("computes undamped pure sinusoidal resonance particular solution: y'' + 4y = 8 cos(2t)", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 0,
				a0: 4,
				rootType: "complex_conjugate" as const,
				roots: { r1: 0, im: 2 },
			};
			// B = K / (2*a2*w) = 8 / (2*1*2) = 2
			// yp(t) = 2 t sin(2t)
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: 8,
				omega: 2,
				latex: "8 \\cos(2t)",
			});
			expect(particular.resonanceMultiplicity).toBe(1);
			expect(particular.coeffs.B).toBe(2);
			expect(particular.eval(0)).toBe(0);
			expect(particular.evalDeriv(0)).toBe(0);
			expect(particular.latex).toBe("2 t \\sin(2t)");
		});

		/**
		 * Verifies defensive error throwing for unsupported degenerate sinusoidal resonance.
		 */
		it("throws an error for unsupported degenerate sinusoidal resonance", () => {
			const ode = {
				order: 1 as const,
				a2: 0 as const,
				a1: 0,
				a0: 0,
				rootType: "single_real" as const,
				roots: { r1: 0 },
			};
			expect(() =>
				computeParticularSolution(ode, {
					type: "sinusoid",
					K: 5,
					omega: 1,
					latex: "5 \\cos(t)",
				}),
			).toThrow("Unsupported degenerate sinusoidal resonance");
		});

		/**
		 * Verifies defensive error throwing when given an unhandled forcing type.
		 */
		it("throws an error when computing particular solution for an unhandled forcing type", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 2,
				a0: 1,
				rootType: "repeated_real" as const,
				roots: { r1: -1, r2: -1 },
			};
			expect(() =>
				computeParticularSolution(ode, {
					type: "unsupported" as unknown as "constant",
					K: 5,
					latex: "5",
				}),
			).toThrow("Unhandled forcing function type: unsupported");
		});
	});

	describe("Homogeneous Initial Constants (C1, C2)", () => {
		/**
		 * Verifies first-order initial constant solving: C1 = y(0).
		 */
		it("solves first-order homogeneous initial constants", () => {
			const ode = {
				order: 1 as const,
				a2: 0 as const,
				a1: 1,
				a0: 3,
				rootType: "single_real" as const,
				roots: { r1: -3 },
			};
			const sol = solveHomogeneousConstants(ode, 5, 0);
			expect(sol.C1).toBe(5);
			expect(sol.eval(0)).toBe(5);
			expect(approximatelyEqual(sol.eval(1), 5 * Math.exp(-3))).toBe(
				true,
			);
		});

		/**
		 * Verifies distinct real second-order homogeneous initial constants.
		 */
		it("solves distinct real second-order initial constants", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 5,
				a0: 6,
				rootType: "distinct_real" as const,
				roots: { r1: -2, r2: -3 },
			};
			// C1 + C2 = 3
			// -2 C1 - 3 C2 = -7
			// C1 = 2, C2 = 1
			const sol = solveHomogeneousConstants(ode, 3, -7);
			expect(sol.C1).toBe(2);
			expect(sol.C2).toBe(1);
			expect(sol.eval(0)).toBe(3);
			expect(sol.eval(1)).toBeCloseTo(2 * Math.exp(-2) + Math.exp(-3));
			expect(sol.latex).toContain("2 e^{-2t}");
			expect(sol.latex).toContain("e^{-3t}");
		});

		/**
		 * Verifies repeated real second-order homogeneous initial constants.
		 */
		it("solves repeated real second-order initial constants", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 4,
				a0: 4,
				rootType: "repeated_real" as const,
				roots: { r1: -2, r2: -2 },
			};
			// y(0) = C1 = 4
			// y'(0) = -2 C1 + C2 = -5 => -8 + C2 = -5 => C2 = 3
			const sol = solveHomogeneousConstants(ode, 4, -5);
			expect(sol.C1).toBe(4);
			expect(sol.C2).toBe(3);
			expect(sol.eval(0)).toBe(4);
			expect(sol.eval(1)).toBeCloseTo(7 * Math.exp(-2));
			expect(sol.latex).toBe("(4 + 3t) e^{-2t}");
		});

		/**
		 * Verifies complex conjugate second-order homogeneous initial constants.
		 */
		it("solves complex conjugate second-order initial constants", () => {
			const ode = {
				order: 2 as const,
				a2: 1,
				a1: 2,
				a0: 5,
				rootType: "complex_conjugate" as const,
				roots: { r1: -1, im: 2 },
			};
			// y(0) = C1 = 2
			// y'(0) = -1(C1) + 2(C2) = 4 => -2 + 2(C2) = 4 => 2 C2 = 6 => C2 = 3
			const sol = solveHomogeneousConstants(ode, 2, 4);
			expect(sol.C1).toBe(2);
			expect(sol.C2).toBe(3);
			expect(sol.eval(0)).toBe(2);
			expect(sol.eval(1)).toBeCloseTo(
				Math.exp(-1) * (2 * Math.cos(2) + 3 * Math.sin(2)),
			);
			expect(sol.latex).toBe("e^{-t} [2 \\cos(2t) + 3 \\sin(2t)]");
		});
	});
});
