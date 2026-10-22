import { describe, expect, it } from "vitest";
import {
	computeFourierSeriesCoefficients,
	generateFourierSeriesItsData,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";
import { getVanishingCoefficients } from "$lib/math-engine/fourier-series/its-scaffolding/step3-shortcuts";

describe("Fourier Series ITS Step Generator Engine", () => {
	const supportedWaveforms = [
		"square",
		"square_odd",
		"square_even",
		"triangle",
		"triangle_odd",
		"triangle_even",
		"sawtooth",
		"half_wave_sine",
		"full_wave_sine",
	] as const;

	it.each([
		["square", "4(1)", "\\sin"],
		["square_odd", "4(1)", "\\sin"],
		["square_even", "\\sin\\left(\\frac{n\\pi}{2}", "\\cos"],
		["triangle", "8(1)", "n^2\\pi^2"],
		["triangle_odd", "8(1)", "\\sin\\left(\\frac{n\\pi}{2}"],
		["triangle_even", "8(1)", "n^2\\pi^2"],
		["sawtooth", "(-1)^{n+1}", "2(1)"],
		["half_wave_sine", "F_n", "n=-1"],
		["full_wave_sine", "4n^2-1", "\\frac{2(1)}{\\pi}"],
	] as const)(
		"builds the exact final series for %s",
		(waveform, expectedA, expectedB) => {
			const problem = generateFourierSeriesProblem(waveform, {
				seed: 1,
				A: 1,
				T0: 2,
			});
			const correct = problem.itsData.step7.options.find(
				(option) => option.isCorrect,
			);

			expect(correct?.latex).toContain(expectedA);
			expect(correct?.latex).toContain(expectedB);
		},
	);

	it("generates valid ITS step data for odd square wave", () => {
		const coeffs = computeFourierSeriesCoefficients("square", {
			A: 2,
			T0: 2,
		});
		const itsData = generateFourierSeriesItsData(coeffs);

		// Step 1
		expect(itsData.step1.expectedT).toBe(2);
		expect(itsData.step1.expectedTUnit).toBe("s");
		expect(itsData.step1.tAliases).toContain("2");
		expect(itsData.step1.w0Aliases).toContain("pi");
		expect(itsData.step1.hints.length).toBe(3);

		// Step 2
		expect(itsData.step2.correctOriginParity).toBe("odd");
		expect(itsData.step2.correctHalfWaveSymmetry).toBe(true);
		expect(itsData.step2.hints).toHaveLength(3);
		expect(itsData.step2.halfWaveHints).toHaveLength(3);
		expect(itsData.step2.halfWaveHints[0]).toContain("flipped vertically");
		expect(itsData.step2.misconceptions.even).toBeDefined();

		// Step 3
		expect(itsData.step3.correctVanishing).toBe("an_zero");

		// Step 4
		expect(itsData.step4.correctForm).toBe("trig");

		// Step 5
		expect(itsData.step5.parts).toHaveLength(1);
		expect(itsData.step5.parts[0]!.target).toBe("bn");
		expect(itsData.step5.parts[0]!.options.length).toBe(4);
		const correctOpt5 = itsData.step5.parts[0]!.options.find(
			(o) => o.isCorrect,
		);
		expect(correctOpt5).toBeDefined();
		expect(correctOpt5?.latex).toContain("b_n=");

		// Step 6: one evaluated coefficient family
		expect(itsData.step6.parts).toHaveLength(1);
		expect(itsData.step6.parts[0]!.target).toBe("bn");
		expect(itsData.step6.parts[0]!.options.length).toBe(4);
		const correctOpt6 = itsData.step6.parts[0]!.options.find(
			(o) => o.isCorrect,
		);
		expect(correctOpt6).toBeDefined();
		expect(correctOpt6?.latex).toContain("b_n");
		expect(correctOpt6?.latex).not.toContain("F_n");
		expect(itsData.step6.carriedCoefficients.map(({ id }) => id)).toEqual([
			"a0",
			"an",
		]);

		// Step 7: final series synthesis
		expect(itsData.step7.options.length).toBe(4);
		const correctOpt7 = itsData.step7.options.find((o) => o.isCorrect);
		expect(correctOpt7?.latex).toContain("x(t)");
		expect(correctOpt7?.latex).not.toContain("F_n");
		expect(itsData.step7.form).toBe("trig");
	});

	it.each(supportedWaveforms)(
		"substitutes the active waveform into every integral option for %s",
		(waveform) => {
			const problem = generateFourierSeriesProblem(waveform, {
				seed: 42,
				A: 5,
				T0: 2,
			});
			for (const part of problem.itsData.step5.parts) {
				expect(part.options).toHaveLength(4);
				expect(
					part.options.filter((option) => option.isCorrect),
				).toHaveLength(1);
				expect(
					new Set(part.options.map((option) => option.latex)).size,
				).toBe(4);
				for (const option of part.options) {
					expect(option.latex).toContain("5");
					expect(option.latex).not.toContain("x(t)");
				}
			}
		},
	);

	it.each(supportedWaveforms)(
		"keeps pi commands separated from following symbols for %s",
		(waveform) => {
			const problem = generateFourierSeriesProblem(waveform, {
				seed: 42,
				A: 5,
				T0: 2,
			});
			const generatedLatex = [
				problem.signalLatex,
				problem.omega0Latex,
				problem.a0Latex,
				problem.anLatex,
				problem.bnLatex,
				problem.FnLatex,
				...problem.solutionSteps.map((step) => step.latex),
				...problem.itsData.step5.parts.flatMap((part) =>
					part.options.map((option) => option.latex),
				),
				...problem.itsData.step6.parts.flatMap((part) =>
					part.options.map((option) => option.latex),
				),
				...problem.itsData.step7.options.map((option) => option.latex),
				...problem.conversionChallenge.parts.flatMap((part) =>
					part.options.map((option) => option.latex),
				),
				...problem.conversionSolutionSteps.map((step) => step.latex),
			];

			for (const latex of generatedLatex) {
				expect(latex).not.toMatch(/\\pi[A-Za-z]/);
			}
		},
	);

	it.each(supportedWaveforms)(
		"builds optional alternate and Compact conversion branches for %s",
		(waveform) => {
			const problem = generateFourierSeriesProblem(waveform, {
				seed: 17,
				A: 5,
				T0: 2,
			});
			expect(
				problem.conversionChallenge.parts.map(({ id }) => id),
			).toEqual(["alternate", "compact"]);
			expect(problem.conversionSolutionSteps).toHaveLength(2);
			for (const part of problem.conversionChallenge.parts) {
				expect(part.options).toHaveLength(4);
				expect(
					part.options.filter(({ isCorrect }) => isCorrect),
				).toHaveLength(1);
				expect(
					new Set(part.options.map(({ latex }) => latex)).size,
				).toBe(4);
			}

			const alternate = problem.conversionChallenge.parts[0].resultLatex;
			if (problem.itsData.step4.correctForm === "trig") {
				expect(alternate).toContain("F_n");
			} else {
				expect(alternate).not.toContain("F_n");
				expect(alternate).toContain("x(t)");
			}
			const compact = problem.conversionChallenge.parts[1].resultLatex;
			expect(compact).toContain("c_n");
			expect(compact).toContain("\\theta_n");
			expect(compact).not.toContain("A_n");
		},
	);

	it("generates valid ITS step data for even square wave", () => {
		const coeffs = computeFourierSeriesCoefficients("square_even", {
			A: 1,
			T0: 4,
		});
		const itsData = generateFourierSeriesItsData(coeffs);

		expect(itsData.step1.expectedT).toBe(4);
		expect(itsData.step1.w0Aliases).toContain("pi/2");
		expect(itsData.step2.correctOriginParity).toBe("even");
		expect(itsData.step2.correctHalfWaveSymmetry).toBe(true);
		expect(itsData.step3.correctVanishing).toBe("bn_zero");
		expect(itsData.step4.correctForm).toBe("trig");

		expect(itsData.step5.parts.map(({ target }) => target)).toEqual(["an"]);
		expect(itsData.step5.carriedCoefficients.map(({ id }) => id)).toEqual([
			"a0",
			"bn",
		]);
		expect(
			itsData.step5.parts[0]?.options.find((option) => option.isCorrect)
				?.latex,
		).toContain("a_n=");
	});

	it("generates anti-spoiler title and complete ITS problem instance", () => {
		const problem = generateFourierSeriesProblem("triangle");
		expect(problem.title).toBe("Practice Problem: Periodic Waveform");
		expect(problem.itsData).toBeDefined();
		expect(problem.itsData.step1.expectedT).toBeGreaterThan(0);
		expect(problem.solutionSteps).toHaveLength(7);
		expect(problem.solutionSteps[0]?.title).not.toContain("Step 1:");
	});

	it.each(supportedWaveforms)(
		"builds deterministic, parallel coefficient branches for %s",
		(waveform) => {
			const coeffs = computeFourierSeriesCoefficients(waveform, {
				A: 5,
				T0: 2,
			});
			for (const form of ["trig", "exp"] as const) {
				const first = generateFourierSeriesItsData(
					coeffs,
					() => 0.25,
					form,
				);
				const second = generateFourierSeriesItsData(
					coeffs,
					() => 0.25,
					form,
				);
				expect(first.step5.parts).toEqual(second.step5.parts);
				expect(first.step6.parts).toEqual(second.step6.parts);

				const expectedTargets =
					form === "exp"
						? ["Fn"]
						: coeffs.originParity === "even"
							? coeffs.hasHalfWaveSymmetry
								? ["an"]
								: ["a0", "an"]
							: coeffs.originParity === "odd"
								? ["bn"]
								: ["a0", "an", "bn"];
				expect(first.step5.parts.map(({ target }) => target)).toEqual(
					expectedTargets,
				);
				expect(first.step6.parts.map(({ target }) => target)).toEqual(
					expectedTargets,
				);

				for (const part of [
					...first.step5.parts,
					...first.step6.parts,
				]) {
					expect(part.options).toHaveLength(4);
					expect(
						part.options.filter(({ isCorrect }) => isCorrect),
					).toHaveLength(1);
					expect(
						new Set(part.options.map(({ latex }) => latex)).size,
					).toBe(4);
					for (const option of part.options) {
						const targetLatex =
							part.target === "a0"
								? "a_0"
								: part.target === "Fn"
									? "F_n"
									: `${part.target[0]}_n`;
						expect(option.latex).toContain(targetLatex);
					}
				}
			}
		},
	);

	it("handles default fallback in getVanishingCoefficients for unknown origin parity", () => {
		expect(
			getVanishingCoefficients("unknown_parity" as unknown as "even"),
		).toBe("none");
	});
});
