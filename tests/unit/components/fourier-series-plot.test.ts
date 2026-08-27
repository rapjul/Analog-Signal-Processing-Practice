/**
 * @file Unit tests for Fourier Series canvas plotting geometry, harmonic computation, and theme extraction.
 */

import { describe, expect, it, vi } from "vitest";
import {
	computeTargetMagnitudes,
	drawFourierHarmonicSpectrum,
	drawFourierTimeDomain,
	getFourierPlotTheme,
} from "$lib/components/canvas/fourier-series-plot";
import { computeFourierSeriesCoefficients } from "$lib/math-engine/fourier-series/index";
import type { FourierSeriesCoefficients } from "$lib/math-engine/fourier-series/index";

describe("Fourier Series Canvas Plotting & Geometry Primitives", () => {
	describe("getFourierPlotTheme", () => {
		it("extracts custom theme properties when present", () => {
			const mockStyle = {
				getPropertyValue: vi.fn((prop: string) => {
					if (prop === "--bg-card") return "#1a1a1a";
					if (prop === "--border-color") return "#333333";
					if (prop === "--text-secondary") return "#888888";
					if (prop === "--font-sans") return "Roboto, sans-serif";
					return "";
				}),
				fontFamily: "",
			} as unknown as CSSStyleDeclaration;

			const theme = getFourierPlotTheme(mockStyle);
			expect(theme.background).toBe("#1a1a1a");
			expect(theme.borderColor).toBe("#333333");
			expect(theme.textSecondary).toBe("#888888");
			expect(theme.fontFamily).toBe("Roboto, sans-serif");
		});

		it("falls back to default colors when CSS variables are empty", () => {
			const mockStyle = {
				getPropertyValue: vi.fn(() => ""),
				fontFamily: "CustomFont",
			} as unknown as CSSStyleDeclaration;

			const theme = getFourierPlotTheme(mockStyle);
			expect(theme.background).toBe("#121214");
			expect(theme.borderColor).toBe("#2d2d35");
			expect(theme.textSecondary).toBe("#a1a1aa");
			expect(theme.fontFamily).toBe("CustomFont");
		});
	});

	describe("computeTargetMagnitudes", () => {
		it("evaluates complex magnitudes for harmonics up to targetDisplayN", () => {
			const coeffs = computeFourierSeriesCoefficients("square", {
				A: 2,
				T0: 2,
			});
			const mags = computeTargetMagnitudes(coeffs, 5);

			expect(mags.length).toBe(51);
			expect(mags[0]).toBe(0); // DC magnitude index 0 is 0
			expect(mags[1]).toBeGreaterThan(0); // 1st harmonic non-zero
			expect(mags[2]).toBe(0); // Even harmonic zero for odd square wave
			expect(mags[3]).toBeGreaterThan(0); // 3rd harmonic non-zero
			expect(mags[5]).toBeGreaterThan(0); // 5th harmonic non-zero
			expect(mags[6]).toBe(0); // Truncated above targetDisplayN (5)
			expect(mags[50]).toBe(0);
		});
	});

	describe("drawFourierTimeDomain", () => {
		const mockContext = () => {
			return {
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 0,
				fillRect: vi.fn(),
				beginPath: vi.fn(),
				moveTo: vi.fn(),
				lineTo: vi.fn(),
				stroke: vi.fn(),
				setLineDash: vi.fn(),
			} as unknown as CanvasRenderingContext2D;
		};

		it("renders time-domain partial sum and ideal waveform for jump discontinuities", () => {
			const ctx = mockContext();
			const coeffs = computeFourierSeriesCoefficients("square", {
				A: 2,
				T0: 2,
			});
			const theme = getFourierPlotTheme({
				getPropertyValue: () => "",
				fontFamily: "",
			} as unknown as CSSStyleDeclaration);

			drawFourierTimeDomain(ctx, 400, 200, coeffs, 5, theme);

			expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
			expect(ctx.stroke).toHaveBeenCalledTimes(3); // zero axis, ideal curve, partial sum curve
			expect(ctx.moveTo).toHaveBeenCalled();
			expect(ctx.lineTo).toHaveBeenCalled();
		});

		it("renders continuous waveforms without segmentation jumps", () => {
			const ctx = mockContext();
			const coeffs = computeFourierSeriesCoefficients("triangle", {
				A: 2,
				T0: 2,
			});
			const theme = {
				background: "#000",
				borderColor: "#fff",
				textSecondary: "#aaa",
				waveformColor: "#123456",
				partialSumColor: "#654321",
			};

			drawFourierTimeDomain(ctx, 300, 150, coeffs, 3, theme);
			expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 150);
			expect(ctx.stroke).toHaveBeenCalled();
		});
	});

	describe("drawFourierHarmonicSpectrum", () => {
		const mockContext = () => {
			return {
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 0,
				font: "",
				textAlign: "",
				fillRect: vi.fn(),
				beginPath: vi.fn(),
				moveTo: vi.fn(),
				lineTo: vi.fn(),
				stroke: vi.fn(),
				fillText: vi.fn(),
			} as unknown as CanvasRenderingContext2D;
		};

		it("renders harmonic spectrum with narrow viewport (< 500px) and displayN <= 11", () => {
			const ctx = mockContext();
			const animatedMags = [0, 1.27, 0, 0.42, 0, 0.25, 0, 0, 0, 0, 0, 0];
			const theme = getFourierPlotTheme({
				getPropertyValue: () => "",
				fontFamily: "",
			} as unknown as CSSStyleDeclaration);

			drawFourierHarmonicSpectrum(ctx, 400, 200, 5, animatedMags, 5, theme);

			expect(ctx.fillRect).toHaveBeenCalled();
			expect(ctx.stroke).toHaveBeenCalled(); // axis line
			expect(ctx.fillText).toHaveBeenCalled(); // harmonic labels
		});

		it("renders wide viewport with displayN > 25 and active harmonic subset", () => {
			const ctx = mockContext();
			const animatedMags = Array.from({ length: 51 }, (_, i) =>
				i % 2 === 1 ? 2 / i : 0,
			);
			const theme = getFourierPlotTheme({
				getPropertyValue: () => "",
				fontFamily: "",
			} as unknown as CSSStyleDeclaration);

			drawFourierHarmonicSpectrum(ctx, 800, 300, 30, animatedMags, 30, theme);

			expect(ctx.fillRect).toHaveBeenCalled();
			expect(ctx.fillText).toHaveBeenCalled();
		});

		it("handles zero magnitude spectrum gracefully without divide-by-zero", () => {
			const ctx = mockContext();
			const animatedMags = Array.from({ length: 51 }, () => 0);
			const theme = getFourierPlotTheme({
				getPropertyValue: () => "",
				fontFamily: "",
			} as unknown as CSSStyleDeclaration);

			drawFourierHarmonicSpectrum(ctx, 600, 250, 10, animatedMags, 10, theme);

			expect(ctx.fillRect).toHaveBeenCalled();
		});
	});
});
