import { describe, expect, it } from "vitest";
import {
	computeParticularSolution,
	solveCharacteristicEquation,
} from "$lib/math-engine/odes/index";
import { divideByProduct } from "$lib/math-engine/odes/scaled-arithmetic";

/** Registers mathematical regressions for finite results near floating-point limits. */
describe("ODE finite numeric limits", () => {
	/** Preserves callback compatibility for nonfinite sampling times without scaled-decomposition exceptions. */
	it("retains IEEE callback behavior at nonfinite evaluation times", () => {
		const ode = solveCharacteristicEquation({ order: 1, a1: 1, a0: 1 });
		const response = computeParticularSolution(ode, {
			type: "constant",
			K: 1,
			latex: "",
		});
		for (const t of [
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		]) {
			expect(Number.isNaN(response.eval(t))).toBe(true);
			expect(Number.isNaN(response.evalDeriv(t))).toBe(true);
		}
	});

	/** Keeps a genuinely nonzero original residual after decimal coefficient scaling introduces rounding. */
	it("does not invent exact resonance from rounded monic ratios", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1e-100,
			a1: -1e308 * 1e-100,
			a0: 0,
		});
		const response = computeParticularSolution(ode, {
			type: "exponential",
			K: 1e-100,
			p: 1e308,
			latex: "",
		});
		expect(response.resonanceMultiplicity).toBe(0);
		expect(Math.abs(response.coeffs.Kp!)).toBe(0);
	});

	/** Checks exact classification before division by a non-dyadic leading coefficient. */
	it("classifies non-monic repeated roots and resonance from original coefficients", () => {
		const repeated = solveCharacteristicEquation({
			order: 2,
			a2: 9,
			a1: 6,
			a0: 1,
		});
		expect(repeated.rootType).toBe("repeated_real");
		expect(repeated.roots.r1).toBe(-1 / 3);
		const resonant = computeParticularSolution(
			solveCharacteristicEquation({ order: 2, a2: 3, a1: 4, a0: 1 }),
			{ type: "exponential", K: 1, p: -1, latex: "" },
		);
		expect(resonant.resonanceMultiplicity).toBe(1);
		expect(resonant.coeffs.Kp).toBe(-0.5);
		const extreme = solveCharacteristicEquation({
			order: 2,
			a2: 2 ** 1023,
			a1: 0,
			a0: -Number.MIN_VALUE,
		});
		const expected = Math.SQRT1_2 * 2 ** -1048;
		expect(extreme.rootType).toBe("distinct_real");
		expect(extreme.roots.r1 / expected).toBeCloseTo(1, 7);
		expect(extreme.roots.r2! / -expected).toBeCloseTo(1, 7);
	});

	/** Keeps plotting callbacks usable when the coefficient itself is outside the finite range. */
	it("retains IEEE overflow values rather than throwing from response evaluation", () => {
		const response = computeParticularSolution(
			solveCharacteristicEquation({ order: 1, a1: 1, a0: 1e-10 }),
			{ type: "constant", K: 1e308, latex: "" },
		);
		expect(response.coeffs.Kp).toBe(Number.POSITIVE_INFINITY);
		expect(response.eval(0)).toBe(Number.POSITIVE_INFINITY);
		expect(Number.isNaN(response.evalDeriv(0))).toBe(true);
	});

	/** Distinguishes exact small residuals from zero in both root and forcing classification. */
	it("preserves nonzero discriminants and polynomial residuals near large terms", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: -2e8,
			a0: 10000000000000002,
		});
		expect(ode.rootType).toBe("complex_conjugate");
		expect(ode.roots.r1).toBe(1e8);
		expect(ode.roots.im).toBeCloseTo(Math.SQRT2, 12);
		const response = computeParticularSolution(ode, {
			type: "exponential",
			K: 1,
			p: 1e8,
			latex: "",
		});
		expect(response.resonanceMultiplicity).toBe(0);
		expect(response.coeffs.Kp).toBe(0.5);
		const adjacent = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 134217729,
			a0: 4503599694479360,
		});
		expect(adjacent.rootType).toBe("distinct_real");
		expect(adjacent.roots.r1).toBe(-67108864);
		expect(adjacent.roots.r2).toBe(-67108865);
	});

	/** Retains an original coefficient whose normalized ratio is below the binary64 range. */
	it("preserves coefficient contributions lost by monic normalization", () => {
		for (const sign of [1, -1]) {
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: 2 ** 1023,
				a1: sign * 2 ** -1022,
				a0: -2,
			});
			const response = computeParticularSolution(ode, {
				type: "exponential",
				K: 2 ** -1074,
				p: 2 ** -511,
				latex: "",
			});
			expect(response.resonanceMultiplicity).toBe(0);
			expect(response.coeffs.Kp! / (sign * 2 ** 459)).toBe(1);
		}
	});

	/** Checks repeated-resonance evaluations without constructing tiny or huge powers first. */
	it("preserves compensated repeated-resonance values and derivatives", () => {
		for (const { a1, a0, K, p, t, value, derivative } of [
			{
				a1: 1,
				a0: 0.5,
				K: 1e308,
				p: -1,
				t: 1e-308,
				value: 1e-308,
				derivative: 2,
			},
			{
				a1: 0,
				a0: 0,
				K: 1e-300,
				p: 0,
				t: 1e200,
				value: 1e100,
				derivative: 2e-100,
			},
			...[745, 1000].map(
				/** @param t - Time with a subnormal or underflowed exponential before compensation. */
				(t) => {
					const value = Math.exp(
						308 * Math.LN10 + 2 * Math.log(t) - t,
					);
					return {
						a1: 1,
						a0: 0.5,
						K: 1e308,
						p: -1,
						t,
						value,
						derivative: value * (2 / t - 1),
					};
				},
			),
		]) {
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: 0.5,
				a1,
				a0,
			});
			const response = computeParticularSolution(ode, {
				type: "exponential",
				K,
				p,
				latex: "",
			});
			expect(response.resonanceMultiplicity).toBe(2);
			expect(response.eval(t) / value).toBeCloseTo(1, 12);
			expect(response.evalDeriv(t) / derivative).toBeCloseTo(1, 12);
		}
	});

	/** Checks both root orders and signs without masking lost subnormal values with absolute tolerances. */
	it("preserves the smallest representable roots and their ordering", () => {
		for (const b of [
			Number.MIN_VALUE,
			-Number.MIN_VALUE,
			3 * Number.MIN_VALUE,
			-3 * Number.MIN_VALUE,
		]) {
			for (const a2 of [1, 1.5]) {
				const ode = solveCharacteristicEquation({
					order: 2,
					a2,
					a1: b,
					a0: 0,
				});
				expect(ode.rootType).toBe("distinct_real");
				const nonzero = b > 0 ? ode.roots.r2 : ode.roots.r1;
				const zero = b > 0 ? ode.roots.r1 : ode.roots.r2;
				expect(nonzero).toBe(-b / a2);
				expect(Math.abs(zero!)).toBe(0);
				expect(Number.isFinite(ode.roots.r1)).toBe(true);
				expect(Number.isFinite(ode.roots.r2)).toBe(true);
			}
		}
	});

	/** Checks signed zero through the same unmaterialized factors used by the forcing solver. */
	it("preserves signed zero through scaled product division", () => {
		expect(Object.is(divideByProduct(-0, -1, 1e-300, 1e-300), 0)).toBe(
			true,
		);
		expect(Object.is(divideByProduct(0, -1, 1e-300, 1e-300), -0)).toBe(
			true,
		);
	});
	/** Checks finite Horner cancellation even when expanded terms and derivative products overflow. */
	it("preserves exponential resonance when expanded terms overflow", () => {
		for (const scale of [1, -1, 2 ** -300]) {
			for (const p of [1e308, -1e308]) {
				const ode = solveCharacteristicEquation({
					order: 2,
					a2: scale,
					a1: -p * scale,
					a0: 0,
				});
				for (const K of [scale, 0]) {
					const particular = computeParticularSolution(ode, {
						type: "exponential",
						K,
						p,
						latex: "",
					});
					expect(particular.resonanceMultiplicity).toBe(1);
					if (K === 0)
						expect(Math.abs(particular.coeffs.Kp!)).toBe(0);
					else
						expect(particular.coeffs.Kp! / (1 / p)).toBeCloseTo(
							1,
							12,
						);
					expect(Math.abs(particular.eval(0))).toBe(0);
				}
				const nearby = computeParticularSolution(ode, {
					type: "exponential",
					K: scale,
					p: p * 0.9,
					latex: "",
				});
				expect(nearby.resonanceMultiplicity).toBe(0);
				expect(Number.isFinite(nearby.coeffs.Kp)).toBe(true);
			}
		}
	});

	/** Checks small-frequency terms and independent scaled matrix residuals across signs and equation scales. */
	it("preserves harmonic products below the materialized numeric range", () => {
		for (const scale of [1, -1, 1e50]) {
			for (const sign of [1, -1]) {
				const ode = solveCharacteristicEquation({
					order: 2,
					a2: 1e200 * scale,
					a1: 1e100 * scale,
					a0: 0,
				});
				const particular = computeParticularSolution(ode, {
					type: "sinusoid",
					K: 1e-300 * scale,
					omega: sign * 1e-300,
					latex: "",
				});
				const { A = Number.NaN, B = Number.NaN } = particular.coeffs;
				expect(particular.resonanceMultiplicity).toBe(0);
				expect(A / -1e-300).toBeCloseTo(1, 12);
				expect(B / (sign * 1e-100)).toBeCloseTo(1, 12);
				expect((-1e-200 * A + sign * B) / 1e-100).toBeCloseTo(1, 12);
				expect((-sign * A - 1e-200 * B) / 1e-300).toBeCloseTo(0, 12);
				const zero = computeParticularSolution(ode, {
					type: "sinusoid",
					K: 0,
					omega: sign * 1e-300,
					latex: "",
				});
				expect(Math.abs(zero.coeffs.A!)).toBe(0);
				expect(Math.abs(zero.coeffs.B!)).toBe(0);
			}
		}
	});

	/** Ensures the determinant correction is applied before an otherwise overflowing amplitude is materialized. */
	it("preserves finite harmonic coefficients after determinant correction", () => {
		for (const scale of [1, -1, 2]) {
			for (const sign of [1, -1]) {
				const ode = solveCharacteristicEquation({
					order: 1,
					a1: scale,
					a0: 5e-309 * scale,
				});
				const particular = computeParticularSolution(ode, {
					type: "sinusoid",
					K: scale,
					omega: sign * 5e-309,
					latex: "",
				});
				const { A = Number.NaN, B = Number.NaN } = particular.coeffs;
				expect(A / 1e308).toBeCloseTo(1, 12);
				expect(B / (sign * 1e308)).toBeCloseTo(1, 12);
				expect(5e-309 * A + sign * 5e-309 * B).toBeCloseTo(1, 12);
				expect(-sign * 5e-309 * A + 5e-309 * B).toBeCloseTo(0, 12);
				expect(Number.isFinite(particular.eval(0))).toBe(true);
			}
		}
	});

	/** Verifies the quotient remains finite when undoing leading-coefficient normalization. */
	it("preserves finite constant responses across extreme coefficient ratios", () => {
		for (const { a1, a0, K } of [
			{ a1: 1e-308, a0: 1, K: 10 },
			{ a1: -1e-308, a0: -1, K: -10 },
			{ a1: 1e308, a0: 1, K: 1e-308 },
			{ a1: 1e-200, a0: 1e-320, K: 1e-308 },
		]) {
			const ode = solveCharacteristicEquation({ order: 1, a1, a0 });
			const particular = computeParticularSolution(ode, {
				type: "constant",
				K,
				latex: "",
			});
			const expected = K / a0;
			expect(Number.isFinite(particular.coeffs.Kp)).toBe(true);
			expect(particular.coeffs.Kp! / expected).toBeCloseTo(1, 12);
			expect(particular.eval(0) / expected).toBeCloseTo(1, 12);
			expect(particular.evalDeriv(0)).toBe(0);
			if (expected === 10) expect(particular.latex).toBe("10");
		}
	});

	/** Checks the same forcing rescaling in the harmonic solver. */
	it("preserves finite harmonic amplitudes when the normalized forcing would overflow", () => {
		const ode = solveCharacteristicEquation({
			order: 1,
			a1: 1e-308,
			a0: 1,
		});
		const particular = computeParticularSolution(ode, {
			type: "sinusoid",
			K: 10,
			omega: 1,
			latex: "",
		});
		expect(particular.coeffs.A).toBeCloseTo(10, 12);
		expect(particular.coeffs.B! / 1e-307).toBeCloseTo(1, 12);
		expect(particular.eval(0)).toBeCloseTo(10, 12);
		expect(Number.isFinite(particular.evalDeriv(0))).toBe(true);
	});

	/** Exercises a finite quotient whose original polynomial denominator exceeds the numeric range. */
	it("preserves a finite exponential coefficient when denominator factors overflow their product", () => {
		const ode = solveCharacteristicEquation({
			order: 1,
			a1: 1e200,
			a0: 1e200,
		});
		const particular = computeParticularSolution(ode, {
			type: "exponential",
			K: 1e200,
			p: 1e200,
			latex: "",
		});
		expect(particular.coeffs.Kp! / 1e-200).toBeCloseTo(1, 12);
		expect(particular.eval(0) / 1e-200).toBeCloseTo(1, 12);
		expect(particular.evalDeriv(0)).toBeCloseTo(1, 12);
	});

	/** Checks the original finite quotient when monic normalization overflows its polynomial. */
	it("preserves finite exponential amplitudes when the normalized polynomial overflows", () => {
		for (const { scale, K, p, expected } of [
			{ scale: 1e-200, K: 1e200, p: 1e200, expected: 1 },
			{ scale: -1e-200, K: -1e200, p: -1e200, expected: 1 },
			{ scale: 1e200, K: 1e300, p: 1e200, expected: 1e-300 },
		]) {
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: scale,
				a1: 0,
				a0: scale,
			});
			const particular = computeParticularSolution(ode, {
				type: "exponential",
				K,
				p,
				latex: "",
			});
			expect(particular.resonanceMultiplicity).toBe(0);
			expect(particular.coeffs.Kp! / expected).toBeCloseTo(1, 12);
			expect(particular.eval(0) / expected).toBeCloseTo(1, 12);
			expect(particular.evalDeriv(0) / (p * expected)).toBeCloseTo(1, 12);
		}
	});

	/** Checks finite first-order responses when adding large polynomial terms overflows. */
	it("scales large first-order polynomial terms before adding them", () => {
		const ode = solveCharacteristicEquation({ order: 1, a1: 1, a0: 1e308 });
		const particular = computeParticularSolution(ode, {
			type: "exponential",
			K: 1e308,
			p: 1e308,
			latex: "",
		});
		expect(particular.coeffs.Kp).toBeCloseTo(0.5, 12);
		expect(particular.eval(0)).toBeCloseTo(0.5, 12);
		expect(particular.evalDeriv(0) / 5e307).toBeCloseTo(1, 12);
	});

	/** Keeps a zero root distinct from a small nonzero root even when squaring underflows. */
	it("preserves distinct roots when a tiny linear coefficient has an underflowing square", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1e300,
			a1: 1e130,
			a0: 0,
		});
		expect(ode.rootType).toBe("distinct_real");
		expect(Math.abs(ode.roots.r1)).toBe(0);
		expect(ode.roots.r2! / -1e-170).toBeCloseTo(1, 12);
	});

	/** Verifies small complex roots against their analytic angular frequency. */
	it("preserves complex roots when the discriminant magnitude is subnormal", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: 1e-320,
		});
		expect(ode.rootType).toBe("complex_conjugate");
		expect(ode.roots.im! / Math.sqrt(1e-320)).toBeCloseTo(1, 12);
	});

	/** Checks exact exponential resonance without overflowing the cancellation bound. */
	it("recognizes resonance when the absolute polynomial terms overflow their sum", () => {
		const p = 3 * 2 ** 510;
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: -9 * 2 ** 1020,
		});
		const particular = computeParticularSolution(ode, {
			type: "exponential",
			K: 1,
			p,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(1);
		expect(particular.coeffs.Kp! / (1 / (2 * p))).toBeCloseTo(1, 12);
		expect(particular.eval(0)).toBe(0);
		expect(particular.evalDeriv(0) / (1 / (2 * p))).toBeCloseTo(1, 12);
	});

	/** Retains the exact nonzero difference between an overflowing square and the largest finite value. */
	it("preserves a nonzero near-root residual after an overflowing polynomial evaluation", () => {
		const p = 2 ** 512;
		expect(p * p).toBe(Number.POSITIVE_INFINITY);
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: -Number.MAX_VALUE,
		});
		const particular = computeParticularSolution(ode, {
			type: "exponential",
			K: 1,
			p,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(0);
		expect(particular.coeffs.Kp! / 2 ** -971).toBe(1);
	});

	/** Checks scaled harmonic amplitudes and exact nonzero boundary determinants. */
	it("scales overflowing harmonic polynomials and preserves resonance decisions", () => {
		for (const boundary of [false, true]) {
			const scale = boundary ? 1 : 1e-200;
			const omega = boundary ? 2 ** 512 : 1e200;
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: scale,
				a1: 0,
				a0: boundary ? Number.MAX_VALUE : scale,
			});
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: boundary ? 1 : 1e200,
				omega,
				latex: "",
			});
			expect(particular.resonanceMultiplicity).toBe(0);
			if (boundary) {
				expect(particular.coeffs.A! / -(2 ** -971)).toBe(1);
				expect(Math.abs(particular.coeffs.B!)).toBe(0);
			} else {
				expect(particular.coeffs.A).toBeCloseTo(-1, 12);
				expect(particular.eval(0)).toBeCloseTo(-1, 12);
			}
		}
	});

	/** Checks harmonic cancellation with the same large-term magnitude bound. */
	it("recognizes sinusoidal resonance when the frequency terms overflow their sum", () => {
		const omega = 3 * 2 ** 510;
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: 9 * 2 ** 1020,
		});
		const particular = computeParticularSolution(ode, {
			type: "sinusoid",
			K: 1,
			omega,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(1);
		expect(particular.coeffs.B! / (1 / (2 * omega))).toBeCloseTo(1, 12);
		expect(particular.eval(0)).toBe(0);
		expect(particular.evalDeriv(0)).toBe(0);
	});
});
