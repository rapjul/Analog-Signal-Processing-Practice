import { describe, expect, it } from "vitest";
import { generateOdeProblem } from "$lib/math-engine/odes/generator";
import { normalizeOdeForcing } from "$lib/math-engine/odes/numerics";
import {
	computeParticularSolution,
	solveCharacteristicEquation,
	solveHomogeneousConstants,
} from "$lib/math-engine/odes/solver";

describe("ODE numerical regressions", () => {
	/** Verifies that common equation scales preserve roots and forced solutions. */
	it("preserves real, repeated, and complex roots across positive and negative scales", () => {
		for (const scale of [1, 1e-100, 1e-6, -1e-6, 1e100]) {
			for (const [a1, a0, rootType] of [
				[5, 6, "distinct_real"],
				[4, 4, "repeated_real"],
				[2, 5, "complex_conjugate"],
			] as const) {
				const actual = solveCharacteristicEquation({
					order: 2,
					a2: scale,
					a1: a1 * scale,
					a0: a0 * scale,
				});
				const baseline = solveCharacteristicEquation(a1, a0);
				expect(actual.rootType).toBe(rootType);
				const actualRoots =
					actual.roots.r2 !== undefined
						? [actual.roots.r1, actual.roots.r2].sort()
						: [actual.roots.r1];
				const baselineRoots =
					baseline.roots.r2 !== undefined
						? [baseline.roots.r1, baseline.roots.r2].sort()
						: [baseline.roots.r1];
				actualRoots.forEach(
					/** Checks each root. @param root - Calculated root. @param index - Root position. */ (
						root,
						index,
					) => {
						expect(root).toBeCloseTo(
							baselineRoots[index] ?? Number.NaN,
							10,
						);
					},
				);
				const particular = computeParticularSolution(actual, {
					type: "exponential",
					K: 20 * scale,
					p: -9,
					latex: "x(t)",
				});
				expect(particular.resonanceMultiplicity).toBe(0);
				expect(particular.eval(0)).toBeCloseTo(
					20 / (81 - 9 * a1 + a0),
					10,
				);
			}
		}
	});

	/** Verifies small non-resonant polynomial values do not trigger resonance. */
	it("distinguishes resonance from scaling and a nearby forcing rate", () => {
		for (const scale of [1, 1e-100, 1e100]) {
			const ode = solveCharacteristicEquation({
				order: 1,
				a1: scale,
				a0: 2 * scale,
			});
			for (const p of [-1, -2 + 1e-10, -2]) {
				const particular = computeParticularSolution(ode, {
					type: "exponential",
					K: scale,
					p,
					latex: "x(t)",
				});
				expect(particular.resonanceMultiplicity).toBe(p === -2 ? 1 : 0);
			}
		}
	});

	/** Verifies the small quadratic root survives subtractive cancellation. */
	it("recovers a small root and preserves the historical plus/minus ordering", () => {
		const ode = solveCharacteristicEquation(1e16, 1);
		expect(ode.roots.r1).toBe(-1e-16);
		expect(ode.roots.r2).toBe(-1e16);
	});

	/** Verifies zero-frequency cosine forcing reduces to constant forcing, including integrators. */
	it("handles zero-frequency cosine forcing without Infinity or NaN", () => {
		for (const [order, a1, a0, expected] of [
			[1, 1, 0, 2],
			[2, 0, 0, 2],
			[2, 1, 0, 2],
			[2, 1, 1, 1],
		] as const) {
			const ode = solveCharacteristicEquation({ order, a2: 1, a1, a0 });
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: 1,
				omega: 0,
				latex: "1",
			});
			expect(particular.eval(2)).toBe(expected);
			expect(Number.isFinite(particular.evalDeriv(2))).toBe(true);
		}
	});

	/** Verifies invalid numerical inputs fail at the public engine boundary. */
	it("rejects non-finite coefficients, forcing parameters, and initial conditions", () => {
		for (const value of [
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		]) {
			expect(() => solveCharacteristicEquation(value, 1)).toThrow(
				"finite",
			);
			const ode = solveCharacteristicEquation(3, 2);
			expect(() =>
				computeParticularSolution(ode, {
					type: "exponential",
					K: 1,
					p: value,
					latex: "x",
				}),
			).toThrow("finite");
			expect(() =>
				computeParticularSolution(ode, {
					type: "sinusoid",
					K: 1,
					omega: value,
					latex: "x",
				}),
			).toThrow("finite");
			expect(() => solveHomogeneousConstants(ode, value, 0)).toThrow(
				"finite",
			);
		}
		expect(
			normalizeOdeForcing({ type: "exponential", K: 1, latex: "x" }).p,
		).toBe(-1);
		expect(
			normalizeOdeForcing({ type: "sinusoid", K: 1, latex: "x" }).omega,
		).toBe(1);
	});

	/** Verifies repeated resonance is resolved before randomly choosing order. */
	it("honors repeated resonance for every random-order seed", () => {
		for (let seed = 0; seed < 50; seed++) {
			const problem = generateOdeProblem({
				order: "random",
				resonance: "repeated",
				seed,
			});
			expect(problem.params.order).toBe(2);
			expect(problem.params.rootType).toBe("repeated_real");
		}
	});
});
