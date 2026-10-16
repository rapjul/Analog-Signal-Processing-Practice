import { describe, expect, it } from "vitest";
import {
	type CharacteristicEquationCoefficients,
	computeParticularSolution,
	type ForcingFunction,
	generateOdeProblem,
	solveCharacteristicEquation,
} from "$lib/math-engine/odes/index";

/** Multipliers that must not change the normalized differential equation. */
const scales = [1e-200, 1e-10, 1e-6, 1, 1e6, 1e200, -1e-10, -1e6];

/** A forcing case with independently scaled equation and input coefficients. */
interface ParticularCase {
	/** Original characteristic polynomial. */
	coefficients: CharacteristicEquationCoefficients;
	/** Original forcing function. */
	forcing: ForcingFunction;
}

/**
 * Scales a characteristic polynomial without changing its order or roots.
 * @param coefficients - Original equation coefficients.
 * @param scale - Nonzero common multiplier.
 * @returns Equivalent equation coefficients.
 */
function scaleEquation(
	coefficients: CharacteristicEquationCoefficients,
	scale: number,
): CharacteristicEquationCoefficients {
	return coefficients.order === 1
		? { order: 1, a1: coefficients.a1 * scale, a0: coefficients.a0 * scale }
		: {
				order: 2,
				a2: (coefficients.a2 ?? 1) * scale,
				a1: coefficients.a1 * scale,
				a0: coefficients.a0 * scale,
			};
}

