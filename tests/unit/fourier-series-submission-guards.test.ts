/** Regression coverage for stale, out-of-order, and post-completion grading calls. */
import { describe, expect, it, vi } from "vitest";
import { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
import {
	FOURIER_SERIES_WAVEFORM_TYPES,
	generateFourierSeriesProblem,
} from "$lib/math-engine/fourier-series/index";

describe("Fourier early-step submission guards", () => {
	/** Exercises the same parent and sub-step guards for every supported waveform. */
	it.each(FOURIER_SERIES_WAVEFORM_TYPES)(
		"ignores stale submissions for %s",
		(waveform) => {
			const p = generateFourierSeriesProblem(waveform, { seed: 1 });
			const completed = vi.fn();
			const s = new FourierSeriesStepSolverState(
				() => p,
				() => completed,
			);
			s.checkStep2HalfWave(p.coeffs.hasHalfWaveSymmetry);
			s.checkStep2OriginParity(p.coeffs.originParity);
			s.checkStep3(p.itsData.step3.correctVanishing);
			s.checkStep4(p.itsData.step4.correctForm);
			expect(s.currentStep).toBe(1);
			expect(s.step2.subSteps["origin-parity"].isValid).toBe(false);
			expect(s.step4.selected).toBeNull();
			Object.assign(s.step1, {
				period: String(p.coeffs.T0),
				freq: p.itsData.step1.w0Aliases[0],
			});
			s.checkStep1();
			expect(s.currentStep).toBe(2);
			s.checkStep2HalfWave(p.coeffs.hasHalfWaveSymmetry);
			expect(s.step2.activeSubStepId).toBe("origin-parity");
			s.checkStep2OriginParity(p.coeffs.originParity);
			s.checkStep2OriginParity(
				p.coeffs.originParity === "even" ? "odd" : "even",
			);
			expect(s.step2.subSteps["origin-parity"].isValid).toBe(true);
			expect(s.step2.activeSubStepId).toBe("half-wave");
			s.checkStep2HalfWave(p.coeffs.hasHalfWaveSymmetry);
			s.checkStep1();
			s.checkStep2HalfWave(p.coeffs.hasHalfWaveSymmetry);
			expect(s.currentStep).toBe(3);
			s.checkStep3(p.itsData.step3.correctVanishing);
			s.checkStep3(p.itsData.step3.correctVanishing);
			expect(s.currentStep).toBe(4);
			s.checkStep4(p.itsData.step4.correctForm);
			expect(s.currentStep).toBe(5);
			s.advanceToStep(7);
			s.checkStep7(
				p.itsData.step7.options.find(({ isCorrect }) => isCorrect)!,
			);
			s.checkStep1();
			s.checkStep2OriginParity(p.coeffs.originParity);
			s.checkStep2HalfWave(p.coeffs.hasHalfWaveSymmetry);
			s.checkStep3(p.itsData.step3.correctVanishing);
			s.checkStep4(p.itsData.step4.correctForm);
			expect(s.currentStep).toBe(8);
			expect(s.isCompleted).toBe(true);
			expect(completed).toHaveBeenCalledTimes(1);
			s.reset();
			s.checkStep4(p.itsData.step4.correctForm);
			expect(s.currentStep).toBe(1);
			expect(s.isCompleted).toBe(false);
		},
	);
});
