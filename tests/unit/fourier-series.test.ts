/**
 * Unit Test Suite for Fourier Series Math Engine (TDD Phase 1 - RED).
 * Tests trigonometric & exponential coefficient calculations, partial sums, Parseval power, and problem generator.
 */

import { describe, expect, it } from "vitest";
import {
	computeFourierCoefficients,
	computeHarmonicPowerThresholds,
	computePartialSum,
	computeSignalPower,
	evaluateFourierWaveform,
	FOURIER_WAVEFORM_TYPES,
	generateFourierSeriesProblem,
	isFourierWaveformType,
} from "$lib/math-engine/fourier-series";

describe("Fourier Series Math Engine", () => {
	describe("Coefficient Calculator & Symmetry Identifiers", () => {
		it("calculates coefficients for Square Wave (Odd Symmetry, a0=0, an=0)", () => {
			// Square wave amplitude A=1, period T0=2, w0=pi
			// b_n = 4A / (n pi) for odd n, 0 for even n
			const coeffs = computeFourierCoefficients("square", {
				A: 1,
				T0: 2,
			});
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
			const coeffs = computeFourierCoefficients("triangle", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(8 / (Math.PI * Math.PI), 4);
			expect(coeffs.an(2)).toBe(0);
		});

		it("calculates coefficients for Sawtooth Wave (Odd Symmetry, a0=0)", () => {
			// Sawtooth amplitude A=1, period T0=2
			// b_n = 2A / (n pi) (-1)^{n+1}
			const coeffs = computeFourierCoefficients("sawtooth", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("odd");
			expect(coeffs.bn(1)).toBeCloseTo(2 / Math.PI, 4);
			expect(coeffs.bn(2)).toBeCloseTo(-2 / (2 * Math.PI), 4);
		});

		it("calculates coefficients for Half-Wave Rectified Sine", () => {
			// Half-wave rectified sine A=1, T0=2pi (w0=1)
			// a0 = 2 / pi, so the DC component a0 / 2 = 1 / pi
			// a_1 = 0, a_n = 2 / (pi (1 - n^2)) for even n
			// b_1 = 1 / 2, b_n = 0 for n >= 2
			const coeffs = computeFourierCoefficients("half_wave_sine", {
				A: 1,
				T0: 2 * Math.PI,
			});
			expect(coeffs.a0).toBeCloseTo(2 / Math.PI, 4);
			expect(coeffs.Fn(0).re).toBeCloseTo(1 / Math.PI, 4);
			expect(coeffs.bn(1)).toBeCloseTo(0.5, 4);
			expect(coeffs.bn(2)).toBe(0);
			expect(coeffs.an(2)).toBeCloseTo(2 / (Math.PI * (1 - 4)), 4);
		});
		it("calculates coefficients for Even Square Wave (Even Symmetry, bn=0)", () => {
			const coeffs = computeFourierCoefficients("square_even", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.hasHalfWaveSymmetry).toBe(true);
		});

		it("calculates coefficients for Full-Wave Rectified Sine (Even Symmetry)", () => {
			const coeffs = computeFourierCoefficients("full_wave_sine", {
				A: 1,
				T0: Math.PI,
			});
			expect(coeffs.a0).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.symmetry).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(-4 / (3 * Math.PI), 4);
			expect(coeffs.hasHalfWaveSymmetry).toBe(false);
		});

		it("models origin parity and half-wave symmetry independently", () => {
			const square = computeFourierCoefficients("square", {
				A: 1,
				T0: 2,
			});
			const sawtooth = computeFourierCoefficients("sawtooth", {
				A: 1,
				T0: 2,
			});

			expect(square.originParity).toBe("odd");
			expect(square.hasHalfWaveSymmetry).toBe(true);
			expect(sawtooth.originParity).toBe("odd");
			expect(sawtooth.hasHalfWaveSymmetry).toBe(false);
		});

		it("uses canonical F_n notation for exponential coefficients", () => {
			const coeffs = computeFourierCoefficients("square", {
				A: 1,
				T0: 2,
			});

			expect(coeffs.Fn(-1).re).toBeCloseTo(coeffs.Fn(1).re, 12);
			expect(coeffs.Fn(-1).im).toBeCloseTo(-coeffs.Fn(1).im, 12);
			expect(coeffs.Fn(0)).toEqual({ re: 0, im: 0 });
		});
	});

	describe("Partial Sum Evaluator", () => {
		it("evaluates N-harmonic partial sum for square wave at t = 0.5s", () => {
			const coeffs = computeFourierCoefficients("square", {
				A: 1,
				T0: 2,
			});
			// At t = 0.5, sin(pi*0.5) = 1 => 4/pi * 1 - 4/(3pi)*1 + 4/(5pi)*1 ...
			const sumN1 = computePartialSum(coeffs, 1, 0.5);
			expect(sumN1).toBeCloseTo(4 / Math.PI, 4);

			const sumN5 = computePartialSum(coeffs, 5, 0.5);
			// Approaching amplitude 1.0 (with Gibbs overshoot around discontinuity)
			expect(sumN5).toBeGreaterThan(0.9);
		});
	});

	describe("Ideal Waveform Evaluator", () => {
		it("evaluates waveform aliases and shifted variants consistently", () => {
			const square = computeFourierCoefficients("square", {
				A: 2,
				T0: 4,
			});
			const squareOdd = computeFourierCoefficients("square_odd", {
				A: 2,
				T0: 4,
			});
			const triangleOdd = computeFourierCoefficients("triangle_odd", {
				A: 1,
				T0: 4,
			});

			expect(evaluateFourierWaveform(square, 0.5)).toBe(2);
			expect(evaluateFourierWaveform(squareOdd, 0.5)).toBe(2);
			expect(evaluateFourierWaveform(triangleOdd, 0)).toBeCloseTo(0, 12);
			expect(evaluateFourierWaveform(triangleOdd, 0.5)).toBeCloseTo(
				0.5,
				12,
			);
		});

		it("uses T0 as the fundamental period of the full-wave sine", () => {
			const coeffs = computeFourierCoefficients("full_wave_sine", {
				A: 3,
				T0: 4,
			});

			expect(evaluateFourierWaveform(coeffs, 0)).toBe(0);
			expect(evaluateFourierWaveform(coeffs, 2)).toBeCloseTo(3, 12);
			expect(evaluateFourierWaveform(coeffs, 4)).toBeCloseTo(0, 12);
		});
	});

	describe("Parseval Power Calculator", () => {
		it("computes total signal power and N-harmonic power fraction for square wave", () => {
			const coeffs = computeFourierCoefficients("square", {
				A: 1,
				T0: 2,
			});
			const power = computeSignalPower(coeffs, 5);
			// Total power of unit square wave = 1.0
			expect(power.totalPower).toBeCloseTo(1.0, 4);
			// Power in first 5 harmonics ~ 95%+
			expect(power.harmonicPower).toBeGreaterThan(0.9);
			expect(power.powerRatio).toBeGreaterThan(0.9);
		});

		it("includes the a0/2 DC contribution for rectified waveforms", () => {
			const coeffs = computeFourierCoefficients("half_wave_sine", {
				A: 2,
				T0: 4,
			});
			const dcOnly = computeSignalPower(coeffs, 0);

			expect(dcOnly.totalPower).toBeCloseTo(1, 12);
			expect(dcOnly.harmonicPower).toBeCloseTo(
				4 / (Math.PI * Math.PI),
				12,
			);
		});

		it.each(FOURIER_WAVEFORM_TYPES)(
			"finds minimal 90/95/99 percent thresholds for %s",
			(waveformType) => {
				const coeffs = computeFourierCoefficients(waveformType, {
					A: 1,
					T0: 2,
				});
				const thresholds = computeHarmonicPowerThresholds(coeffs);

				for (const [target, harmonicLimit] of [
					[0.9, thresholds.n90],
					[0.95, thresholds.n95],
					[0.99, thresholds.n99],
				] as const) {
					expect(
						computeSignalPower(coeffs, harmonicLimit).powerRatio,
					).toBeGreaterThanOrEqual(target);
					if (harmonicLimit > 0) {
						expect(
							computeSignalPower(coeffs, harmonicLimit - 1)
								.powerRatio,
						).toBeLessThan(target);
					}
				}
			},
		);

		it("rejects an invalid threshold search limit", () => {
			const coeffs = computeFourierCoefficients("square");
			expect(() => computeHarmonicPowerThresholds(coeffs, 0)).toThrow(
				RangeError,
			);
		});
	});

	describe("Input Validation", () => {
		it("validates waveform identifiers", () => {
			expect(isFourierWaveformType("triangle_odd")).toBe(true);
			expect(isFourierWaveformType("not-a-waveform")).toBe(false);
		});

		it("rejects invalid physical parameters and harmonic counts", () => {
			expect(() =>
				computeFourierCoefficients("square", { A: 0, T0: 2 }),
			).toThrow(RangeError);
			const coeffs = computeFourierCoefficients("square");
			expect(() => computePartialSum(coeffs, -1, 0)).toThrow(RangeError);
			expect(() => coeffs.Fn(0.5)).toThrow(RangeError);
		});
	});

	describe("Problem Generator", () => {
		it("reproduces parameters and shuffled options from a seed", () => {
			const first = generateFourierSeriesProblem("square", { seed: 42 });
			const second = generateFourierSeriesProblem("square", { seed: 42 });

			expect(first.id).toBe("fs_square_42");
			expect(second.coeffs.A).toBe(first.coeffs.A);
			expect(second.coeffs.T0).toBe(first.coeffs.T0);
			expect(second.itsData.step5.parts).toEqual(
				first.itsData.step5.parts,
			);
			expect(second.itsData.step6.parts).toEqual(
				first.itsData.step6.parts,
			);
			expect(second.itsData.step7.options).toEqual(
				first.itsData.step7.options,
			);
		});

		it("generates a valid Fourier series problem for square wave", () => {
			const problem = generateFourierSeriesProblem("square");
			expect(problem.waveformType).toBe("square");
			expect(problem.title).toBeDefined();
			expect(problem.a0Latex).toBeDefined();
			expect(problem.anLatex).toBeDefined();
			expect(problem.bnLatex).toBeDefined();
			expect(problem.solutionSteps).toHaveLength(7);
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
