import { describe, expect, it, vi } from "vitest";
import { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	type ConvolutionItsOption,
	type ConvolutionProblem,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution";

/** Returns the single correct option from a tutor choice collection. */
function getCorrectOption<T extends { isCorrect: boolean }>(options: T[]): T {
	const correct = options.find(({ isCorrect }) => isCorrect);
	if (!correct)
		throw new Error("Expected one correct convolution tutor option.");
	return correct;
}

/** Returns the first incorrect option from a tutor choice collection. */
function getIncorrectOption<T extends { isCorrect: boolean }>(options: T[]): T {
	const incorrect = options.find(({ isCorrect }) => !isCorrect);
	if (!incorrect)
		throw new Error("Expected one incorrect convolution tutor option.");
	return incorrect;
}

/** Advances the first three parent steps to the interval evaluator. */
function advanceToStep4(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	solver.checkStep1(getCorrectOption(problem.itsData.step1.options));
	solver.checkStep2(getCorrectOption(problem.itsData.step2.options));
	solver.checkStep3(getCorrectOption(problem.itsData.step3.options));
}

describe("ConvolutionStepSolverState lifecycle", () => {
	it("progresses through all parent steps and every dynamic interval part", () => {
		const problem = generateConvolutionProblem("rect_rect");
		const onComplete = vi.fn();
		const solver = new ConvolutionStepSolverState(
			() => problem,
			() => onComplete,
		);

		expect(solver.currentStep).toBe(1);
		expect(solver.totalSteps).toBe(5);
		expect(solver.isCompleted).toBe(false);

		solver.checkStep1(getCorrectOption(problem.itsData.step1.options));
		expect(solver.currentStep).toBe(2);
		solver.checkStep2(getCorrectOption(problem.itsData.step2.options));
		expect(solver.currentStep).toBe(3);
		solver.checkStep3(getCorrectOption(problem.itsData.step3.options));
		expect(solver.currentStep).toBe(4);

		for (const [index, part] of problem.itsData.step4.parts.entries()) {
			expect(solver.step4Progress.current).toBe(index + 1);
			expect(solver.step4.activeSubStepId).toBe(part.id);
			solver.checkStep4(getCorrectOption(part.options));
		}

		expect(solver.currentStep).toBe(5);
		solver.checkStep5(getCorrectOption(problem.itsData.step5.options));
		expect(solver.isCompleted).toBe(true);
		expect(solver.currentStep).toBe(6);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("classifies targeted misconceptions and resets for a new attempt", () => {
		const problem = generateConvolutionProblem("rect_exp");
		const solver = new ConvolutionStepSolverState(() => problem);
		const incorrect = problem.itsData.step1.options.find(
			({ isCorrect }) => !isCorrect,
		);
		if (!incorrect) throw new Error("Expected a convolution distractor.");

		solver.checkStep1(incorrect);
		expect(solver.currentStep).toBe(1);
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(solver.currentFeedback).toBe(incorrect.feedback);

		solver.revealNextHint();
		expect(solver.hintTier).toBe(1);
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.hintTier).toBe(0);
		expect(solver.currentFeedback).toBe("");
		expect(solver.step4.subStepOrder).toHaveLength(
			problem.intervals.length,
		);
	});

	it("covers validation, misconception, and success branches for every parent step", () => {
		const problem = generateConvolutionProblem("step_rect");
		const solver = new ConvolutionStepSolverState(() => problem);

		solver.checkStep1(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep1(getIncorrectOption(problem.itsData.step1.options));
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.checkStep1(getCorrectOption(problem.itsData.step1.options));
		expect(solver.currentStep).toBe(2);

		solver.checkStep2(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep2(getIncorrectOption(problem.itsData.step2.options));
		expect(solver.step2.selected).toBeTruthy();
		solver.checkStep2(getCorrectOption(problem.itsData.step2.options));

		solver.checkStep3(null);
		expect(solver.currentFeedback).toContain("complete transition-time");
		solver.checkStep3(getIncorrectOption(problem.itsData.step3.options));
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.checkStep3(getCorrectOption(problem.itsData.step3.options));

		const firstPart = problem.itsData.step4.parts[0];
		solver.checkStep4(null);
		expect(solver.currentFeedbackType).toBe("validation");
		const feedbacklessWrong: ConvolutionItsOption = {
			...getIncorrectOption(firstPart.options),
			feedback: undefined,
		};
		solver.checkStep4(feedbacklessWrong);
		expect(solver.currentFeedback).toContain(
			"Re-evaluate the overlap integral",
		);
		for (const part of problem.itsData.step4.parts) {
			solver.checkStep4(getCorrectOption(part.options));
		}
		expect(solver.currentStep).toBe(5);

		solver.checkStep5(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep5(getIncorrectOption(problem.itsData.step5.options));
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.checkStep5(getCorrectOption(problem.itsData.step5.options));
		expect(solver.currentStepState).toBeUndefined();
		expect(solver.activeHints).toEqual([]);
	});

	it("exposes the correct active state and hint collection at each step", () => {
		const problem = generateConvolutionProblem("rect_exp");
		const solver = new ConvolutionStepSolverState(() => problem);
		const expectedStates = [solver.step1, solver.step2, solver.step3];

		for (let step = 1; step <= 3; step += 1) {
			expect(solver.currentStepState).toBe(expectedStates[step - 1]);
			expect(solver.activeHints).toEqual(
				problem.itsData[`step${step}` as "step1"].hints,
			);
			solver.devAutoFillStep();
		}

		expect(solver.currentStepState).toBe(solver.step4);
		expect(solver.activeHints).toEqual(
			problem.itsData.step4.parts[0].hints,
		);
		solver.devAutoFillStep(4);
		expect(solver.currentStepState).toBe(solver.step5);
		expect(solver.activeHints).toEqual(problem.itsData.step5.hints);
	});

	it("navigates every declared visual state and reveals diagnostic variants", () => {
		const problem = generateConvolutionProblem("rect_rect");
		const solver = new ConvolutionStepSolverState(() => problem);
		const states = solver.devGetVisualStates();
		expect(states).toHaveLength(6 + problem.itsData.step4.parts.length * 2);

		for (const state of states) {
			expect(solver.devGoToVisualState(state.id), state.id).toBe(true);
			expect(solver.currentStep).toBe(state.step);
			if (state.subStep) {
				expect(solver.step4.activeSubStepId).toBe(state.subStep);
			}
			if (state.kind === "hint") {
				expect(solver.hintTier).toBe(solver.activeHints.length);
			}
		}

		expect(solver.devGoToVisualState("convolution.step-99.unknown")).toBe(
			false,
		);
		vi.spyOn(solver, "devGetVisualStates").mockReturnValue([
			{
				id: "convolution.custom-recognized-state",
				label: "Custom recognized state",
				step: 1,
				kind: "interactive",
			},
		]);
		expect(
			solver.devGoToVisualState("convolution.custom-recognized-state"),
		).toBe(false);
	});

	it("auto-fills explicit steps, all interval parts, and ignores unknown steps", () => {
		const problem = generateConvolutionProblem("multi_rect");
		const onComplete = vi.fn();
		const solver = new ConvolutionStepSolverState(
			() => problem,
			() => onComplete,
		);

		solver.devAutoFillStep(99);
		expect(solver.currentStep).toBe(1);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		expect(solver.currentStep).toBe(4);
		solver.devAutoFillStep(4);
		expect(solver.currentStep).toBe(5);
		solver.devAutoFillStep(5);
		expect(solver.isCompleted).toBe(true);
		expect(onComplete).toHaveBeenCalledOnce();
	});

	it("normalizes an empty interval challenge and stops auto-fill without answers", () => {
		const source = generateConvolutionProblem("step_exp");
		const problem: ConvolutionProblem = {
			...source,
			itsData: {
				...source.itsData,
				step4: { parts: [] },
			},
		};
		const solver = new ConvolutionStepSolverState(() => problem);
		advanceToStep4(solver, problem);

		expect(solver.step4.subStepOrder).toEqual(["interval-placeholder"]);
		expect(solver.activeHints).toEqual([]);
		solver.devAutoFillStep(4);
		expect(solver.currentStep).toBe(4);
		solver.checkStep4(null);
		expect(solver.currentFeedbackType).toBe("validation");
		solver.checkStep4({ id: "fallback", latex: "0", isCorrect: true });
		expect(solver.currentStep).toBe(5);
	});

	it("fails developer preparation safely when required correct or incorrect choices are absent", () => {
		const source = generateConvolutionProblem("rect_rect");
		const noCorrectStep1: ConvolutionProblem = {
			...source,
			itsData: {
				...source.itsData,
				step1: {
					...source.itsData.step1,
					options: source.itsData.step1.options.filter(
						({ isCorrect }) => !isCorrect,
					),
				},
			},
		};
		const stalled = new ConvolutionStepSolverState(() => noCorrectStep1);
		expect(
			stalled.devGoToVisualState("convolution.step-02.flip-shift"),
		).toBe(false);

		const noWrongStep2: ConvolutionProblem = {
			...source,
			itsData: {
				...source.itsData,
				step2: {
					...source.itsData.step2,
					options: source.itsData.step2.options.filter(
						({ isCorrect }) => isCorrect,
					),
				},
			},
		};
		const noDiagnostic = new ConvolutionStepSolverState(() => noWrongStep2);
		expect(
			noDiagnostic.devGoToVisualState(
				"convolution.step-02.flip-shift.misconception",
			),
		).toBe(false);

		const parts = source.itsData.step4.parts;
		const missingPriorAnswer: ConvolutionProblem = {
			...source,
			itsData: {
				...source.itsData,
				step4: {
					parts: parts.map((part, index) =>
						index === 0
							? {
									...part,
									options: part.options.filter(
										({ isCorrect }) => !isCorrect,
									),
								}
							: part,
					),
				},
			},
		};
		const intervalStalled = new ConvolutionStepSolverState(
			() => missingPriorAnswer,
		);
		expect(
			intervalStalled.devGoToVisualState(
				`convolution.step-04.${parts[1].id}`,
			),
		).toBe(false);
	});
});
