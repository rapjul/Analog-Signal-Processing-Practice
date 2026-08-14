/**
 * Unit Test Suite for Fourier Series Math Engine (TDD Phase 1 - RED).
 * Tests trigonometric & exponential coefficient calculations, partial sums, Parseval power, and problem generator.
 */

import { describe, expect, it } from "vitest";
import {
	computeFourierCoefficients,
	computePartialSum,
	computeSignalPower,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series";

describe("Fourier Series Math Engine", () => {
	describe("Coefficient Calculator & Symmetry Identifiers", () => {
		it("calculates coefficients for Square Wave (Odd Symmetry, a0=0, an=0)", () => {
			// Square wave amplitude A=1, period T0=2, w0=pi
			// b_n = 4A / (n pi) for odd n, 0 for even n
			const coeffs = computeFourierCoefficients("square", { A: 1, T0: 2 });
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("odd");
			expect(coeffs.an(1)).toBe(0);
			expect(coeffs.an(2)).toBe(0);
			expect(coeffs.bn(1)).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.bn(2)).toBe(0);
			expect(coeffs.bn(3)).toBeCloseTo(4 / (3 * Math.PI), 4);
		});

		it("calculates coefficients for Triangle Wave (Even Symmetry, a0=0, bn=0)", () => {
			// Triangle wave amplitude A=1, period T0=2
			// a_n = 8A / (n^2 pi^2) for odd n, 0 for even n
			const coeffs = computeFourierCoefficients("triangle", { A: 1, T0: 2 });
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(8 / (Math.PI * Math.PI), 4);
			expect(coeffs.an(2)).toBe(0);
		});

		it("calculates coefficients for Sawtooth Wave (Odd Symmetry, a0=0)", () => {
			// Sawtooth amplitude A=1, period T0=2
			// b_n = 2A / (n pi) (-1)^{n+1}
			const coeffs = computeFourierCoefficients("sawtooth", { A: 1, T0: 2 });
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("odd");
			expect(coeffs.bn(1)).toBeCloseTo(2 / Math.PI, 4);
			expect(coeffs.bn(2)).toBeCloseTo(-2 / (2 * Math.PI), 4);
		});

		it("calculates coefficients for Half-Wave Rectified Sine", () => {
			// Half-wave rectified sine A=1, T0=2pi (w0=1)
			// a0 = 1 / pi
			// a_1 = 0, a_n = 2 / (pi (1 - n^2)) for even n
			// b_1 = 1 / 2, b_n = 0 for n >= 2
			const coeffs = computeFourierCoefficients("half_wave_sine", { A: 1, T0: 2 * Math.PI });
			expect(coeffs.a0).toBeCloseTo(1 / Math.PI, 4);
			expect(coeffs.bn(1)).toBeCloseTo(0.5, 4);
			expect(coeffs.bn(2)).toBe(0);
			expect(coeffs.an(2)).toBeCloseTo(2 / (Math.PI * (1 - 4)), 4);
		});
		it("calculates coefficients for Even Square Wave (Even Symmetry, bn=0)", () => {
			const coeffs = computeFourierCoefficients("square_even", { A: 1, T0: 2 });
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(4 / Math.PI, 4);
		});

		it("calculates coefficients for Full-Wave Rectified Sine (Even Symmetry)", () => {
			const coeffs = computeFourierCoefficients("full_wave_sine", { A: 1, T0: Math.PI });
			expect(coeffs.a0).toBeCloseTo(2 / Math.PI, 4);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
		});
	});

	describe("Partial Sum Evaluator", () => {
		it("evaluates N-harmonic partial sum for square wave at t = 0.5s", () => {
			const coeffs = computeFourierCoefficients("square", { A: 1, T0: 2 });
			// At t = 0.5, sin(pi*0.5) = 1 => 4/pi * 1 - 4/(3pi)*1 + 4/(5pi)*1 ...
			const sumN1 = computePartialSum(coeffs, 1, 0.5);
			expect(sumN1).toBeCloseTo(4 / Math.PI, 4);

			const sumN5 = computePartialSum(coeffs, 5, 0.5);
			// Approaching amplitude 1.0 (with Gibbs overshoot around discontinuity)
			expect(sumN5).toBeGreaterThan(0.9);
		});
	});

	describe("Parseval Power Calculator", () => {
		it("computes total signal power and N-harmonic power fraction for square wave", () => {
			const coeffs = computeFourierCoefficients("square", { A: 1, T0: 2 });
			const power = computeSignalPower(coeffs, 5);
			// Total power of unit square wave = 1.0
			expect(power.totalPower).toBeCloseTo(1.0, 4);
			// Power in first 5 harmonics ~ 95%+
			expect(power.harmonicPower).toBeGreaterThan(0.9);
			expect(power.powerRatio).toBeGreaterThan(0.9);
		});
	});

	describe("Problem Generator", () => {
		it("generates a valid Fourier series problem for square wave", () => {
			const problem = generateFourierSeriesProblem("square");
			expect(problem.waveformType).toBe("square");
			expect(problem.title).toBeDefined();
			expect(problem.a0Latex).toBeDefined();
			expect(problem.anLatex).toBeDefined();
			expect(problem.bnLatex).toBeDefined();
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid Fourier series problem for triangle wave", () => {
			const problem = generateFourierSeriesProblem("triangle");
			expect(problem.waveformType).toBe("triangle");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});

		it("generates a valid Fourier series problem for square_even wave", () => {
			const problem = generateFourierSeriesProblem("square_even");
			expect(problem.waveformType).toBe("square_even");
			expect(problem.coeffs.symmetry).toBe("even");
		});
	});
});

