/**
 * Unit Test Suite for Fourier Series Math Engine (TDD Phase 1 - RED).
 * Tests trigonometric & exponential coefficient calculations, partial sums, Parseval power, and problem generator.
 */

import { describe, expect, it } from "vitest";
import {
	computeFourierSeriesCoefficients,
	computeHarmonicPowerThresholds,
	computePartialSum,
	computeSignalPower,
	evaluateFourierSeriesWaveform,
	FOURIER_SERIES_WAVEFORM_TYPES,
	formatPowerCapturePercent,
	generateFourierSeriesProblem,
	isFourierSeriesWaveformType,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier Series Math Engine", () => {
	describe("Coefficient Calculator & Symmetry Identifiers", () => {
		it("calculates coefficients for Square Wave (Odd Symmetry, a0=0, an=0)", () => {
			// Square wave amplitude A=1, period T0=2, w0=pi
			// b_n = 4A / (n pi) for odd n, 0 for even n
			const coeffs = computeFourierSeriesCoefficients("square", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.originParity).toBe("odd");
			expect(coeffs.an(1)).toBe(0);
			expect(coeffs.an(2)).toBe(0);
			expect(coeffs.bn(1)).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.bn(2)).toBe(0);
			expect(coeffs.bn(3)).toBeCloseTo(4 / (3 * Math.PI), 4);
		});

		it("calculates coefficients for Triangle Wave (Even Symmetry, a0=0, bn=0)", () => {
			// Triangle wave amplitude A=1, period T0=2
			// a_n = 8A / (n^2 pi^2) for odd n, 0 for even n
			const coeffs = computeFourierSeriesCoefficients("triangle", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.originParity).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(8 / (Math.PI * Math.PI), 4);
			expect(coeffs.an(2)).toBe(0);
		});

		it("calculates coefficients for Sawtooth Wave (Odd Symmetry, a0=0)", () => {
			// Sawtooth amplitude A=1, period T0=2
			// b_n = 2A / (n pi) (-1)^{n+1}
			const coeffs = computeFourierSeriesCoefficients("sawtooth", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.originParity).toBe("odd");
			expect(coeffs.bn(1)).toBeCloseTo(2 / Math.PI, 4);
			expect(coeffs.bn(2)).toBeCloseTo(-2 / (2 * Math.PI), 4);
		});

		it("calculates coefficients for Half-Wave Rectified Sine", () => {
			// Half-wave rectified sine A=1, T0=2pi (w0=1)
			// a0 = 2 / pi, so the DC component a0 / 2 = 1 / pi
			// a_1 = 0, a_n = 2 / (pi (1 - n^2)) for even n
			// b_1 = 1 / 2, b_n = 0 for n >= 2
			const coeffs = computeFourierSeriesCoefficients("half_wave_sine", {
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
			const coeffs = computeFourierSeriesCoefficients("square_even", {
				A: 1,
				T0: 2,
			});
			expect(coeffs.a0).toBe(0);
			expect(coeffs.originParity).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.hasHalfWaveSymmetry).toBe(true);
		});

		it("calculates coefficients for Full-Wave Rectified Sine (Even Symmetry)", () => {
			const coeffs = computeFourierSeriesCoefficients("full_wave_sine", {
				A: 1,
				T0: Math.PI,
			});
			expect(coeffs.a0).toBeCloseTo(4 / Math.PI, 4);
			expect(coeffs.originParity).toBe("even");
			expect(coeffs.bn(1)).toBe(0);
			expect(coeffs.an(1)).toBeCloseTo(-4 / (3 * Math.PI), 4);
			expect(coeffs.hasHalfWaveSymmetry).toBe(false);
		});

		it("models origin parity and half-wave symmetry independently", () => {
			const square = computeFourierSeriesCoefficients("square", {
				A: 1,
				T0: 2,
			});
			const sawtooth = computeFourierSeriesCoefficients("sawtooth", {
				A: 1,
				T0: 2,
			});

			expect(square.originParity).toBe("odd");
			expect(square.hasHalfWaveSymmetry).toBe(true);
			expect(sawtooth.originParity).toBe("odd");
			expect(sawtooth.hasHalfWaveSymmetry).toBe(false);
		});

		it("uses canonical F_n notation for exponential coefficients", () => {
			const coeffs = computeFourierSeriesCoefficients("square", {
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
			const coeffs = computeFourierSeriesCoefficients("square", {
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

		it("evaluates cosine, sine, and DC contribution branches", () => {
			const even = computeFourierSeriesCoefficients("square_even", {
				A: 2,
				T0: 2,
			});
			const rectified = computeFourierSeriesCoefficients(
				"half_wave_sine",
				{
					A: 2,
					T0: 2,
				},
			);
			expect(computePartialSum(even, 1, 0)).toBeCloseTo(8 / Math.PI, 12);
			expect(computePartialSum(rectified, 0, 0)).toBeCloseTo(
				2 / Math.PI,
				12,
			);
		});
	});

	describe("Ideal Waveform Evaluator", () => {
		it("evaluates waveform aliases and shifted variants consistently", () => {
			const square = computeFourierSeriesCoefficients("square", {
				A: 2,
				T0: 4,
			});
			const squareOdd = computeFourierSeriesCoefficients("square_odd", {
				A: 2,
				T0: 4,
			});
			const triangleOdd = computeFourierSeriesCoefficients(
				"triangle_odd",
				{
					A: 1,
					T0: 4,
				},
			);

			expect(evaluateFourierSeriesWaveform(square, 0.5)).toBe(2);
			expect(evaluateFourierSeriesWaveform(squareOdd, 0.5)).toBe(2);
			expect(evaluateFourierSeriesWaveform(triangleOdd, 0)).toBeCloseTo(
				0,
				12,
			);
			expect(evaluateFourierSeriesWaveform(triangleOdd, 0.5)).toBeCloseTo(
				0.5,
				12,
			);
		});

		it("uses T0 as the fundamental period of the full-wave sine", () => {
			const coeffs = computeFourierSeriesCoefficients("full_wave_sine", {
				A: 3,
				T0: 4,
			});

			expect(evaluateFourierSeriesWaveform(coeffs, 0)).toBe(0);
			expect(evaluateFourierSeriesWaveform(coeffs, 2)).toBeCloseTo(3, 12);
			expect(evaluateFourierSeriesWaveform(coeffs, 4)).toBeCloseTo(0, 12);
		});

		it.each([
			["square_even", 0, 2],
			["square_even", 1, -2],
			["triangle", 0, 2],
			["triangle_even", 0.5, 0],
			["sawtooth", 0.5, 1],
			["half_wave_sine", 0.5, 2],
			["half_wave_sine", 1.5, 0],
		] as const)(
			"evaluates the %s waveform at t=%s",
			(waveform, t, expected) => {
				const coeffs = computeFourierSeriesCoefficients(waveform, {
					A: 2,
					T0: 2,
				});
				expect(evaluateFourierSeriesWaveform(coeffs, t)).toBeCloseTo(
					expected,
					12,
				);
			},
		);
	});

	describe("Parseval Power Calculator", () => {
		it("computes total signal power and N-harmonic power fraction for square wave", () => {
			const coeffs = computeFourierSeriesCoefficients("square", {
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
			const coeffs = computeFourierSeriesCoefficients("half_wave_sine", {
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

		it.each(FOURIER_SERIES_WAVEFORM_TYPES)(
			"finds minimal 90/95/99 percent thresholds for %s",
			(waveformType) => {
				const coeffs = computeFourierSeriesCoefficients(waveformType, {
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
			const coeffs = computeFourierSeriesCoefficients("square");
			expect(() => computeHarmonicPowerThresholds(coeffs, 0)).toThrow(
				RangeError,
			);
		});

		it("formats capture ratios without rounding across thresholds", () => {
			const coeffs = computeFourierSeriesCoefficients("square", {
				A: 5,
				T0: 2,
			});
			expect(
				formatPowerCapturePercent(
					computeSignalPower(coeffs, 39).powerRatio,
				),
			).toBe("98.99");
			expect(
				formatPowerCapturePercent(
					computeSignalPower(coeffs, 40).powerRatio,
				),
			).toBe("98.99");
			expect(
				formatPowerCapturePercent(
					computeSignalPower(coeffs, 41).powerRatio,
				),
			).toBe("99.04");
			expect(formatPowerCapturePercent(0.9)).toBe("90.00");
			expect(formatPowerCapturePercent(0.899999)).toBe("89.9999");
			expect(formatPowerCapturePercent(-1)).toBe("0.00");
			expect(formatPowerCapturePercent(2)).toBe("100.00");
			expect(() => formatPowerCapturePercent(Number.NaN)).toThrow(
				RangeError,
			);
		});
	});

	describe("Input Validation", () => {
		it("validates waveform identifiers", () => {
			expect(isFourierSeriesWaveformType("triangle_odd")).toBe(true);
			expect(isFourierSeriesWaveformType("not-a-waveform")).toBe(false);
		});

		it("rejects invalid physical parameters and harmonic counts", () => {
			expect(() =>
				computeFourierSeriesCoefficients("square", { A: 0, T0: 2 }),
			).toThrow(RangeError);
			expect(() =>
				computeFourierSeriesCoefficients("square", { A: 1, T0: 0 }),
			).toThrow(RangeError);
			const coeffs = computeFourierSeriesCoefficients("square");
			expect(() => computePartialSum(coeffs, -1, 0)).toThrow(RangeError);
			expect(() => computePartialSum(coeffs, 1, Number.NaN)).toThrow(
				RangeError,
			);
			expect(() => computeSignalPower(coeffs, -1)).toThrow(RangeError);
			expect(() =>
				evaluateFourierSeriesWaveform(coeffs, Number.NaN),
			).toThrow(RangeError);
			expect(() => coeffs.Fn(0.5)).toThrow(RangeError);
			expect(() => computeHarmonicPowerThresholds(coeffs, 1)).toThrow(
				RangeError,
			);
			const unsupported = {
				...coeffs,
				waveformType: "unsupported",
			} as unknown as typeof coeffs;
			expect(() => evaluateFourierSeriesWaveform(unsupported, 0)).toThrow(
				/Unsupported waveform type/,
			);
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
			expect(problem.coeffs.originParity).toBe("even");
		});
	});
});
