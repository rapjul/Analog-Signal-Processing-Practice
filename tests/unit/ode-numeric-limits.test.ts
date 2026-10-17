import { describe, expect, it } from "vitest";
import {
	computeParticularSolution,
	solveCharacteristicEquation,
} from "$lib/math-engine/odes/index";

/** Registers mathematical regressions for finite results near floating-point limits. */
describe("ODE finite numeric limits", () => {
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
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: -1e308,
		});
		const particular = computeParticularSolution(ode, {
			type: "exponential",
			K: 1,
			p: 1e154,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(1);
		expect(particular.coeffs.Kp! / (1 / 2e154)).toBeCloseTo(1, 12);
		expect(particular.eval(0)).toBe(0);
		expect(particular.evalDeriv(0) / (1 / 2e154)).toBeCloseTo(1, 12);
	});

	/** Applies the same relative resonance tolerance after scaling near the finite numeric limit. */
	it("detects near-root cancellation after an overflowing polynomial evaluation", () => {
		const p = Math.sqrt(Number.MAX_VALUE) * (1 + Number.EPSILON);
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
		expect(particular.resonanceMultiplicity).toBe(1);
		expect(particular.coeffs.Kp! / (1 / (2 * p))).toBeCloseTo(1, 12);
	});

	/** Checks scaled harmonic amplitudes and near-root cancellation after frequency squaring overflows. */
	it("scales overflowing harmonic polynomials and preserves resonance decisions", () => {
		for (const resonant of [false, true]) {
			const scale = resonant ? 1 : 1e-200;
			const omega = resonant
				? Math.sqrt(Number.MAX_VALUE) * (1 + Number.EPSILON)
				: 1e200;
			const ode = solveCharacteristicEquation({
				order: 2,
				a2: scale,
				a1: 0,
				a0: resonant ? Number.MAX_VALUE : scale,
			});
			const particular = computeParticularSolution(ode, {
				type: "sinusoid",
				K: resonant ? 1 : 1e200,
				omega,
				latex: "",
			});
			expect(particular.resonanceMultiplicity).toBe(resonant ? 1 : 0);
			if (resonant) {
				expect(particular.coeffs.B! / (1 / (2 * omega))).toBeCloseTo(
					1,
					12,
				);
			} else {
				expect(particular.coeffs.A).toBeCloseTo(-1, 12);
				expect(particular.eval(0)).toBeCloseTo(-1, 12);
			}
		}
	});

	/** Checks harmonic cancellation with the same large-term magnitude bound. */
	it("recognizes sinusoidal resonance when the frequency terms overflow their sum", () => {
		const ode = solveCharacteristicEquation({
			order: 2,
			a2: 1,
			a1: 0,
			a0: 1e308,
		});
		const particular = computeParticularSolution(ode, {
			type: "sinusoid",
			K: 1,
			omega: 1e154,
			latex: "",
		});
		expect(particular.resonanceMultiplicity).toBe(1);
		expect(particular.coeffs.B! / (1 / 2e154)).toBeCloseTo(1, 12);
		expect(particular.eval(0)).toBe(0);
		expect(particular.evalDeriv(0)).toBe(0);
	});
});
