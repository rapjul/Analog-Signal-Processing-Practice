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
} from "$lib/math-engine/convolution/index";
import { convolutionProblem } from "$lib/testing/convolution";

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
		};
	}
	solver.checkStep3Edges();
}

/**
 * Completes remaining multipart steps through their public typed APIs.
 * @param solver - Active controller. @param problem - Concrete expected work.
 */
function completeTypedRemainder(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	while (solver.currentStep === 4) {
		answerActiveTransitionPart(solver, problem);
	}
	while (solver.currentStep === 5) {
		const id = solver.step5.activeSubStepId;
		const state = solver.step5.subSteps[id];
		if (!state) break;
		const setup = problem.itsData.step5.parts.find((part) => part.id === id)
			?.setupBySignal?.[solver.flippedSignal];
		if (!setup) throw new Error("Expected bounds setup.");
		if (state.stage === "overlap") {
			solver.chooseStep5Overlap(setup.hasOverlap);
			continue;
		}
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: [
				String(overlap.lowerCandidateValues[0]),
				String(overlap.lowerCandidateValues[1] ?? ""),
			],
			upperValues: [
				String(overlap.upperCandidateValues[0]),
				String(overlap.upperCandidateValues[1] ?? ""),
			],
			lower: overlap.lowerLatex,
			upper: overlap.upperLatex,
			splits: [...overlap.splitPointsLatex],
		}));
		solver.checkStep5();
	}
	while (solver.currentStep === 6) {
		answerActiveEvaluationPart(solver, problem);
	}
	while (solver.currentStep === 7) {
		const index = solver.step7.rows.findIndex(({ isValid }) => !isValid);
		if (index < 0) break;
		const row = solver.step7.rows[index];
		const interval = problem.intervals[index];
		if (row && interval) {
			row.input = interval.exprLatex;
			solver.checkStep7Row(index);
		}
	}
}

/** Enters the exact answer for the currently visible Step 6 field. */
function answerActiveEvaluationPart(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	const id = solver.step6.activeSubStepId;
	const state = solver.step6.subSteps[id];
	if (!state) return;
	const index = problem.itsData.step6.parts.findIndex(
		(part) => part.id === id,
	);
	const part = problem.itsData.step6.parts[index];
	const term =
		part?.evaluationBySignal?.[solver.flippedSignal]?.[
			state.activeTermIndex
		];
	const input = state.termInputs[state.activeTermIndex];
	if (state.stage === "combined")
		state.input = problem.intervals[index]?.exprLatex ?? "0";
	else if (term && input) {
		if (state.stage === "geometry-amplitude")
			input.amplitudeProduct =
				term.geometry?.amplitudeProductLatex ?? "0";
		else if (state.stage === "geometry-width")
			input.overlapWidth = term.geometry?.overlapWidthLatex ?? "0";
		else if (state.stage === "upper")
			input.upper = term.upperSubstitutionLatex;
		else if (state.stage === "lower")
			input.lower = term.lowerSubstitutionLatex;
		else input.difference = term.differenceLatex;
	}
	solver.checkStep6();
}

/** Enters the verified answer for the active Step 4 part. */
function answerActiveTransitionPart(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
	const id = solver.step4.activeSubStepId;
	const state = solver.step4.subSteps[id];
	if (!state) return;
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
			problem.itsData.step4.breakpointParts.find((part) => part.id === id)
				?.value,
		);
	solver.checkStep4();
}

/** Advances Step 4 until its active identifier matches a predicate. */
function advanceTransitionUntil(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
	predicate: (id: string) => boolean,
): void {
	while (solver.currentStep === 4 && !predicate(solver.step4.activeSubStepId))
		answerActiveTransitionPart(solver, problem);
}

