import { describe, expect, it } from "vitest";
import { Complex } from "$lib/math-engine/complex";
import {
	computePartialSum,
	FOURIER_SERIES_WAVEFORM_TYPES,
	type FourierSeriesItsOption,
	generateFourierSeriesItsData,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";
import { createSeededPrng } from "$lib/math-engine/random";
import { sampleFourierExpression } from "./fourier-expression-oracle";

/**
 * Requires each wrong formula to have a numerical counterexample.
 * @param options - The four generated choices.
 * @param witnesses - Numeric distance from the correct answer at each sample.
 */
function expectUnambiguous(
	options: FourierSeriesItsOption[],
	witnesses: number[][],
): void {
	expect(options).toHaveLength(4);
	expect(options.filter((option) => option.isCorrect)).toHaveLength(1);
	expect(new Set(options.map((option) => option.latex)).size).toBe(4);
	for (let index = 0; index < options.length; index += 1) {
		const maximum = Math.max(...witnesses[index]!);
		if (options[index]!.isCorrect) expect(maximum).toBeLessThan(0.002);
		else expect(maximum, options[index]!.latex).toBeGreaterThan(0.01);
	}
}

describe.each(FOURIER_SERIES_WAVEFORM_TYPES)(
	"Unambiguous %s Fourier questions",
	(waveform) => {
		/** Checks numerical meaning across amplitudes, shuffles, and both derivation paths. */
		it.each([1, 3])(
			"keeps every distractor mathematically incorrect for amplitude %s",
			(A) => {
				for (const seed of [1, 19]) {
					const problem = generateFourierSeriesProblem(waveform, {
						A,
						seed,
						T0: 4,
					});
					const coeffs = problem.coeffs;
					for (const form of ["trig", "exp"] as const) {
						const data = generateFourierSeriesItsData(
							coeffs,
							createSeededPrng(seed),
							form,
						);
						for (const part of data.step5.parts) {
							const witnesses = part.options.map((option) =>
								[1, 2, 3, 4, 5].map((n) => {
									const actual = sampleFourierExpression(
										option.latex.split("=")[1]!,
										{ coeffs, n, t: 0 },
									);
									const fn = coeffs.Fn(n);
									const expected =
										part.target === "Fn"
											? new Complex(fn.re, fn.im)
											: new Complex(
													part.target === "a0"
														? coeffs.a0
														: part.target === "an"
															? coeffs.an(n)
															: coeffs.bn(n),
												);
									return actual.sub(expected).abs();
								}),
							);
							expectUnambiguous(part.options, witnesses);
						}
						for (const part of data.step6.parts) {
							const result = part.resultLatex.slice(
								part.resultLatex.indexOf("=") + 1,
							);
							const witnesses = part.options.map((option) =>
								[1, 2, 3, 4, 5].map((n) => {
									const fn = coeffs.Fn(n);
									const expected =
										part.target === "Fn"
											? new Complex(fn.re, fn.im)
											: new Complex(
													part.target === "a0"
														? coeffs.a0
														: part.target === "an"
															? coeffs.an(n)
															: coeffs.bn(n),
												);
									const rhs = option.latex
										.slice(option.latex.indexOf("=") + 1)
										.replace(result, "v");
									return sampleFourierExpression(rhs, {
										coeffs,
										n,
										t: 0,
										v: expected,
									})
										.sub(expected)
										.abs();
								}),
							);
							expectUnambiguous(part.options, witnesses);
						}
						for (const options of [
							data.step7.options,
							...problem.conversionChallenge.parts.map(
								(part) => part.options,
							),
						]) {
							const witnesses = options.map((option) =>
								[0.13, 0.37, 0.81].map((fraction) => {
									const t = fraction * coeffs.T0;
									const synthesis =
										option.latex.split(",\\qquad")[0]!;
									const rhs = synthesis.slice(
										synthesis.indexOf("=") + 1,
									);
									const actual = sampleFourierExpression(
										rhs,
										{ coeffs, t, n: 1 },
									);
									return actual
										.sub(
											new Complex(
												computePartialSum(
													coeffs,
													40,
													t,
												),
											),
										)
										.abs();
								}),
							);
							expectUnambiguous(options, witnesses);
						}
					}
				}
			},
		);
	},
);
