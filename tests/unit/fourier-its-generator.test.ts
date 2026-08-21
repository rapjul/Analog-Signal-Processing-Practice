import { describe, expect, it } from "vitest";
import {
	computeFourierCoefficients,
	generateFourierItsData,
	generateFourierSeriesProblem,
} from "../../src/lib/math-engine/fourier-series";

describe("Fourier Series ITS Step Generator Engine", () => {
	it.each([
		["square", "4(1)", "\\sin"],
		["square_odd", "4(1)", "\\sin"],
		["square_even", "\\sin\\left(\\frac{n\\pi}{2}", "\\cos"],
		["triangle", "8(1)", "n^2\\pi^2"],
		["triangle_odd", "8(1)", "\\sin\\left(\\frac{n\\pi}{2}"],
		["triangle_even", "8(1)", "n^2\\pi^2"],
		["sawtooth", "(-1)^{n+1}", "2(1)"],
		["half_wave_sine", "\\frac{1}{2}\\sin", "1-4k^2"],
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
		const coeffs = computeFourierCoefficients("square", { A: 2, T0: 2 });
		const itsData = generateFourierItsData(coeffs);

		// Step 1
		expect(itsData.step1.expectedT).toBe(2);
		expect(itsData.step1.expectedTUnit).toBe("s");
		expect(itsData.step1.tAliases).toContain("2");
		expect(itsData.step1.w0Aliases).toContain("pi");
		expect(itsData.step1.hints.length).toBe(3);

		// Step 2
		expect(itsData.step2.correctSymmetry).toBe("odd");
		expect(itsData.step2.correctOriginParity).toBe("odd");
		expect(itsData.step2.correctHalfWaveSymmetry).toBe(true);
		expect(itsData.step2.misconceptions.even).toBeDefined();

		// Step 3
		expect(itsData.step3.correctVanishing).toBe("an_zero");

		// Step 4
		expect(itsData.step4.correctForm).toBe("trig");

		// Step 5
		expect(itsData.step5.options.length).toBe(4);
		const correctOpt5 = itsData.step5.options.find((o) => o.isCorrect);
		expect(correctOpt5).toBeDefined();
		expect(correctOpt5?.latex).toContain("b_n=");

		// Step 6: evaluated coefficient set
		expect(itsData.step6.options.length).toBe(4);
		const correctOpt6 = itsData.step6.options.find((o) => o.isCorrect);
		expect(correctOpt6).toBeDefined();
		expect(correctOpt6?.latex).toContain("a_0");
		expect(correctOpt6?.latex).toContain("F_n");

		// Step 7: final series synthesis
		expect(itsData.step7.options.length).toBe(4);
		const correctOpt7 = itsData.step7.options.find((o) => o.isCorrect);
		expect(correctOpt7?.latex).toContain("x(t)");
		expect(correctOpt7?.latex).toContain("F_n");
	});

	it("generates valid ITS step data for even square wave", () => {
		const coeffs = computeFourierCoefficients("square_even", {
			A: 1,
			T0: 4,
		});
		const itsData = generateFourierItsData(coeffs);

		expect(itsData.step1.expectedT).toBe(4);
		expect(itsData.step1.w0Aliases).toContain("pi/2");
		expect(itsData.step2.correctSymmetry).toBe("even");
		expect(itsData.step2.correctHalfWaveSymmetry).toBe(true);
		expect(itsData.step3.correctVanishing).toBe("bn_zero");
		expect(itsData.step4.correctForm).toBe("trig");

		const correctOpt5 = itsData.step5.options.find((o) => o.isCorrect);
		expect(correctOpt5?.latex).toContain("a_n=");
	});

	it("generates anti-spoiler title and complete ITS problem instance", () => {
		const problem = generateFourierSeriesProblem("triangle");
		expect(problem.title).toBe("Practice Problem: Periodic Waveform");
		expect(problem.itsData).toBeDefined();
		expect(problem.itsData.step1.expectedT).toBeGreaterThan(0);
		expect(problem.solutionSteps).toHaveLength(7);
		expect(problem.solutionSteps[0].title).not.toContain("Step 1:");
	});

	it.each([
		["square", "a_n", "F_n"],
		["square_odd", "n\\text{ odd}", "-j"],
		["square_even", "\\sin\\left(\\frac{n\\pi}{2}", "F_n"],
		["triangle", "n^2\\pi^2", "F_n"],
		["triangle_odd", "-j\\dfrac{4", "F_n"],
		["triangle_even", "n\\text{ even}", "F_n"],
		["sawtooth", "(-1)^{n+1}", "F_n"],
		["half_wave_sine", "n=1", "n=-1"],
		["full_wave_sine", "4n^2-1", "n\\ne0"],
	] as const)(
		"evaluates exact coefficient families for %s",
		(waveform, expectedA, expectedB) => {
			const problem = generateFourierSeriesProblem(waveform, {
				seed: 7,
				A: 1,
				T0: 2,
			});
			const correct = problem.itsData.step6.options.find(
				(option) => option.isCorrect,
			);

			expect(correct?.latex).toContain(expectedA);
			expect(correct?.latex).toContain(expectedB);
			expect(problem.a0Latex).toBeTruthy();
			expect(problem.anLatex).toBeTruthy();
			expect(problem.bnLatex).toBeTruthy();
			expect(problem.FnLatex).toBeTruthy();
		},
	);
});
