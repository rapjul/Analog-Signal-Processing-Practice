import { describe, expect, it } from "vitest";
import {
	createCtftProblem,
	evaluateCtftSpectrum,
	evaluateEnergySpectrum,
	generateCtftProblem,
	getCtftPairLatex,
} from "$lib/math-engine/fourier-transform/index";

describe("CTFT Math Engine (fourier-transform/index.ts)", () => {
	/** Every generated prompt exposes its signal without embedding instructional prose. */
	it("provides a math-only signal while preserving the legacy prompt", () => {
		for (const family of [
			"rect",
			"exponential",
			"gaussian",
			"delta",
			"cos",
		] as const)
			for (const t0 of [-1, 0, 1]) {
				const problem = createCtftProblem(family, {
					a: 2,
					T: 2,
					w0: 3,
					t0,
				});
				expect(problem.signalLatex).toMatch(/^x\(t\) = /);
				expect(problem.signalLatex).not.toMatch(/Find|\\text/);
				expect(problem.promptLatex).toContain(problem.signalLatex);
				if (t0)
					expect(problem.signalLatex).toContain(
						t0 < 0 ? "t + 1" : "t - 1",
					);
			}
	});
	describe("CTFT Transform Pairs & Custom Operator Formatting", () => {
		it("should evaluate rectangular pulse transform to normalized sinc with \\operatorname{sinc}", () => {
			const pair = getCtftPairLatex("rect", { T: 2 });
			expect(pair.timeLatex).toContain("\\operatorname{rect}");
			expect(pair.freqLatex).toContain("\\operatorname{sinc}");
			expect(pair.freqLatex).not.toContain("\\text{sinc}");
		});

		it("should format exponential decay e^{-a t} u(t) correctly", () => {
			const pair = getCtftPairLatex("exponential", { a: 3 });
			expect(pair.timeLatex).toBe("e^{-3 t} u(t)");
			expect(pair.freqLatex).toBe("\\frac{1}{3 + j\\omega}");
		});
	});

	describe("CTFT Spectral Evaluation Functions", () => {
		it("should evaluate real magnitude |X(w)| and phase angle for 1 / (a + jw)", () => {
			const a = 2;
			const omega = 0;
			const spectrum = evaluateCtftSpectrum("exponential", { a }, omega);
			expect(spectrum.magnitude).toBeCloseTo(0.5);
			expect(spectrum.phase).toBeCloseTo(0);
		});

		it("should evaluate energy density spectrum |X(w)|^2", () => {
			const a = 2;
			const omega = 2; // |1 / (2 + 2j)|^2 = 1 / (4 + 4) = 1/8 = 0.125
			const energy = evaluateEnergySpectrum("exponential", { a }, omega);
			expect(energy).toBeCloseTo(0.125);
		});
	});

	describe("CTFT Problem Generator", () => {
		it("should generate a valid CTFT practice problem with solution steps", () => {
			const problem = generateCtftProblem("rect");
			expect(problem.id).toBeDefined();
			expect(problem.promptLatex).toContain("x(t)");
			expect(problem.solutionSteps.length).toBeGreaterThan(0);
		});
	});
});
