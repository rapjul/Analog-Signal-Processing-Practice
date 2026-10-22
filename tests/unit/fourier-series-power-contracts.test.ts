/** Independent regression checks for shared power definitions and extreme numeric scales. */
import { describe, expect, it } from "vitest";
import {
	computeFourierSeriesCoefficients,
	computeHarmonicPowerContribution,
	computeHarmonicPowerThresholds,
	computeSignalPower,
	FOURIER_POWER_TARGETS,
	FOURIER_SERIES_WAVEFORM_TYPES,
	formatPowerCapturePercent,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier power contracts", () => {
	/** Prevents even the nearest representable values below a target from being labeled as reaching it. */
	it.each([90, 95, 99])(
		"keeps percentage labels on the correct side of %s percent",
		/** @param percent - Independently specified power-capture boundary. */
		(percent) => {
			const ratio = percent / 100;
			for (const delta of [1e-6, 1e-10, Number.EPSILON / 2]) {
				expect(
					Number(formatPowerCapturePercent(ratio - delta)),
				).toBeLessThan(percent);
				expect(
					Number(formatPowerCapturePercent(ratio + delta)),
				).toBeGreaterThanOrEqual(percent);
			}
			expect(formatPowerCapturePercent(ratio)).toBe(`${percent}.00`);
		},
	);

	/** Preserves ordinary two-decimal labels and existing clamping behavior. */
	it.each([
		[0, "0.00"],
		[1, "100.00"],
		[0.875, "87.50"],
		[-1, "0.00"],
		[2, "100.00"],
	] as const)(
		"formats ordinary ratio %s as %s",
		/** @param ratio - Existing input case. @param expected - Unchanged display text. */
		(ratio, expected) => {
			expect(formatPowerCapturePercent(ratio)).toBe(expected);
		},
	);

	/** Verifies total power against closed-form waveform averages, independently of production metadata. */
	it.each(FOURIER_SERIES_WAVEFORM_TYPES)(
		"preserves total and paired power for %s",
		(waveform) => {
			const c = computeFourierSeriesCoefficients(waveform, { A: 3 });
			const divisor = waveform.startsWith("square")
				? 1
				: waveform === "half_wave_sine"
					? 4
					: waveform === "full_wave_sine"
						? 2
						: 3;
			const power = computeSignalPower(c, 12);
			expect(power.totalPower).toBe(9 / divisor);
			let paired = 0;
			for (let n = 0; n <= 12; n++) {
				const { re, im } = c.Fn(n);
				const contribution = computeHarmonicPowerContribution(c, n);
				expect(contribution).toBeCloseTo(
					(n === 0 ? 1 : 2) * (re * re + im * im),
					12,
				);
				paired += contribution;
			}
			expect(paired).toBeCloseTo(power.harmonicPower, 12);
		},
	);

	/** Keeps a representable first-harmonic pair from being rounded above the entire signal power. */
	it("rounds subnormal triangle power after pairing and scaling", () => {
		const c = computeFourierSeriesCoefficients("triangle", { A: 4e-162 });
		const power = computeSignalPower(c, 1);
		expect(power.totalPower).toBe(Number.MIN_VALUE);
		expect(power.harmonicPower).toBe(Number.MIN_VALUE);
		expect(computeHarmonicPowerContribution(c, 1)).toBe(Number.MIN_VALUE);
		expect(power.powerRatio).toBeCloseTo(96 / Math.PI ** 4, 12);
	});

	/** Accepts finite actual powers even if the intermediate amplitude square overflows. */
	it.each(["triangle", "half_wave_sine"] as const)(
		"supports representable large %s power",
		(waveform) => {
			const c = computeFourierSeriesCoefficients(waveform, { A: 2e154 });
			const power = computeSignalPower(c, 12);
			expect(Number.isFinite(power.totalPower)).toBe(true);
			expect(power.totalPower / 1e308).toBeCloseTo(
				waveform === "triangle" ? 4 / 3 : 1,
				12,
			);
			expect(Number.isFinite(power.harmonicPower)).toBe(true);
			expect(power.harmonicPower).toBeLessThanOrEqual(power.totalPower);
			expect(computeHarmonicPowerThresholds(c)).toEqual(
				computeHarmonicPowerThresholds(
					computeFourierSeriesCoefficients(waveform),
				),
			);
		},
	);

	/** Validates each waveform against its own average instead of a worst-case divisor. */
	it("accepts representable tiny powers and rejects genuine underflow and overflow", () => {
		expect(
			computeSignalPower(
				computeFourierSeriesCoefficients("square", { A: 2e-162 }),
				0,
			).totalPower,
		).toBe(Number.MIN_VALUE);
		expect(
			computeSignalPower(
				computeFourierSeriesCoefficients("full_wave_sine", {
					A: 3e-162,
				}),
				0,
			).totalPower,
		).toBe(Number.MIN_VALUE);
		for (const [waveform, A] of [
			["triangle", 2e-162],
			["half_wave_sine", 3e-162],
			["square", 2e154],
			["half_wave_sine", 3e154],
		] as const) {
			expect(() =>
				computeFourierSeriesCoefficients(waveform, { A }),
			).toThrow(RangeError);
		}
	});

	/** Requires the same threshold percentages in search and rounding-safe display. */
	it("protects all three minimum-power boundaries", () => {
		expect(FOURIER_POWER_TARGETS).toEqual([
			{ key: "n90", percent: 90 },
			{ key: "n95", percent: 95 },
			{ key: "n99", percent: 99 },
		]);
		const c = computeFourierSeriesCoefficients("square");
		const limits = computeHarmonicPowerThresholds(c);
		for (const { key, percent } of FOURIER_POWER_TARGETS) {
			expect(
				computeSignalPower(c, limits[key]).powerRatio,
			).toBeGreaterThanOrEqual(percent / 100);
			expect(
				computeSignalPower(c, limits[key] - 1).powerRatio,
			).toBeLessThan(percent / 100);
			expect(
				Number(formatPowerCapturePercent(percent / 100 - 1e-6)),
			).toBeLessThan(percent);
		}
	});

	/** Rejects unsafe indices even for zero-valued coefficient families. */
	it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		"rejects power contribution index %s",
		(n) => {
			expect(() =>
				computeHarmonicPowerContribution(
					computeFourierSeriesCoefficients("square"),
					n,
				),
			).toThrow(RangeError);
		},
	);
});
