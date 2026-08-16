import { describe, expect, it } from "vitest";
import {
	computeFourierCoefficients,
	generateFourierItsData,
	generateFourierSeriesProblem,
} from "../../src/lib/math-engine/fourier-series";

describe("Fourier Series ITS Step Generator Engine", () => {
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
		expect(itsData.step2.misconceptions.even).toBeDefined();

		// Step 3
		expect(itsData.step3.correctVanishing).toBe("an_zero");

		// Step 4
		expect(itsData.step4.correctForm).toBe("trig");

		// Step 5
		expect(itsData.step5.options.length).toBe(4);
		const correctOpt5 = itsData.step5.options.find((o) => o.isCorrect);
		expect(correctOpt5).toBeDefined();
		expect(correctOpt5?.latex).toContain("b_n =");

		// Step 6
		expect(itsData.step6.options.length).toBe(4);
		const correctOpt6 = itsData.step6.options.find((o) => o.isCorrect);
		expect(correctOpt6).toBeDefined();
		expect(correctOpt6?.latex).toContain("\\sin");
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
		expect(itsData.step3.correctVanishing).toBe("bn_zero");
		expect(itsData.step4.correctForm).toBe("trig");

		const correctOpt5 = itsData.step5.options.find((o) => o.isCorrect);
		expect(correctOpt5?.latex).toContain("a_n =");
	});

	it("generates anti-spoiler title and complete ITS problem instance", () => {
		const problem = generateFourierSeriesProblem("triangle");
		expect(problem.title).toBe("Practice Problem: Periodic Waveform");
		expect(problem.itsData).toBeDefined();
		expect(problem.itsData.step1.expectedT).toBeGreaterThan(0);
		expect(problem.solutionSteps.length).toBeGreaterThanOrEqual(3);
	});
});