describe("ConvolutionStepSolverState lifecycle and regression tests", () => {
	it.each(["x", "h"] as const)(
		"progresses through all seven steps with %s moving",
		(signal) => {
			const problem = convolutionProblem("triangle", "triangle", 8);
			const onComplete = vi.fn();
			const solver = new ConvolutionStepSolverState(
				() => problem,
				() => onComplete,
			);
			completeTiming(solver, problem);
			solver.checkStep2(option(problem.itsData.step2.options, true));
			completeFlip(solver, problem, signal);
			completeTypedRemainder(solver, problem);
			expect(solver.flippedSignal).toBe(signal);
			expect(solver.currentStep).toBe(8);
			expect(solver.isCompleted).toBe(true);
			expect(onComplete).toHaveBeenCalledOnce();
		},
	);

	it("distinguishes blank and incorrect timing values before parsing fractions and infinity", () => {
		const problem = convolutionProblem("rect", "exponential", 22);
		const solver = new ConvolutionStepSolverState(() => problem);
		const state = solver.step1.subSteps.x;
		if (!state) throw new Error("Expected state");
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("validation");
		state.start = "99";
		state.end = "1";
		state.width = "1";
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("incorrect");
		const firstPart = problem.itsData.step1.parts[0];
		if (!firstPart) throw new Error("Expected first part");
		state.start = String(firstPart.start);
		state.end = "99";
		solver.checkStep1();
		expect(solver.currentFeedbackType).toBe("incorrect");
		state.end = String(firstPart.end);
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
		const problem = convolutionProblem("rect", "rect", 3);
		const solver = new ConvolutionStepSolverState(() => problem);
		completeTiming(solver, problem);
		solver.checkStep2(option(problem.itsData.step2.options, true));
		solver.chooseMovingSignal("x");
		solver.checkStep3Formula(null);
		expect(solver.currentFeedbackType).toBe("validation");
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
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("validation");
		const expected = problem.itsData.step3.sectionsBySignal.x[0];
		if (!expected) throw new Error("Expected section.");
		const input = solver.step3.edgeInputs[expected.id];
		if (!input) throw new Error("Expected edge input.");
		input.left = expected.rightLatex;
		input.right = expected.leftLatex;
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("misconception");
		input.left = "t+99";
		input.right = expected.rightLatex;
		solver.checkStep3Edges();
		expect(solver.currentFeedbackType).toBe("incorrect");
	});

	it("places the seeded Step 3B answer in every option position deterministically", () => {
		const positions = new Set<number>();
		for (let seed = 1; seed <= 200 && positions.size < 4; seed += 1) {
			const first = convolutionProblem("rect", "rect", seed);
			const second = convolutionProblem("rect", "rect", seed);
			for (const signal of ["x", "h"] as const) {
				const firstIds = first.itsData.step3.formulaBySignal[
					signal
				].options.map(({ id }) => id);
				const secondIds = second.itsData.step3.formulaBySignal[
					signal
				].options.map(({ id }) => id);
				expect(firstIds).toEqual(secondIds);
				positions.add(
					first.itsData.step3.formulaBySignal[
						signal
					].options.findIndex(({ isCorrect }) => isCorrect),
				);
			}
		}
		expect(positions).toEqual(new Set([0, 1, 2, 3]));
	});

	it("places the seeded Step 2 answer in every option position deterministically", () => {
		const positions = new Set<number>();
		for (let seed = 0; seed < 4; seed += 1) {
			const first = convolutionProblem("rect", "rect", seed);
			const second = convolutionProblem("rect", "rect", seed);
			expect(first.itsData.step2.options.map(({ id }) => id)).toEqual(
				second.itsData.step2.options.map(({ id }) => id),
			);
			positions.add(
				first.itsData.step2.options.findIndex(
					({ isCorrect }) => isCorrect,
				),
			);
		}
		expect(positions).toEqual(new Set([0, 1, 2, 3]));
	});

	it("guides contact formulation and solving as separate typed sub-steps", () => {
		const problem = convolutionProblem();
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		advanceTransitionUntil(solver, problem, (id) => id.endsWith("-form"));
		const formId = solver.step4.activeSubStepId;
		const formState = solver.step4.subSteps[formId];
		const contact = contactFor(problem, solver.flippedSignal, formId);
		if (!contact || !formState)
			throw new Error("Expected contact formulation.");

		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		formState.input = "t+99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		formState.input = `${contact.fixed}=${contact.transformedLatex}`;
		solver.checkStep4();
		expect(solver.step4.activeSubStepId).not.toBe(formId);

		const solveId = solver.step4.activeSubStepId;
		const solveState = solver.step4.subSteps[solveId];
		if (!solveState) throw new Error("Expected solveState.");
		solveState.input = "99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		solveState.input = `t=${contact.transitionTime}`;
		solver.checkStep4();
		expect(solver.step4.activeSubStepId).not.toBe(solveId);
		expect(solver.step4.subSteps[formId]?.isValid).toBe(true);
		expect(solver.step4.subSteps[solveId]?.isValid).toBe(true);
	});

	it("normalizes negative contact substitutions and groups duplicate times", () => {
		for (const kind of [
			"rect",
			"triangle",
			"multi_rect",
			"exponential",
			"step",
		] as const) {
			const problem = convolutionProblem(kind, "triangle", 17);
			for (const signal of ["x", "h"] as const) {
				const contacts = problem.itsData.step4.transitionGroups.flatMap(
					(group) => group.contactsBySignal[signal],
				);
				for (const contact of contacts) {
					expect(contact.transformedLatex).not.toMatch(/--|\+-/);
					expect(contact.equationLatex).not.toMatch(/--|\+-/);
					if (contact.moving < 0)
						expect(contact.equationLatex).toContain(
							`(${contact.moving})`,
						);
				}
			}
		}
		const duplicateData = convolutionProblem().itsData;
		const grouped = duplicateData.step4.transitionGroups.flatMap((group) =>
			group.contactsBySignal.h.filter((contact) => contact.duplicateOf),
		);
		expect(grouped.length).toBeGreaterThan(0);
		for (const duplicate of grouped)
			expect(duplicate.transitionGroupId).toBe(
				duplicateData.step4.transitionGroups.find((group) =>
					group.contactsBySignal.h.some(
						({ id }) => id === duplicate.id,
					),
				)?.id,
			);
	});

	it("rejects incorrect transition and interval counts before boundary entry", () => {
		const problem = convolutionProblem("triangle", "rect", 18);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		advanceTransitionUntil(
			solver,
			problem,
			(id) => id === "transition-count",
		);
		const transCount = solver.step4.subSteps["transition-count"];
		if (transCount) transCount.input = "99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/distinct grouped/i);
		answerActiveTransitionPart(solver, problem);
		expect(solver.step4.activeSubStepId).toBe("interval-count");
		const intCount = solver.step4.subSteps["interval-count"];
		if (intCount) intCount.input = "1";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/one more interval/i);
	});

	it("accepts full equations as well as bare expressions for contact parts", () => {
		const problem = convolutionProblem("rect", "rect", 1);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		// Advance through section counts
		const countX = solver.step4.subSteps["section-count-x"];
		if (countX) countX.input = "1";
		solver.checkStep4();
		const countH = solver.step4.subSteps["section-count-h"];
		if (countH) countH.input = "1";
		solver.checkStep4();
		const formId = solver.step4.activeSubStepId;
		const contact = contactFor(problem, solver.flippedSignal, formId);
		if (!contact) throw new Error("Expected contact part.");
		// Test full equation with 'fixed = transformed'
		const formSub = solver.step4.subSteps[formId];
		if (formSub)
			formSub.input = `${contact.fixed} = ${contact.transformedLatex}`;
		solver.checkStep4();
		expect(solver.step4.activeSubStepId).not.toBe(formId);

		const solveId = solver.step4.activeSubStepId;
		// Test solve with 't = time'
		const solveSub = solver.step4.subSteps[solveId];
		if (solveSub) solveSub.input = `t = ${contact.transitionTime}`;
		solver.checkStep4();
		expect(solver.step4.activeSubStepId).not.toBe(solveId);
	});

	it("rejects missing, duplicate, and unsorted transition boundaries", () => {
		const problem = convolutionProblem("multi_rect", "rect", 4);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		while (
			solver.currentStep === 4 &&
			solver.step4.activeSubStepId !== "interval-builder"
		) {
			const id = solver.step4.activeSubStepId;
			const state = solver.step4.subSteps[id];
			const contact = contactFor(problem, solver.flippedSignal, id);
			if (state) {
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
			}
			solver.checkStep4();
		}
		const state = solver.step4.subSteps["interval-builder"];
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		if (state) {
			state.intervalInputs = problem.itsData.step4.intervalBoundaries.map(
				() => "0",
			);
		}
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("misconception");
		if (state) {
			state.intervalInputs = [...problem.itsData.step4.intervalBoundaries]
				.reverse()
				.map(String);
		}
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
	});

	it("validates overlap decisions and strict expressions", () => {
		const problem = convolutionProblem("triangle", "rect", 5);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 4; step += 1) solver.devAutoFillStep(step);
		const boundsState = solver.step5.subSteps[solver.step5.activeSubStepId];
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("validation");
		const setup = problem.itsData.step5.parts[0]?.setupBySignal?.h;
		if (boundsState) boundsState.hasOverlap = !setup?.hasOverlap;
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.devAutoFillStep(5);
		const expressionState =
			solver.step6.subSteps[solver.step6.activeSubStepId];
		if (expressionState) expressionState.stage = "combined";
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("validation");
		if (expressionState) expressionState.input = "not valid math";
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("validation");
		if (expressionState) expressionState.input = "999";
		solver.checkStep6();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(convolutionExpressionsMatch("(t+1)(t+1)", "(t+1)^2")).toBe(true);
		expect(convolutionExpressionsMatch("t+1", "t-1")).toBe(false);
	});

	it("checks Step 5 overlap choices immediately and validates each typed bound", () => {
		const problem = convolutionProblem("triangle", "rect", 5);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 4; step += 1) solver.devAutoFillStep(step);
		const firstId = solver.step5.activeSubStepId;
		const firstSetup = problem.itsData.step5.parts.find(
			({ id }) => id === firstId,
		)?.setupBySignal?.h;
		if (!firstSetup) throw new Error("Expected first setup.");
		solver.chooseStep5Overlap(!firstSetup.hasOverlap);
		expect(solver.currentFeedbackType).toBe("misconception");
		solver.chooseStep5Overlap(firstSetup.hasOverlap);
		if (!firstSetup.hasOverlap)
			expect(solver.step5.activeSubStepId).not.toBe(firstId);

		const interior = problem.itsData.step5.parts.find(
			(part) => part.setupBySignal?.h.hasOverlap,
		);
		if (!interior?.setupBySignal?.h)
			throw new Error("Expected an overlapping setup.");
		solver.step5.activeSubStepId = interior.id;
		const state = solver.step5.subSteps[interior.id];
		if (!state) throw new Error("Expected state");
		const setup = interior.setupBySignal.h;
		solver.chooseStep5Overlap(true);
		expect(solver.step5.activeSubStepId).toBe(interior.id);
		expect(state.stage).toBe("evaluate");
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("validation");
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: [
				String(overlap.lowerCandidateValues[0]),
				String(overlap.lowerCandidateValues[1] ?? ""),
			],
			upperValues: [
				String(overlap.upperCandidateValues[0]),
				String(overlap.upperCandidateValues[1] ?? ""),
			],
			lower: "",
			upper: "",
			splits: overlap.splitPointsLatex.map(() => ""),
		}));
		solver.checkStep5();
		expect(state?.stage).toBe("bounds");
		expect(solver.currentFeedbackType).toBeNull();
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("validation");
		if (!state) throw new Error("Expected state");
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: [
				String(overlap.lowerCandidateValues[0]),
				String(overlap.lowerCandidateValues[1] ?? ""),
			],
			upperValues: [
				String(overlap.upperCandidateValues[0]),
				String(overlap.upperCandidateValues[1] ?? ""),
			],
			lower: "99",
			upper: overlap.upperLatex,
			splits: [...overlap.splitPointsLatex],
		}));
		solver.checkStep5();
		expect(solver.currentFeedback).toMatch(/larger.*left/i);
		const firstBound = state.boundInputs[0];
		const firstOverlap = setup.overlaps[0];
		if (!firstBound || !firstOverlap)
			throw new Error("Expected first bound and overlap");
		firstBound.lower = firstOverlap.lowerLatex;
		firstBound.upper = "99";
		solver.checkStep5();
		expect(solver.currentFeedback).toMatch(/smaller.*right/i);
		firstBound.upper = firstOverlap.upperLatex;
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBeNull();
	});

	it("rejects an incorrect interior split point", () => {
		const problem = convolutionProblem("triangle", "triangle", 8);
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 4; step += 1) solver.devAutoFillStep(step);
		const part = problem.itsData.step5.parts.find((candidate) =>
			candidate.setupBySignal?.h.overlaps.some(
				({ splitPointsLatex }) => splitPointsLatex.length > 0,
			),
		);
		const setup = part?.setupBySignal?.h;
		if (!part || !setup) throw new Error("Expected an apex-split setup.");
		solver.step5.activeSubStepId = part.id;
		const state = solver.step5.subSteps[part.id];
		if (!state) throw new Error("Expected state");
		solver.chooseStep5Overlap(true);
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lowerValues: overlap.lowerCandidateValues.map(String) as [
				string,
				string,
			],
			upperValues: overlap.upperCandidateValues.map(String) as [
				string,
				string,
			],
			lower: overlap.lowerLatex,
			upper: overlap.upperLatex,
			splits: overlap.splitPointsLatex.map(() => "99"),
		}));
		solver.checkStep5();
		solver.checkStep5();
		solver.checkStep5();
		expect(state.stage).toBe("splits");
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/triangle apex/i);
	});

	it("locks carried zero rows and validates each nonzero piecewise row", () => {
		const problem = convolutionProblem();
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 6; step += 1) solver.devAutoFillStep(step);
		const locked = solver.step7.rows.filter(({ isLocked }) => isLocked);
		expect(locked.length).toBeGreaterThan(0);
		expect(
			locked.every(({ input, isValid }) => input === "0" && isValid),
		).toBe(true);
		const index = solver.step7.rows.findIndex(({ isLocked }) => !isLocked);
		expect(solver.activeHints).toEqual(problem.itsData.step7.hints);
		solver.checkStep7Row(index);
		expect(solver.currentFeedbackType).toBe("validation");
		const row = solver.step7.rows[index];
		const interval = problem.intervals[index];
		if (!row || !interval) throw new Error("Expected row and interval");
		row.input = "999";
		solver.checkStep7Row(index);
		expect(solver.currentFeedbackType).toBe("incorrect");
		row.input = "not valid math";
		solver.checkStep7Row(index);
		expect(solver.currentFeedbackType).toBe("validation");
		row.input = interval.exprLatex;
		interval.min = Number.NEGATIVE_INFINITY;
		interval.max = 2;
		solver.checkStep7Row(index);
		expect(row.isValid).toBe(true);
	});

	it("handles defensive missing-state and developer-harness branches", () => {
		const problem = convolutionProblem();
		const solver = new ConvolutionStepSolverState(() => problem);
		delete solver.step1.subSteps.x;
		solver.checkStep1();
		solver.reset();
		solver.chooseMovingSignal("h");
		delete solver.step4.subSteps[solver.step4.activeSubStepId];
		solver.checkStep4();
		solver.reset();
		for (let step = 1; step <= 4; step += 1) solver.devAutoFillStep(step);
		delete solver.step5.subSteps[solver.step5.activeSubStepId];
		solver.chooseStep5Overlap(false);
		solver.checkStep5();
		solver.reset();
		for (let step = 1; step <= 5; step += 1) solver.devAutoFillStep(step);
		delete solver.step6.subSteps[solver.step6.activeSubStepId];
		solver.checkStep6();
		solver.reset();
		solver.step1.activeSubStepId = "missing-step";
		expect(solver.activeHints).toEqual([]);
		solver.reset();
		solver.currentStep = 4;
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		const subStep4 = solver.step4.subSteps[solver.step4.activeSubStepId];
		if (subStep4) subStep4.input = "99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		solver.reset();
		expect(solver.devGoToVisualState("not-a-state")).toBe(false);
		solver.currentStep = 3;
		solver.step3.activeSubStepId = "missing-step";
		expect(solver.activeHints).toEqual([]);
		solver.currentStep = 4;
		solver.step4.activeSubStepId = "missing-step";
		expect(solver.activeHints).toEqual([]);
		solver.currentStep = 5;
		solver.step5.activeSubStepId = "missing-step";
		expect(solver.activeHints).toEqual([]);
		solver.currentStep = 6;
		solver.step6.activeSubStepId = "missing-step";
		expect(solver.activeHints).toEqual([]);
		solver.reset();
		solver.devAutoFillStep();
		solver.devAutoFillStep(99);
		class StalledSolver extends ConvolutionStepSolverState {
			override devAutoFillStep(): void {}
		}
		const stalled = new StalledSolver(() => problem);
		expect(stalled.devGoToVisualState("convolution.step-02")).toBe(false);
	});

	it("covers sparse scaffold fallbacks and unbounded expression sampling", () => {
		const problem = convolutionProblem();
		const sparseProblem = {
			...problem,
			itsData: {
				...problem.itsData,
				step1: { ...problem.itsData.step1, parts: [] },
				step5: { ...problem.itsData.step5, parts: [] },
				step6: { ...problem.itsData.step6, parts: [] },
			},
		};
		const sparse = new ConvolutionStepSolverState(() => sparseProblem);
		expect(sparse.step1.activeSubStepId).toBe("x");
		expect(sparse.step5.activeSubStepId).toBe("setup-placeholder");
		expect(sparse.step6.activeSubStepId).toBe("interval-placeholder");

		const solver = new ConvolutionStepSolverState(() => problem);
		completeTiming(solver, problem);
		solver.checkStep2(option(problem.itsData.step2.options, true));
		solver.chooseMovingSignal("h");
		solver.checkStep3Formula({
			id: "feedback-fallback",
			latex: "0",
			isCorrect: false,
		});
		expect(solver.currentFeedback).toMatch(/does not match/i);
		completeFlip(solver, problem, "h");
		solver.devAutoFillStep(4);
		solver.devAutoFillStep(5);
		const evaluationId = solver.step6.activeSubStepId;
		const intervalIndex = problem.itsData.step6.parts.findIndex(
			({ id }) => id === evaluationId,
		);
		const interval = problem.intervals[intervalIndex];
		const subStep6 = solver.step6.subSteps[evaluationId];
		if (!interval || !subStep6)
			throw new Error("Expected interval and subStep6");
		interval.min = Number.NEGATIVE_INFINITY;
		interval.max = Number.POSITIVE_INFINITY;
		interval.eval = () => 0;
		subStep6.stage = "combined";
		subStep6.input = interval.exprLatex;
		solver.checkStep6();
		expect(subStep6.isValid).toBe(true);
	});

	it("returns false when a visual substep has no compatible current state", () => {
		const problem = convolutionProblem();
		class MissingCurrentStateSolver extends ConvolutionStepSolverState {
			override get currentStepState(): undefined {
				return undefined;
			}
		}
		const solver = new MissingCurrentStateSolver(() => problem);
		expect(
			solver.devGoToVisualState("convolution.step-03.choose-formula"),
		).toBe(false);
	});

	it("guards malformed developer metadata without advancing", () => {
		const problem = convolutionProblem();
		const noIncorrect = {
			...problem,
			itsData: {
				...problem.itsData,
				step2: {
					...problem.itsData.step2,
					options: problem.itsData.step2.options.filter(
						({ isCorrect }) => isCorrect,
					),
				},
			},
		};
		const noIncorrectSolver = new ConvolutionStepSolverState(
			() => noIncorrect,
		);
		expect(
			noIncorrectSolver.devGoToVisualState(
				"convolution.step-02.misconception",
			),
		).toBe(false);

		class UnknownSubstepSolver extends ConvolutionStepSolverState {
			override devGetVisualStates() {
				return [
					{
						id: "unknown-substep",
						label: "Unknown substep",
						step: 1,
						subStep: "missing",
						kind: "interactive" as const,
					},
				];
			}
		}
		const unknown = new UnknownSubstepSolver(() => problem);
		expect(unknown.devGoToVisualState("unknown-substep")).toBe(false);

		const missingTiming = convolutionProblem("rect", "rect", 13);
		const missingTimingSolver = new ConvolutionStepSolverState(
			() => missingTiming,
		);
		missingTiming.itsData.step1.parts = [];
		missingTimingSolver.devAutoFillStep(1);
		expect(missingTimingSolver.currentStep).toBe(1);

		const missingSetup = convolutionProblem("rect", "rect", 14);
		const missingSetupSolver = new ConvolutionStepSolverState(
			() => missingSetup,
		);
		for (let step = 1; step <= 4; step += 1)
			missingSetupSolver.devAutoFillStep(step);
		const activePart = missingSetup.itsData.step5.parts.find(
			({ id }) => id === missingSetupSolver.step5.activeSubStepId,
		);
		if (!activePart) throw new Error("Expected active Step 5 part.");
		activePart.setupBySignal = undefined;
		missingSetupSolver.devAutoFillStep(5);
		expect(missingSetupSolver.currentStep).toBe(5);
	});

	/** Undefined and unsupported answers on infinite reflected edges remain validation feedback. */
	it.each(["x", "h"] as const)(
		"preserves invalid infinite-edge feedback when moving %s",
		/** @param moving - Reflected exponential signal. */
		(moving) => {
			const problem = convolutionProblem(
				"exponential",
				"exponential",
				13,
			);
			const solver = new ConvolutionStepSolverState(
				/** Returns the unbounded regression problem. */ () => problem,
			);
			solver.currentStep = 3;
			solver.chooseMovingSignal(moving);
			solver.checkStep3Formula(
				option(
					problem.itsData.step3.formulaBySignal[moving].options,
					true,
				),
			);
			const sections = problem.itsData.step3.sectionsBySignal[moving];
			for (const section of sections)
				solver.step3.edgeInputs[section.id] = {
					left: section.leftLatex,
					right: section.rightLatex,
				};
			const section = sections[0];
			if (!section) throw new Error("Expected exponential section.");
			expect(section.leftLatex).toContain("\\infty");
			const input = solver.step3.edgeInputs[section.id];
			if (!input) throw new Error("Expected infinite edge input.");
			for (const [answer, diagnostic] of [
				["(t", /bracket/i],
				["1/0", /zero/i],
				["sqrt(t)", /polynomial/i],
			] as const) {
				input.left = answer;
				solver.checkStep3Edges();
				expect(solver.currentFeedbackType).toBe("validation");
				expect(solver.currentFeedback).toMatch(diagnostic);
				expect(solver.currentStep).toBe(3);
				expect(solver.step3.subSteps["transform-edges"]?.isValid).toBe(
					false,
				);
			}
			input.left = section.leftLatex;
			solver.checkStep3Edges();
			expect(solver.currentStep).toBe(4);
		},
	);

	/** Resource limits explain failed validation without advancing or completing the tutor. */
	it("shows specific resource-limit feedback on final rows without advancing", () => {
		const problem = convolutionProblem("rect", "rect", 13);
		const solver = new ConvolutionStepSolverState(
			/** Returns the fixed regression problem. */ () => problem,
		);
		solver.currentStep = 7;
		const index = solver.step7.rows.findIndex(({ isLocked }) => !isLocked);
		const row = solver.step7.rows[index];
		if (!row) throw new Error("Expected an editable output row.");
		for (const [answer, message] of [
			["1".repeat(16385), /shorten.*16,384/],
			[
				Array.from(
					{ length: 65 },
					/** @param unused - Unused array entry. @param index - Distinct exponential rate. */
					(unused, index) => `e^{${index}t}`,
				).join("+"),
				/verification limits/,
			],
		] as const) {
			row.input = answer;
			solver.checkStep7Row(index);
			expect(solver.currentFeedbackType).toBe("validation");
			expect(solver.currentFeedback).toMatch(message);
			expect(row.isValid).toBe(false);
			expect(solver.currentStep).toBe(7);
			expect(solver.isCompleted).toBe(false);
		}
	});

	/** Developer helpers stop after one rejected check instead of freezing the harness. */
	it.each([
		[1, "checkStep1"],
		[4, "checkStep4"],
		[5, "checkStep5"],
		[5, "chooseStep5Overlap"],
		[6, "checkStep6"],
	] as const)(
		"stops Step %s auto-fill when %s cannot progress",
		/** @param step - Parent step to exercise. @param method - Real validation entry point. */
		(step, method) => {
			const problem = convolutionProblem("rect", "rect", 13);
			const solver = new ConvolutionStepSolverState(() => problem);
			for (let parent = 1; parent < step; parent++)
				solver.devAutoFillStep(parent);
			expect(solver.currentStep).toBe(step);
			const check = vi.spyOn(solver, method).mockImplementation(
				/** Reject without progress; a repeated check fails immediately instead of hanging. */
				() => {
					if (check.mock.calls.length > 1)
						throw new Error("Repeated stalled validation.");
				},
			);
			solver.devAutoFillStep(step);
			expect(check).toHaveBeenCalledTimes(1);
			expect(solver.currentStep).toBe(step);
		},
	);

	it("resets typed state and exposes all parent visual states", () => {
		const problem = convolutionProblem("multi_rect", "rect", 4);
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
		expect(solver.currentStepState).toBeUndefined();
		expect(solver.activeHints).toEqual([]);
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step1.subSteps.x?.start).toBe("");
		expect(solver.step5Progress.current).toBe(1);
	});
});
