import { describe, expect, it, vi } from "vitest";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	type ConvolutionItsOption,
	type ConvolutionProblem,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution";

/** Returns the first option with the requested correctness. */
function option(
	options: ConvolutionItsOption[],
	isCorrect: boolean,
): ConvolutionItsOption {
	const match = options.find(
		(candidate) => candidate.isCorrect === isCorrect,
	);
	if (!match) throw new Error("Expected convolution tutor option.");
	return match;
}

/** Completes one multipart interval step. */
function completeParts(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
	step: 5 | 6,
): void {
	for (const part of problem.itsData[step === 5 ? "step5" : "step6"].parts) {
		if (step === 5) solver.checkStep5(option(part.options, true));
		else solver.checkStep6(option(part.options, true));
	}
}

describe("ConvolutionStepSolverState lifecycle", () => {
	it("progresses through seven parent steps and both multipart interval stages", () => {
		const problem = generateConvolutionProblem("tri_shifted_tri", {
			seed: 8,
		});
		const onComplete = vi.fn();
		const solver = new ConvolutionStepSolverState(
			() => problem,
			() => onComplete,
		);

		expect(solver.totalSteps).toBe(7);
		solver.checkStep1(option(problem.itsData.step1.options, true));
		solver.checkStep2(option(problem.itsData.step2.options, true));
		const flipX = problem.itsData.step3.options.find(
			({ id }) => id === "flip-x",
		);
		solver.checkStep3(flipX ?? null);
		expect(solver.flippedSignal).toBe("x");
		solver.checkStep4(option(problem.itsData.step4.options, true));
		completeParts(solver, problem, 5);
		completeParts(solver, problem, 6);
		solver.checkStep7(option(problem.itsData.step7.options, true));

		expect(solver.currentStep).toBe(8);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledOnce();
	});

	it("covers validation, misconception, reset, and both accepted flip paths", () => {
		const problem = generateConvolutionProblem("rect_exp", { seed: 22 });
		const solver = new ConvolutionStepSolverState(() => problem);

		solver.checkStep1(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep1(option(problem.itsData.step1.options, false));
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.checkStep1(option(problem.itsData.step1.options, true));
		solver.checkStep2(option(problem.itsData.step2.options, true));
		const flipH = problem.itsData.step3.options.find(
			({ id }) => id === "flip-h",
		);
		solver.checkStep3(flipH ?? null);
		expect(solver.flippedSignal).toBe("h");
		solver.checkStep4(option(problem.itsData.step4.options, true));
		solver.checkStep5(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep5(
			option(problem.itsData.step5.parts[0].options, false),
		);
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step5Progress.current).toBe(1);
		expect(solver.step6Progress.current).toBe(1);
	});

	it("auto-fills all steps and exposes every multipart visual state", () => {
		const problem = generateConvolutionProblem("multi_rect", { seed: 4 });
		const solver = new ConvolutionStepSolverState(() => problem);
		const states = solver.devGetVisualStates();
		expect(states.some(({ step }) => step === 7)).toBe(true);
		expect(
			states.filter(({ step, subStep }) => step === 5 && subStep),
		).toHaveLength(problem.intervals.length * 2);
		expect(
			states.filter(({ step, subStep }) => step === 6 && subStep),
		).toHaveLength(problem.intervals.length * 2);

		for (let step = 1; step <= 7; step += 1) solver.devAutoFillStep(step);
		expect(solver.isCompleted).toBe(true);
		expect(solver.devGoToVisualState("convolution.step-99")).toBe(false);
	});
});