/** Registers numerical scale and resonance regressions. */
describe("ODE coefficient scale invariance", () => {
	/** Exercises representable roots whose unscaled discriminant would overflow. */
	it("preserves distinct finite roots when squared coefficients overflow", () => {
		const actual = solveCharacteristicEquation({
			order: 2,
			a2: 1e-308,
			a1: 1,
			a0: 1e-308,
		});
		expect(actual.rootType).toBe("distinct_real");
		expect(Number.isFinite(actual.roots.r1)).toBe(true);
		expect(Number.isFinite(actual.roots.r2)).toBe(true);
		expect(actual.roots.r1 / -1e-308).toBeCloseTo(1, 12);
		expect(actual.roots.r2! / -1e308).toBeCloseTo(1, 12);
		expect(actual.roots.r1 * actual.roots.r2!).toBeCloseTo(1, 12);
	});

	/** Exercises complex roots when multiplying the constant coefficient by four overflows. */
	it("preserves finite complex roots when the discriminant magnitude overflows", () => {
		const actual = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: 1e308,
		});
		expect(actual.rootType).toBe("complex_conjugate");
		expect(Math.abs(actual.roots.r1)).toBe(0);
		expect(actual.roots.im! / 1e154).toBeCloseTo(1, 12);
	});

	/** Rejects coefficient ratios that cannot be represented before comparing root multiplicity. */
	it("rejects nonfinite normalized intermediates explicitly", () => {
		expect(
			/** Attempts to normalize a ratio beyond the floating-point range. */
			() =>
				solveCharacteristicEquation({
					order: 2,
					a2: 1e-308,
					a1: 1e308,
					a0: 1,
				}),
		).toThrow("ODE coefficient ratios exceed the finite numeric range");
	});

	/** Rejects nonfinite coefficients before they can contaminate computed roots. */
	it("rejects nonfinite equation coefficients", () => {
		for (const value of [
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		]) {
			expect(
				/** Attempts to solve invalid first-order input. */
				() =>
					solveCharacteristicEquation({ order: 1, a1: value, a0: 1 }),
			).toThrow("ODE coefficients must be finite");
			expect(
				/** Attempts to solve invalid second-order input. */
				() =>
					solveCharacteristicEquation({
						order: 2,
						a2: 1,
						a1: 1,
						a0: value,
					}),
			).toThrow("ODE coefficients must be finite");
		}
	});

	/** Checks root classifications and values against analytically equivalent equations. */
	it("preserves first-order, distinct, repeated, and complex roots at every scale", () => {
		for (const coefficients of [
			{ order: 1, a1: 1, a0: 1 },
			{ order: 2, a2: 1, a1: 5, a0: 6 },
			{ order: 2, a2: 1, a1: 4, a0: 4 },
			{ order: 2, a2: 1, a1: 2, a0: 5 },
		] satisfies CharacteristicEquationCoefficients[]) {
			const reference = solveCharacteristicEquation(coefficients);
			for (const scale of scales) {
				const scaled = scaleEquation(coefficients, scale);
				const actual = solveCharacteristicEquation(scaled);
				expect(actual.rootType).toBe(reference.rootType);
				expect(actual.a1).toBe(scaled.a1);
				expect(actual.a0).toBe(scaled.a0);
				expect(actual.roots.r1).toBeCloseTo(reference.roots.r1, 10);
				if (actual.order === 2 && reference.order === 2) {
					expect(actual.roots.r2 ?? 0).toBeCloseTo(
						reference.roots.r2 ?? 0,
						10,
					);
					expect(actual.roots.im ?? 0).toBeCloseTo(
						reference.roots.im ?? 0,
						10,
					);
				}
			}
		}
	});

	/** Tests amplitudes and ODE residuals for nonresonant and resonant forcing. */
	it("preserves particular solutions and normalized ODE residuals across forcing types", () => {
		const cases: ParticularCase[] = [
			{
				coefficients: { order: 1, a1: 1, a0: 1 },
				forcing: { type: "constant", K: 4, latex: "4" },
			},
			{
				coefficients: { order: 1, a1: 2, a0: 4 },
				forcing: { type: "sinusoid", K: 3, omega: 2, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 5, a0: 6 },
				forcing: { type: "exponential", K: 10, p: -1, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 5, a0: 6 },
				forcing: { type: "exponential", K: 10, p: -2, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 4, a0: 4 },
				forcing: { type: "exponential", K: 6, p: -2, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 5, a0: 6 },
				forcing: { type: "sinusoid", K: 3, omega: 2, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 0, a0: 4 },
				forcing: { type: "sinusoid", K: 6, omega: 2, latex: "" },
			},
			{
				coefficients: { order: 2, a2: 1, a1: 0, a0: 0 },
				forcing: { type: "constant", K: 6, latex: "" },
			},
		];
		for (const { coefficients, forcing } of cases) {
			const reference = computeParticularSolution(
				solveCharacteristicEquation(coefficients),
				forcing,
			);
			for (const scale of scales) {
				const ode = solveCharacteristicEquation(
					scaleEquation(coefficients, scale),
				);
				const actual = computeParticularSolution(ode, {
					...forcing,
					K: forcing.K * scale,
				});
				expect(actual.resonanceMultiplicity).toBe(
					reference.resonanceMultiplicity,
				);
				for (const t of [0, 0.17, 0.5, 1]) {
					expect(actual.eval(t)).toBeCloseTo(reference.eval(t), 8);
					expect(actual.evalDeriv(t)).toBeCloseTo(
						reference.evalDeriv(t),
						8,
					);
					const second =
						(actual.evalDeriv(t + 1e-5) -
							actual.evalDeriv(t - 1e-5)) /
						2e-5;
					const input =
						forcing.K *
						(forcing.type === "constant"
							? 1
							: forcing.type === "exponential"
								? Math.exp(forcing.p! * t)
								: Math.cos(forcing.omega! * t));
					const residual =
						(ode.a2 * second +
							ode.a1 * actual.evalDeriv(t) +
							ode.a0 * actual.eval(t)) /
							scale -
						input;
					expect(Math.abs(residual)).toBeLessThan(1e-5);
				}
			}
		}
	});

	/** Reproduces the public generator failure without relying on rendered coefficients. */
	it("preserves generated initial conditions and response under small leading coefficients", () => {
		const reference = generateOdeProblem({
			order: 1,
			forcingType: "constant",
			leadingCoefficient: 1,
			resonance: "none",
			seed: 1,
		});
		for (const scale of scales) {
			const problem = generateOdeProblem({
				order: 1,
				forcingType: "constant",
				leadingCoefficient: scale,
				resonance: "none",
				seed: 1,
			});
			expect(problem.evalComplete(0)).toBeCloseTo(
				problem.initialConditions.y0,
				10,
			);
			for (const t of [0.17, 0.5, 1]) {
				expect(problem.evalComplete(t)).toBeCloseTo(
					reference.evalComplete(t),
					8,
				);
				const derivative =
					(problem.evalComplete(t + 1e-5) -
						problem.evalComplete(t - 1e-5)) /
					2e-5;
				expect(
					Math.abs(
						(problem.params.a1 * derivative +
							problem.params.a0 * problem.evalComplete(t) -
							problem.forcing.K) /
							scale,
					),
				).toBeLessThan(1e-6);
			}
		}
	});

	/** Ensures a small nonzero damping coefficient is never treated as exact resonance. */
	it("solves lightly damped sinusoidal forcing without a false resonance error", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 1e-6,
			a0: 4,
		});
		const particular = computeParticularSolution(ode, {
			type: "sinusoid",
			K: 6,
			omega: 2,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(0);
		expect(particular.coeffs.A).toBe(0);
		expect(particular.coeffs.B).toBeCloseTo(3e6, 4);
	});
});
