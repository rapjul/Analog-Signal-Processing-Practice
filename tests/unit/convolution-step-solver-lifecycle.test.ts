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
} from "$lib/math-engine/convolution/index";
import { buildConvolutionItsData } from "$lib/math-engine/convolution/its-scaffolding/index";

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

/** Enters the verified answer for the active Step 4 part. */
function answerActiveTransitionPart(
	solver: ConvolutionStepSolverState,
	problem: ConvolutionProblem,
): void {
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

	it("places the seeded Step 3B answer in every option position deterministically", () => {
		const positions = new Set<number>();
		for (let seed = 1; seed <= 200 && positions.size < 4; seed += 1) {
			const first = generateConvolutionProblem("rect_rect", { seed });
			const second = generateConvolutionProblem("rect_rect", { seed });
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

	it("guides contact formulation and solving as separate typed phases", () => {
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		advanceTransitionUntil(solver, problem, (id) => id.endsWith("-form"));
		const formId = solver.step4.activeSubStepId;
		const formState = solver.step4.subSteps[formId];
		const contact = contactFor(problem, solver.flippedSignal, formId);
		if (!contact) throw new Error("Expected contact formulation.");

		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		formState.input = `${contact.fixed}=${contact.transformedLatex}`;
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		formState.input = "t+99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		formState.input = contact.transformedLatex;
		solver.checkStep4();

		const solveId = solver.step4.activeSubStepId;
		const solveState = solver.step4.subSteps[solveId];
		solveState.input = `t=${contact.transitionTime}`;
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("validation");
		solveState.input = "99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		solveState.input = String(contact.transitionTime);
		solver.checkStep4();
		expect(solver.step4.subSteps[formId].isValid).toBe(true);
		expect(solver.step4.subSteps[solveId].isValid).toBe(true);
	});

	it("normalizes negative contact substitutions and groups duplicate times", () => {
		for (const kind of [
			"rect_rect",
			"tri_rect",
			"tri_shifted_tri",
			"multi_rect",
			"rect_exp",
		] as const) {
			const problem = generateConvolutionProblem(kind, { seed: 17 });
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
		const duplicateData = buildConvolutionItsData({
			seed: 12,
			intervals: [
				{
					min: Number.NEGATIVE_INFINITY,
					max: 0,
					exprLatex: "0",
					labelLatex: "t<0",
					eval: () => 0,
				},
				{
					min: 0,
					max: 1,
					exprLatex: "t",
					labelLatex: "0\\le t<1",
					hasGeometricOverlap: true,
					eval: () => 0,
				},
				{
					min: 1,
					max: 2,
					exprLatex: "2-t",
					labelLatex: "1\\le t<2",
					hasGeometricOverlap: true,
					eval: () => 0,
				},
				{
					min: 2,
					max: Number.POSITIVE_INFINITY,
					exprLatex: "0",
					labelLatex: "t\\ge2",
					eval: () => 0,
				},
			],
			xSections: [
				{
					id: "x-1",
					start: 0,
					end: 1,
					startIncluded: true,
					endIncluded: false,
				},
			],
			hSections: [
				{
					id: "h-1",
					start: 0,
					end: 1,
					startIncluded: true,
					endIncluded: false,
				},
			],
			xBreakpoints: [0, 1],
			hBreakpoints: [0, 1],
		});
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
		const problem = generateConvolutionProblem("tri_rect", { seed: 18 });
		const solver = new ConvolutionStepSolverState(() => problem);
		for (let step = 1; step <= 3; step += 1) solver.devAutoFillStep(step);
		advanceTransitionUntil(
			solver,
			problem,
			(id) => id === "transition-count",
		);
		solver.step4.subSteps["transition-count"].input = "99";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/distinct grouped/i);
		answerActiveTransitionPart(solver, problem);
		expect(solver.step4.activeSubStepId).toBe("interval-count");
		solver.step4.subSteps["interval-count"].input = "1";
		solver.checkStep4();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/one more interval/i);
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

	it("checks Step 5 overlap choices immediately and validates each typed bound", () => {
		const problem = generateConvolutionProblem("tri_rect", { seed: 5 });
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
		const setup = interior.setupBySignal.h;
		solver.chooseStep5Overlap(true);
		expect(solver.step5.activeSubStepId).toBe(interior.id);
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("validation");
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lower: "99",
			upper: overlap.upperLatex,
			splits: [...overlap.splitPointsLatex],
		}));
		solver.checkStep5();
		expect(solver.currentFeedback).toMatch(/larger.*left/i);
		state.boundInputs[0].lower = setup.overlaps[0].lowerLatex;
		state.boundInputs[0].upper = "99";
		solver.checkStep5();
		expect(solver.currentFeedback).toMatch(/smaller.*right/i);
	});

	it("rejects an incorrect interior split point", () => {
		const problem = generateConvolutionProblem("tri_shifted_tri", {
			seed: 8,
		});
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
		state.hasOverlap = true;
		state.boundInputs = setup.overlaps.map((overlap) => ({
			lower: overlap.lowerLatex,
			upper: overlap.upperLatex,
			splits: overlap.splitPointsLatex.map(() => "99"),
		}));
		solver.checkStep5();
		expect(solver.currentFeedbackType).toBe("incorrect");
		expect(solver.currentFeedback).toMatch(/triangle apex/i);
	});

	it("handles defensive missing-state and developer-harness branches", () => {
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
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
		solver.step4.subSteps[solver.step4.activeSubStepId].input = "99";
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
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
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
		interval.min = Number.NEGATIVE_INFINITY;
		interval.max = Number.POSITIVE_INFINITY;
		interval.eval = () => 0;
		solver.step6.subSteps[evaluationId].input = "0";
		solver.checkStep6();
		expect(solver.step6.subSteps[evaluationId].isValid).toBe(true);
	});

	it("returns false when a visual substep has no compatible current state", () => {
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
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
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
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

		const missingTiming = generateConvolutionProblem("rect_rect", {
			seed: 13,
		});
		const missingTimingSolver = new ConvolutionStepSolverState(
			() => missingTiming,
		);
		missingTiming.itsData.step1.parts = [];
		missingTimingSolver.devAutoFillStep(1);
		expect(missingTimingSolver.currentStep).toBe(1);

		const missingSetup = generateConvolutionProblem("rect_rect", {
			seed: 14,
		});
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
		expect(solver.currentStepState).toBeUndefined();
		expect(solver.activeHints).toEqual([]);
		solver.reset();
		expect(solver.currentStep).toBe(1);
		expect(solver.step1.subSteps.x.start).toBe("");
		expect(solver.step5Progress.current).toBe(1);
	});
});
