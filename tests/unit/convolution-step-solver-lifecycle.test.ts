import { describe, expect, it, vi } from "vitest";
import {
	ConvolutionStepSolverState,
	convolutionExpressionsMatch,
	parseConvolutionScalarInput,
} from "$lib/components/solvers/convolution-step-solver.svelte";
import {
	type ConvolutionBreakpointContact,
	type ConvolutionItsOption,
	type ConvolutionMovingSignal,
	type ConvolutionProblem,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution";

/** Finds the guided contact represented by one Step 4 substep identifier. */
function contactFor(
	problem: ConvolutionProblem,
	signal: ConvolutionMovingSignal,
	id: string,
): ConvolutionBreakpointContact | undefined {
	return problem.itsData.step4.transitionGroups
		.flatMap((group) => group.contactsBySignal[signal])
		.find(({ id: contactId }) => id.startsWith(contactId));
}

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

/** Completes Step 1 through the public typed-answer API. */
function completeTiming(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	while (solver.currentStep === 1) {
		const state = solver.step1.subSteps[solver.step1.activeSubStepId];
		const expected = problem.itsData.step1.parts.find(
			({ id }) => id === solver.step1.activeSubStepId,
		);
		if (!state || !expected) throw new Error("Expected timing part.");
		state.start = String(expected.start);
		state.end = String(expected.end);
		state.width = String(expected.width);
		solver.checkStep1();
	}
}

/** Completes the selected Step 3 path through formula and edge validation. */
function completeFlip(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
	signal: ConvolutionMovingSignal,
): void {
	solver.chooseMovingSignal(signal);
	solver.checkStep3Formula(
		option(problem.itsData.step3.formulaBySignal[signal].options, true),
	);
	for (const expected of problem.itsData.step3.sectionsBySignal[signal]) {
		solver.step3.edgeInputs[expected.id] = {
			left: expected.leftLatex,
			right: expected.rightLatex,
			includedEndpoint: expected.includedEndpoint,
		};
	}
	solver.checkStep3Edges();
}

/** Completes every remaining multipart step through its typed public API. */
function completeTypedRemainder(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	while (solver.currentStep === 4) {
		const id = solver.step4.activeSubStepId;
		const state = solver.step4.subSteps[id];
		const contact = contactFor(problem, solver.flippedSignal, id);
		if (id === "interval-builder")
			state.intervalInputs =
				problem.itsData.step4.intervalBoundaries.map(String);
		else if (id === "section-count-x")
			state.input = String(problem.itsData.step4.sectionCounts.x);
		else if (id === "section-count-h")
			state.input = String(problem.itsData.step4.sectionCounts.h);
		else if (contact)
			state.input = id.endsWith("-form")
				? contact.transformedLatex
				: String(contact.transitionTime);
		else if (id === "transition-count")
			state.input = String(problem.itsData.step4.transitionGroups.length);
		else if (id === "interval-count")
			state.input = String(problem.itsData.step4.intervalLabels.length);
		else
			state.input = String(
				problem.itsData.step4.breakpointParts.find(
					(part) => part.id === id,
				)?.value,
			);
		solver.checkStep4();
	}
	while (solver.currentStep === 5) {
		const id = solver.step5.activeSubStepId;
		const state = solver.step5.subSteps[id];
		const setup = problem.itsData.step5.parts.find((part) => part.id === id)
			?.setupBySignal?.[solver.flippedSignal];
		if (!setup) throw new Error("Expected bounds setup.");
		state.hasOverlap = setup.hasOverlap;
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lower: overlap.lowerLatex,
			upper: overlap.upperLatex,
			splits: [...overlap.splitPointsLatex],
		}));
		solver.checkStep5();
	}
	while (solver.currentStep === 6) {
		const id = solver.step6.activeSubStepId;
		const index = problem.itsData.step6.parts.findIndex(
			(part) => part.id === id,
		);
		solver.step6.subSteps[id].input =
			problem.intervals[index]?.exprLatex ?? "0";
		solver.checkStep6();
	}
}

