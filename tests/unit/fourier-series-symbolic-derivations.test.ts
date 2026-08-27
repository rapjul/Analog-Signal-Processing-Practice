/**
 * @file Unit tests for Fourier Series symbolic derivations, compact forms, and piecewise LaTeX generation.
 */

import { describe, expect, it } from "vitest";
import {
	buildCompactSeriesLatex,
	buildFinalSeriesLatex,
	buildFourierSeriesSymbolicDerivation,
	buildSignalLatex,
} from "$lib/math-engine/fourier-series/symbolic-derivations";
import { computeFourierSeriesCoefficients } from "$lib/math-engine/fourier-series/index";
import type {
	FourierSeriesCoefficients,
	FourierSeriesWaveformType,
} from "$lib/math-engine/fourier-series/types";

const ALL_WAVEFORMS: FourierSeriesWaveformType[] = [
	"square",
	"square_odd",
	"square_even",
	"triangle",
	"triangle_even",
	"triangle_odd",
	"sawtooth",
	"half_wave_sine",
	"full_wave_sine",
];

describe("Fourier Series Symbolic Derivations & LaTeX Templates", () => {
	describe("buildFinalSeriesLatex", () => {
		it.each(ALL_WAVEFORMS)(
			"generates valid final series LaTeX for %s",
			(waveformType) => {
				const coeffs = computeFourierSeriesCoefficients(waveformType, {
					A: 3,
					T0: 4,
				});
				const latex = buildFinalSeriesLatex(coeffs, "\\frac{\\pi}{2}");
				expect(latex).toContain("x(t) =");
				expect(latex).toContain("\\frac{\\pi}{2}");
			},
		);

		it("throws an error for unsupported waveform types", () => {
			const invalidCoeffs = {
				waveformType: "invalid_wave" as any,
				A: 1,
				T0: 2,
			} as FourierSeriesCoefficients;
			expect(() =>
				buildFinalSeriesLatex(invalidCoeffs, "\\pi"),
			).toThrowError(/Unsupported waveform type/);
		});
	});

	describe("buildCompactSeriesLatex", () => {
		it.each(ALL_WAVEFORMS)(
			"generates valid compact trigonometric series LaTeX for %s",
			(waveformType) => {
				const coeffs = computeFourierSeriesCoefficients(waveformType, {
					A: 2,
					T0: 2,
				});
				const compactLatex = buildCompactSeriesLatex(coeffs, "\\pi");
				expect(compactLatex).toContain("x(t)=\\frac{c_0}{2}+\\sum");
				expect(compactLatex).toContain("c_n=");
			},
		);

		it("throws an error for unsupported waveform types", () => {
			const invalidCoeffs = {
				waveformType: "unsupported" as any,
				A: 1,
				T0: 2,
			} as FourierSeriesCoefficients;
			expect(() =>
				buildCompactSeriesLatex(invalidCoeffs, "\\pi"),
			).toThrowError(/Unsupported waveform type/);
		});
	});

	describe("buildSignalLatex", () => {
		it.each(ALL_WAVEFORMS)(
			"generates valid one-period signal piecewise equation for %s",
			(waveformType) => {
				const latex = buildSignalLatex(waveformType, 5, 4);
				expect(latex).toContain("x(t)=");
			},
		);

		it("throws an error for unsupported waveform types", () => {
			expect(() =>
				buildSignalLatex("unknown_type" as any, 1, 2),
			).toThrowError(/Unsupported waveform type/);
		});
	});

	describe("buildFourierSeriesSymbolicDerivation", () => {
		it.each(ALL_WAVEFORMS)(
			"generates complete step-by-step symbolic derivation breakdown for %s",
			(waveformType) => {
				const coeffs = computeFourierSeriesCoefficients(waveformType, {
					A: 4,
					T0: 2,
				});
				const derivation = buildFourierSeriesSymbolicDerivation(
					coeffs,
					"\\pi",
				);

				expect(derivation.a0Latex).toBeDefined();
				expect(derivation.anLatex).toBeDefined();
				expect(derivation.bnLatex).toBeDefined();
				expect(derivation.FnLatex).toBeDefined();
				expect(derivation.finalTrigLatex).toContain("x(t) =");
				expect(derivation.finalExpLatex).toContain("x(t)=\\sum");
				expect(derivation.a0IntegralLatex).toContain("a_0=");
				expect(derivation.evaluationLatex).toBeDefined();
			},
		);

		it("throws an error for unsupported waveform types", () => {
			const invalidCoeffs = {
				waveformType: "unsupported_wave" as any,
				A: 1,
				T0: 2,
			} as FourierSeriesCoefficients;
			expect(() =>
				buildFourierSeriesSymbolicDerivation(invalidCoeffs, "\\pi"),
			).toThrowError(/Unsupported waveform type/);
		});
	});
});
