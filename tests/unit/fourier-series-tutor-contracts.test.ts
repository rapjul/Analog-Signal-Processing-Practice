/** Regression contracts for Fourier tutoring paths and answer ownership. */

import { renderToString } from "katex";
import { describe, expect, it, vi } from "vitest";
import { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
import {
	generateFourierSeriesProblem,
	getPrimaryCoefficientTargets,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier tutor contracts", () => {
	/** Preserves old helper calls while carrying half-wave DC in generated problems. */
	it("uses independent half-wave shortcuts without changing helper defaults", () => {
		expect(getPrimaryCoefficientTargets("trig", "even")).toEqual([
			"a0",
			"an",
		]);
		expect(getPrimaryCoefficientTargets("trig", "even", true)).toEqual([
			"an",
		]);
		expect(getPrimaryCoefficientTargets("trig", "none", true)).toEqual([
			"an",
			"bn",
		]);
		const p = generateFourierSeriesProblem("square_even", { seed: 1 });
		expect(
			p.itsData.step5.carriedCoefficients.find(({ id }) => id === "a0")
				?.reason,
		).toContain("Half-wave");
		expect(p.itsData.step3.hints.join(" ")).toContain("a_{2k}");
	});

	/** Tests both explicit paths even when they differ from the symmetry recommendation. */
	it.each(["trig", "exp"] as const)(
		"keeps assigned %s metadata and solution consistent",
		(primaryForm) => {
			for (const waveform of ["square_even", "half_wave_sine"] as const) {
				const p = generateFourierSeriesProblem(waveform, {
					seed: 1,
					primaryForm,
				});
				expect(p.itsData.step4.correctForm).toBe(primaryForm);
				expect(p.itsData.step7.form).toBe(primaryForm);
				if (primaryForm === "trig") {
					expect(p.solutionSteps[3]?.latex).not.toContain("F_n=");
					expect(p.solutionSteps[4]?.latex).not.toContain("F_n=");
				} else {
					expect(p.solutionSteps[3]?.latex).toContain("F_n=");
				}
				for (const { latex } of p.solutionSteps) {
					if (latex === undefined)
						throw new Error(
							"Every Fourier worked step must include its derivation.",
						);
					expect(() =>
						renderToString(latex, { throwOnError: true }),
					).not.toThrow();
				}
				expect(p.solutionSteps[6]?.title).toContain(
					primaryForm === "trig" ? "Trigonometric" : "Exponential",
				);
				expect(p.itsData.step4.hints[2]).toContain(
					primaryForm === "trig"
						? "Trigonometric path"
						: "Exponential path",
				);
				expect(p.itsData.step7.hints[0]).toContain(
					primaryForm === "trig" ? "cosine" : "exponential",
				);
			}
		},
	);

	/** Rejects stale and forged option objects instead of trusting caller-supplied correctness flags. */
	it("grades only active options and completes once", () => {
		const p = generateFourierSeriesProblem("full_wave_sine", { seed: 1 });
		const onComplete = vi.fn();
		const solver = new FourierSeriesStepSolverState(
			() => p,
			() => onComplete,
		);
		solver.advanceToStep(5);
		const first = p.itsData.step5.parts[0]!.options.find(
			({ isCorrect }) => isCorrect,
		)!;
		solver.checkStep5(first);
		expect(solver.step5.activeSubStepId).toBe("setup-an");
		solver.checkStep5(first);
		expect(solver.currentStep).toBe(5);
		expect(solver.step5.subSteps["setup-an"]?.isValid).toBe(false);
		const next = p.itsData.step5.parts[1]!.options.find(
			({ isCorrect }) => isCorrect,
		)!;
		solver.checkStep5({ ...next });
		expect(solver.currentStep).toBe(5);
		solver.checkStep5(next);
		expect(solver.currentStep).toBe(6);
		solver.advanceToStep(7);
		const final = p.itsData.step7.options.find(
			({ isCorrect }) => isCorrect,
		)!;
		solver.checkStep7({ ...final, isCorrect: true });
		expect(onComplete).not.toHaveBeenCalled();
		solver.checkStep7(final);
		solver.checkStep7(final);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});