describe("ConvolutionStepSolverState lifecycle", () => {
	it.each(["x", "h"] as const)(
		"progresses through all seven steps with %s moving",
		(signal) => {
			const problem = generateConvolutionProblem("tri_shifted_tri", {
				seed: 8,
			});
			const onComplete = vi.fn();
			const solver = new ConvolutionStepSolverState(
				() => problem,
				() => onComplete,
			);
			completeTiming(solver, problem);
			solver.checkStep2(option(problem.itsData.step2.options, true));
			completeFlip(solver, problem, signal);
			completeTypedRemainder(solver, problem);
			solver.checkStep7(option(problem.itsData.step7.options, true));
			expect(solver.flippedSignal).toBe(signal);
			expect(solver.currentStep).toBe(8);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledOnce();
		},
	);

	it("distinguishes blank and incorrect timing values before parsing fractions and infinity", () => {
		const problem = generateConvolutionProblem("rect_exp", { seed: 22 });
		const solver = new ConvolutionStepSolverState(() => problem);
		const state = solver.step1.subSteps.x;
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("validation");
		state.start = "99";
		state.end = "1";
		state.width = "1";
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("incorrect");
		state.start = String(problem.itsData.step1.parts[0].start);
		state.end = "99";
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("incorrect");
		state.end = String(problem.itsData.step1.parts[0].end);
		state.width = "99";
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("misconception");
		expect(parseConvolutionScalarInput("1/2")).toBe(0.5);
		expect(parseConvolutionScalarInput("+inf")).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(parseConvolutionScalarInput("-\\infty")).toBe(
			Number.NEGATIVE_INFINITY,
		);
	});

	it("targets path mismatch, shifted-only formulas, reversed edges, shifts, and endpoints", () => {
		const problem = generateConvolutionProblem("rect_shifted_rect", {
			seed: 3,
		});
		const solver = new ConvolutionStepSolverState(() => problem);
		completeTiming(solver, problem);
		solver.checkStep2(option(problem.itsData.step2.options, true));
		solver.chooseMovingSignal("x");
		const choices = problem.itsData.step3.formulaBySignal.x.options;
		for (const id of [
			"formula-x-no-flip",
			"formula-x-other-path",
			"formula-x-other-no-flip",
		]) {
			solver.checkStep3Formula(
				choices.find((choice) => choice.id === id) ?? null,
			);
			expect(solver.currentFeedbackType).toBe("misconception");
		}
		solver.checkStep3Formula(option(choices, true));
		const expected = problem.itsData.step3.sectionsBySignal.x[0];
		const input = solver.step3.edgeInputs[expected.id];
		input.left = expected.rightLatex;
		input.right = expected.leftLatex;
		input.includedEndpoint = expected.includedEndpoint;
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("misconception");
		input.left = "t+99";
		input.right = expected.rightLatex;
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("incorrect");
		input.left = expected.leftLatex;
		input.includedEndpoint = "neither";
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("misconception");
	});

	it("rejects missing, duplicate, and unsorted transition boundaries", () => {
		const problem = generateConvolutionProblem("multi_rect", { seed: 4 });
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		while (
			solver.currentStep === 4 &&
			solver.step4.activeSubStepId !== "interval-builder"
		) {
			const id = solver.step4.activeSubStepId;
			const state = solver.step4.subSteps[id];
			const contact = contactFor(problem, solver.flippedSignal, id);
			if (id === "section-count-x")
				state.input = String(problem.itsData.step4.sectionCounts.x);
			else if (id === "section-count-h")
				state.input = String(problem.itsData.step4.sectionCounts.h);
			else if (contact)
				state.input = id.endsWith("-form")
					? contact.transformedLatex
					: String(contact.transitionTime);
			else if (id === "transition-count")
				state.input = String(
					problem.itsData.step4.transitionGroups.length,
				);
			else if (id === "interval-count")
				state.input = String(
					problem.itsData.step4.intervalLabels.length,
				);
			else
				state.input = String(
					problem.itsData.step4.breakpointParts.find(
						(part) => part.id === id,
					)?.value,
				);
			solver.checkStep4();
		}
		const state = solver.step4.subSteps["interval-builder"];
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		state.intervalInputs = problem.itsData.step4.intervalBoundaries.map(
			() => "0",
		);
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("misconception");
		state.intervalInputs = [...problem.itsData.step4.intervalBoundaries]
			.reverse()
			.map(String);
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
	});

	it("validates overlap decisions and strict expressions", () => {
		const problem = generateConvolutionProblem("tri_rect", { seed: 5 });
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 4; step += 1) solver.devAutoFillStep(step);
		const boundsState = solver.step5.subSteps[solver.step5.activeSubStepId];
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("validation");
		const setup = problem.itsData.step5.parts[0].setupBySignal?.h;
		boundsState.hasOverlap = !setup?.hasOverlap;
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.devAutoFillStep(5);
		const expressionState =
			solver.step6.subSteps[solver.step6.activeSubStepId];
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("validation");
		expressionState.input = "not valid math";
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("validation");
		expressionState.input = "999";
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(convolutionExpressionsMatch("(t+1)(t+1)", "(t+1)^2")).toBe(true);
		expect(convolutionExpressionsMatch("t+1", "t-1")).toBe(false);
	});

	it("resets typed state and exposes all parent visual states", () => {
		const problem = generateConvolutionProblem("multi_rect", { seed: 4 });
		const solver = new ConvolutionStepSolverState(() => problem);
		expect(
			new Set(solver.devGetVisualStates().map(({ step }) => step)),
		).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
		expect(solver.devGetVisualStates().length).toBeGreaterThan(7);
		expect(
			solver
				.devGetVisualStates()
				.some(({ kind }) => kind === "diagnostic"),
		).toBe(true);
		expect(
			solver.devGoToVisualState("convolution.step-02.misconception"),
		).toBe(true);
		expect(solver.currentFeedbackType).toBe("misconception");
		for (let step = 1; step <= 7; step += 1) solver.devAutoFillStep(step);
		expect(solver.isCompleted).toBe(true);
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step1.subSteps.x.start).toBe("");
		expect(solver.step5Progress.current).toBe(1);
	});
});
