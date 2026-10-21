/** Independent mathematical contracts for displayed Fourier formulas. */
import { renderToString } from "katex";
import { describe, expect, it } from "vitest";
import {
	buildCompactSeriesLatex,
	buildFourierSeriesSymbolicDerivation,
	computeFourierSeriesCoefficients,
	computeHarmonicPowerThresholds,
	computePartialSum,
	computeSignalPower,
	evaluateFourierSeriesWaveform,
	FOURIER_SERIES_WAVEFORM_TYPES,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";
import {
	sampleFourierBoundaryExpression,
	sampleFourierDefinition,
	sampleFourierExpression,
} from "./fourier-expression-oracle";

describe.each(FOURIER_SERIES_WAVEFORM_TYPES)(
	"%s mathematical contracts",
	(waveform) => {
		/** Checks the actual exponential primitives, including resonance, against independent quadrature. */
		it.each([
			{ A: 3, T0: 4 },
			{ A: 1e-7, T0: 1e-7 },
			{ A: 1e7, T0: 1e7 },
		])(
			"evaluates exponential boundaries at amplitude $A and period $T0",
			/** @param parameters - Ordinary or scientific amplitude and period. */
			({ A, T0 }) => {
				const coeffs = computeFourierSeriesCoefficients(waveform, {
					A,
					T0,
				});
				const d = buildFourierSeriesSymbolicDerivation(
					coeffs,
					"\\pi/2",
				);
				const latex = d.expEvaluationLatex!;
				/** Confirms scientific parameters also remain valid in the rendered worked evaluation. */
				expect(() =>
					renderToString(latex, { throwOnError: true }),
				).not.toThrow();
				for (const n of [-5, -2, -1, 0, 1, 2, 5]) {
					const sample = { coeffs, n, t: 0 };
					const row =
						n === 0
							? latex.split("F_0=")[1]!.split("\\\\")[0]!
							: waveform === "half_wave_sine" && Math.abs(n) === 1
								? latex
										.split(
											`${n === 1 ? "F_1" : "F_{-1}"}=`,
										)[1]!
										.split("\\\\")[0]!
								: latex.split("F_n=")[1]!.split("\\quad")[0]!;
					const displayed = sampleFourierBoundaryExpression(
						row.split("=")[0]!,
						sample,
					);
					let re = 0;
					let im = 0;
					for (let k = 0; k < 8192; k++) {
						const t = ((k + 0.5) / 8192 - 0.5) * coeffs.T0;
						const x = evaluateFourierSeriesWaveform(coeffs, t) / A;
						re += (x * Math.cos(n * coeffs.w0 * t)) / 8192;
						im -= (x * Math.sin(n * coeffs.w0 * t)) / 8192;
					}
					expect(displayed.re / A).toBeCloseTo(re, 6);
					expect(displayed.im / A).toBeCloseTo(im, 6);
				}
			},
		);

		/** Numerically integrates the displayed integrals rather than substituting their results. */
		it("labels and evaluates every trigonometric setup correctly", () => {
			const coeffs = computeFourierSeriesCoefficients(waveform, {
				A: 3,
				T0: 4,
			});
			const d = buildFourierSeriesSymbolicDerivation(coeffs, "\\pi/2");
			for (const n of [1, 2, 3]) {
				for (const [label, integral, expected] of [
					["a_0", d.a0IntegralLatex, coeffs.a0],
					["a_n", d.anIntegralLatex, coeffs.an(n)],
					["b_n", d.bnIntegralLatex, coeffs.bn(n)],
				] as const) {
					expect(integral.startsWith(`${label}=`)).toBe(true);
					expect(
						sampleFourierExpression(
							integral.slice(integral.indexOf("=") + 1),
							{ coeffs, n, t: 0 },
						).re,
					).toBeCloseTo(expected, 3);
				}
			}
		});

		/** Compares signed coefficient definitions against direct waveform quadrature. */
		it("evaluates displayed signed exponential coefficients and DC independently", () => {
			const coeffs = computeFourierSeriesCoefficients(waveform, {
				A: 2,
				T0: 4,
			});
			const d = buildFourierSeriesSymbolicDerivation(coeffs, "\\pi/2");
			for (const n of [-5, -2, -1, 0, 1, 2, 5]) {
				let re = 0;
				let im = 0;
				for (let k = 0; k < 4096; k++) {
					const t = ((k + 0.5) / 4096 - 0.5) * coeffs.T0;
					const x = evaluateFourierSeriesWaveform(coeffs, t);
					re += (x * Math.cos(n * coeffs.w0 * t)) / 4096;
					im -= (x * Math.sin(n * coeffs.w0 * t)) / 4096;
				}
				const displayed = sampleFourierDefinition(d.FnLatex, {
					coeffs,
					n,
					t: 0,
				});
				expect(displayed.re).toBeCloseTo(re, 5);
				expect(displayed.im).toBeCloseTo(im, 5);
				expect(coeffs.Fn(n).re).toBeCloseTo(re, 5);
				expect(coeffs.Fn(n).im).toBeCloseTo(im, 5);
				if (n > 0) {
					expect(
						sampleFourierDefinition(d.anLatex, { coeffs, n, t: 0 })
							.re,
					).toBeCloseTo(2 * re, 5);
					expect(
						sampleFourierDefinition(d.bnLatex, { coeffs, n, t: 0 })
							.re,
					).toBeCloseTo(-2 * im, 5);
				}
			}
		});

		/** Checks actual compact amplitude and phase definitions against real coefficient pairs. */
		it("uses displayed nonnegative amplitudes and phases", () => {
			const coeffs = computeFourierSeriesCoefficients(waveform, {
				A: 3,
				T0: 4,
			});
			const compact = buildCompactSeriesLatex(coeffs, "\\pi/2");
			for (const n of [1, 2, 3, 4, 5, 7]) {
				let amplitude: string;
				let phase: string;
				if (waveform === "half_wave_sine") {
					if (n > 1 && n % 2 === 1) continue;
					amplitude =
						n === 1
							? compact.match(/c_1=(.*?),\\ /)![1]!
							: compact
									.match(/c_\{2k\}=(.*?),\\ /)![1]!
									.replaceAll("k", `(${n / 2})`);
					phase =
						n === 1
							? compact.match(/\\theta_1=(.*?),\\quad/)![1]!
							: compact.match(/\\theta_\{2k\}=(.*?),\\quad/)![1]!;
				} else {
					amplitude = compact.match(
						/c_n=(.*?),\\quad \\theta_n=/,
					)![1]!;
					phase = compact
						.split("\\theta_n=")[1]!
						.replace(/\\ \(n\\text\{ odd\}\)$/, "");
				}
				const sample = { coeffs, n, t: 0 };
				const c = sampleFourierDefinition(amplitude, sample).re;
				expect(c).toBeGreaterThanOrEqual(0);
				if (c === 0) continue;
				const theta = sampleFourierDefinition(phase, sample).re;
				expect(c * Math.cos(theta)).toBeCloseTo(coeffs.an(n), 10);
				expect(-c * Math.sin(theta)).toBeCloseTo(coeffs.bn(n), 10);
			}
		});
	},
);

describe("Fourier numerical boundaries", () => {
	/** Distinguishes the ideal waveform's endpoint value from the Fourier midpoint limit. */
	it("uses right-hand square-wave values while partial sums converge to jump midpoints", () => {
		const c = computeFourierSeriesCoefficients("square_even", {
			A: 2,
			T0: 4,
		});
		expect(evaluateFourierSeriesWaveform(c, -1)).toBe(2);
		expect(evaluateFourierSeriesWaveform(c, 1)).toBe(-2);
		expect(computePartialSum(c, 100, -1)).toBeCloseTo(0, 10);
		expect(computePartialSum(c, 100, 1)).toBeCloseTo(0, 10);
	});
	/** Rejects invalid indices even for coefficient families that vanish identically. */
	it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		"rejects trigonometric index %s",
		(n) => {
			for (const waveform of FOURIER_SERIES_WAVEFORM_TYPES) {
				const c = computeFourierSeriesCoefficients(waveform);
				expect(() => c.an(n)).toThrow(RangeError);
				expect(() => c.bn(n)).toThrow(RangeError);
			}
		},
	);
	/** Prevents overflow, underflow, and unsafe loop bounds. */
	it("rejects unrepresentable parameters and unsafe counts", () => {
		for (const A of [1e-200, 1e200])
			expect(() =>
				computeFourierSeriesCoefficients("square", { A }),
			).toThrow(RangeError);
		expect(() =>
			computeFourierSeriesCoefficients("square", {
				T0: Number.MIN_VALUE,
			}),
		).toThrow(RangeError);
		const c = computeFourierSeriesCoefficients("square");
		const unsafe = Number.MAX_SAFE_INTEGER + 1;
		expect(() => c.Fn(unsafe)).toThrow(RangeError);
		expect(() => computePartialSum(c, unsafe, 0)).toThrow(RangeError);
		expect(() => computeSignalPower(c, unsafe)).toThrow(RangeError);
		expect(() => computeHarmonicPowerThresholds(c, unsafe)).toThrow(
			RangeError,
		);
	});
	/** Confirms that power thresholds remain independent of representable amplitude scale. */
	it.each([1e-150, 1e150])("normalizes power at amplitude %s", (A) => {
		const c = computeFourierSeriesCoefficients("square", { A });
		const reference = computeFourierSeriesCoefficients("square");
		expect(computeSignalPower(c, 5).powerRatio).toBeCloseTo(
			computeSignalPower(reference, 5).powerRatio,
			12,
		);
		expect(computeHarmonicPowerThresholds(c)).toEqual(
			computeHarmonicPowerThresholds(reference),
		);
		const p = generateFourierSeriesProblem("square", { A, seed: 1 });
		for (const latex of [
			p.signalLatex,
			p.bnLatex,
			...p.solutionSteps.map(({ latex }) => latex),
		])
			expect(latex).not.toMatch(/\de[+-]\d/);
	});
	/** Reduces time before phase multiplication to avoid finite-input overflow. */
	it("keeps reconstruction finite at very large times", () => {
		const c = computeFourierSeriesCoefficients("square", { T0: 1e-7 });
		expect(Number.isFinite(computePartialSum(c, 50, 1e300))).toBe(true);
	});
});
