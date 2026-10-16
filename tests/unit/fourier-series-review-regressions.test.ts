import { describe, expect, it } from "vitest";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
} from "$lib/math-engine/evaluator";
import { formatFourierFrequency } from "$lib/math-engine/fourier-series/frequency";
import {
	computePartialSum,
	evaluateFourierSeriesWaveform,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier Series adversarial regressions", () => {
	/** Checks that scientific notation retains its numerical meaning in rendered math. */
	it.each([1e-7, 1.25e-7, 1e21])(
		"formats scientific period %s as valid LaTeX",
		(T0) => {
			const problem = generateFourierSeriesProblem("square", {
				seed: 1,
				T0,
			});
			const expected = (2 * Math.PI) / T0;
			const frequency = evaluateMathJsonStrict(
				parseStrictLatex(formatFourierFrequency(T0)),
				{},
			);
			expect(frequency).not.toBeNull();
			expect(Number(frequency) / expected).toBeCloseTo(1, 12);
			const expressions = [
				problem.signalLatex,
				problem.periodLatex,
				problem.omega0Latex,
				...problem.itsData.step1.hints,
			];
			for (const expression of expressions)
				expect(expression).not.toMatch(/\de[+-]\d/);
			for (const alias of problem.itsData.step1.w0Aliases) {
				const value = evaluateMathJsonStrict(
					parseStrictLatex(alias),
					{},
				);
				expect(value).not.toBeNull();
				expect(Number(value) / expected).toBeCloseTo(1, 12);
			}
		},
	);
	/** Checks the displayed series itself against an independent waveform oracle. */
	it("reconstructs the full-wave sine using its fundamental frequency", () => {
		const problem = generateFourierSeriesProblem("full_wave_sine", {
			seed: 1,
			A: 1,
			T0: 2,
		});
		const formula = problem.itsData.step7.options.find(
			(option) => option.isCorrect,
		)!.latex;
		const [constant, harmonic] = formula.split(" = ")[1]!.split(" - ");
		const dc = parseStrictLatex(constant!);
		const term = parseStrictLatex(
			harmonic!.replace(/\\sum_\{n=1\}\^\{\\infty\}/, ""),
		);
		for (const t of [0.1, 0.5, 0.9, 1.4]) {
			let displayed = evaluateMathJsonStrict(dc, {})!;
			for (let n = 1; n <= 1000; n += 1) {
				const value = evaluateMathJsonStrict(term, { n, t });
				expect(value).not.toBeNull();
				displayed -= value!;
			}
			expect(displayed).toBeCloseTo(
				Math.abs(Math.sin((Math.PI * t) / 2)),
				5,
			);
			expect(displayed).toBeCloseTo(
				evaluateFourierSeriesWaveform(problem.coeffs, t),
				5,
			);
			expect(displayed).toBeCloseTo(
				computePartialSum(problem.coeffs, 1000, t),
				10,
			);
		}
	});

	/** Checks that hints, aliases, and synthesis agree with non-default periods. */
	it.each([1, 2, 4, 8, 2.5])(
		"formats the actual frequency for period %s",
		(T0) => {
			const problem = generateFourierSeriesProblem("square", {
				seed: 1,
				T0,
			});
			const expected = (2 * Math.PI) / T0;
			expect(problem.itsData.step1.expectedW0).toBe(expected);
			for (const alias of problem.itsData.step1.w0Aliases) {
				// Preserve the historical shorthand meaning of this explicitly supported alias.
				const normalized = alias === "1/2pi" ? "pi/2" : alias;
				expect(
					evaluateMathJsonStrict(parseStrictLatex(normalized), {}),
				).toBeCloseTo(expected, 2);
			}
			if (T0 !== 2 && T0 !== 4) {
				expect(problem.omega0Latex).toContain(`\\frac{2\\pi}{${T0}}`);
				expect(problem.itsData.step1.hints[2]).toContain(
					`\\frac{2\\pi}{${T0}}`,
				);
			}
		},
	);
});
