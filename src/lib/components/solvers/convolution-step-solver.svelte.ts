import {
	BaseStepSolverState,
	type BaseStepState,
	createMultiPartStepState,
	createStepState,
	createSubStepState,
	type SolverVisualStateDescriptor,
	type SubStepProgress,
} from "$lib/components/solvers/base-step-solver.svelte";
import type {
	ConvolutionBoundsStepState,
	ConvolutionChoiceStepState,
	ConvolutionEvaluationStepState,
	ConvolutionFlipStepState,
	ConvolutionTimingStepState,
	ConvolutionTransitionStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import type {
	ConvolutionItsOption,
	ConvolutionMovingSignal,
	ConvolutionProblem,
} from "$lib/math-engine/convolution";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { parseNumericInput } from "$lib/math-engine/fraction";

export type {
	ConvolutionBoundsStepState,
	ConvolutionChoiceStepState,
	ConvolutionEvaluationStepState,
	ConvolutionFlipStepState,
	ConvolutionTimingStepState,
	ConvolutionTransitionStepState,
};

/** Parses a typed finite value or a common positive/negative infinity spelling. */
export function parseConvolutionScalarInput(input: string): number {
	const normalized = input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/\\infty|∞/g, "infinity");
	if (["infinity", "+infinity", "inf", "+inf"].includes(normalized)) {
		return Number.POSITIVE_INFINITY;
	}
	if (["-infinity", "-inf"].includes(normalized)) {
		return Number.NEGATIVE_INFINITY;
	}
	return parseNumericInput(input);
}

/** Compares finite or infinite scalar input against an exact expected value. */
function scalarMatches(input: string, expected: number): boolean {
	const value = parseConvolutionScalarInput(input);
	return Object.is(value, expected) || Math.abs(value - expected) < 1e-9;
}

/** Compares two one-variable bound expressions at deterministic time values. */
export function convolutionExpressionsMatch(
	student: string,
	expected: string,
): boolean {
	const studentInfinity = parseConvolutionScalarInput(student);
	const expectedInfinity = parseConvolutionScalarInput(expected);
	if (!Number.isNaN(studentInfinity) || !Number.isNaN(expectedInfinity)) {
		return Object.is(studentInfinity, expectedInfinity);
	}
	for (const time of [-3, -1, 0, 2, 5]) {
		const actual = tryEvaluateLatexAt(student, time);
		const target = tryEvaluateLatexAt(expected, time);
		if (
			actual === null ||
			target === null ||
			Math.abs(actual - target) > 1e-7
		) {
			return false;
		}
	}
	return true;
}

/** Creates multipart state for Step 1 timing entries. */
function createTimingState(
	problem: ConvolutionProblem,
): ConvolutionTimingStepState {
	const order: Array<"x" | "h" | "y"> = problem.itsData.step1.parts.map(
		({ id }) => id,
	);
	const subSteps = Object.fromEntries(
		problem.itsData.step1.parts.map((part) => [
			part.id,
			createSubStepState(
				part.id,
				part.title,
				{ start: "", end: "", width: "" },
				part.hints,
			),
		]),
	) as ConvolutionTimingStepState["subSteps"];
	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0] ?? "x",
	) as ConvolutionTimingStepState;
}

/** Creates multipart state for Step 3 path and transformed-edge work. */
function createFlipState(
	problem: ConvolutionProblem,
): ConvolutionFlipStepState {
	const order = ["choose-signal", "choose-formula", "transform-edges"];
	return createMultiPartStepState(
		{
			selectedSignal: null as ConvolutionMovingSignal | null,
			formulaSelected: null as string | null,
			edgeInputs: Object.fromEntries(
				[
					...problem.itsData.step3.sectionsBySignal.x,
					...problem.itsData.step3.sectionsBySignal.h,
				].map(({ id }) => [
					id,
					{ left: "", right: "", includedEndpoint: "" },
				]),
			),
		},
		order,
		{
			"choose-signal": createSubStepState(
				"choose-signal",
				"Choose the Moving Signal",
				{},
				problem.itsData.step3.choiceHints,
			),
			"choose-formula": createSubStepState(
				"choose-formula",
				"Match the Integral to Your Choice",
				{},
				[],
			),
			"transform-edges": createSubStepState(
				"transform-edges",
				"Transform Every Moving Section",
				{},
				problem.itsData.step3.edgeHints,
			),
		},
		"choose-signal",
	) as ConvolutionFlipStepState;
}

/** Creates ordered typed state for Step 4 discovery. */
function createTransitionState(
	problem: ConvolutionProblem,
): ConvolutionTransitionStepState {
	const partIds = [
		"section-count-x",
		"section-count-h",
		...problem.itsData.step4.breakpointParts.map(({ id }) => id),
		...problem.itsData.step4.transitionGroups.map(({ id }) => id),
		"interval-builder",
	];
	const subSteps = Object.fromEntries(
		partIds.map((id) => [
			id,
			createSubStepState(
				id,
				id === "interval-builder"
					? "Build the Time Intervals"
					: "Find One Signal Change",
				{
					input: "",
					intervalInputs:
						id === "interval-builder"
							? problem.itsData.step4.intervalBoundaries.map(
									() => "",
								)
							: [],
				},
				problem.itsData.step4.hints,
			),
		]),
	);
	return createMultiPartStepState(
		{},
		partIds,
		subSteps,
		partIds[0] ?? "interval-builder",
	) as ConvolutionTransitionStepState;
}

/** Creates ordered bound state for every Step 5 interval. */
function createBoundsState(
	problem: ConvolutionProblem,
): ConvolutionBoundsStepState {
	const order = problem.itsData.step5.parts.map(({ id }) => id);
	const subSteps = Object.fromEntries(
		problem.itsData.step5.parts.map((part) => {
			const xOverlaps = part.setupBySignal?.x.overlaps ?? [];
			const hOverlaps = part.setupBySignal?.h.overlaps ?? [];
			const template =
				xOverlaps.length >= hOverlaps.length ? xOverlaps : hOverlaps;
			return [
				part.id,
				createSubStepState(
					part.id,
					part.title,
					{
						hasOverlap: null as boolean | null,
						boundInputs: template.map((overlap) => ({
							lower: "",
							upper: "",
							splits: overlap.splitPointsLatex.map(() => ""),
						})),
					},
					part.hints,
				),
			];
		}),
	);
	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0] ?? "setup-placeholder",
	) as ConvolutionBoundsStepState;
}

/** Creates ordered expression state for every Step 6 interval. */
function createEvaluationState(
	problem: ConvolutionProblem,
): ConvolutionEvaluationStepState {
	const order = problem.itsData.step6.parts.map(({ id }) => id);
	const subSteps = Object.fromEntries(
		problem.itsData.step6.parts.map((part) => [
			part.id,
			createSubStepState(part.id, part.title, { input: "" }, part.hints),
		]),
	);
	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0] ?? "interval-placeholder",
	) as ConvolutionEvaluationStepState;
}

/** Returns safe deterministic sample times strictly inside one interval. */
function intervalSampleTimes(minimum: number, maximum: number): number[] {
	if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
		const span = maximum - minimum;
		return [0.17, 0.33, 0.5, 0.67, 0.83].map(
			(ratio) => minimum + span * ratio,
		);
	}
	if (Number.isFinite(minimum))
		return [0.5, 1, 2, 3, 5].map((offset) => minimum + offset);
	if (Number.isFinite(maximum))
		return [0.5, 1, 2, 3, 5].map((offset) => maximum - offset);
	return [-3, -1, 0, 2, 5];
}

/** Reactive state and validation controller for the seven-step convolution tutor. */
export class ConvolutionStepSolverState extends BaseStepSolverState {
	/** Getter closure returning the active convolution problem. */
	private readonly getProblem: () => ConvolutionProblem;

	/** Active convolution problem definition. */
	get problem(): ConvolutionProblem {
		return this.getProblem();
	}

	/** Step 1 typed timing state. */
	step1 = $state<ConvolutionTimingStepState>(
		{} as ConvolutionTimingStepState,
	);
	/** Step 2 definition state. */
	step2 = $state<ConvolutionChoiceStepState>(
		createStepState({ selected: null }),
	);
	/** Step 3 path and edge state. */
	step3 = $state<ConvolutionFlipStepState>({} as ConvolutionFlipStepState);
	/** Step 4 transition discovery state. */
	step4 = $state<ConvolutionTransitionStepState>(
		{} as ConvolutionTransitionStepState,
	);
	/** Step 5 typed bounds state. */
	step5 = $state<ConvolutionBoundsStepState>(
		{} as ConvolutionBoundsStepState,
	);
	/** Step 6 typed expressions state. */
	step6 = $state<ConvolutionEvaluationStepState>(
		{} as ConvolutionEvaluationStepState,
	);
	/** Step 7 final assembly state. */
	step7 = $state<ConvolutionChoiceStepState>(
		createStepState({ selected: null }),
	);

	/** Signal selected by the learner for reflection and translation. */
	get flippedSignal(): ConvolutionMovingSignal {
		return this.step3.selectedSignal ?? "h";
	}

	/** Progress through multipart steps. */
	get step1Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step1);
	}
	get step3Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step3);
	}
	get step4Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step4);
	}
	get step5Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step5);
	}
	get step6Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step6);
	}

	/** Active state object for shared feedback rendering. */
	get currentStepState(): BaseStepState | undefined {
		switch (this.currentStep) {
			case 1:
				return this.step1;
			case 2:
				return this.step2;
			case 3:
				return this.step3;
			case 4:
				return this.step4;
			case 5:
				return this.step5;
			case 6:
				return this.step6;
			case 7:
				return this.step7;
			default:
				return undefined;
		}
	}

	/** Progressive hints for the active parent or substep. */
	activeHints = $derived.by((): string[] => {
		switch (this.currentStep) {
			case 1:
				return (
					this.step1.subSteps[this.step1.activeSubStepId]?.hints ?? []
				);
			case 2:
				return this.problem.itsData.step2.hints;
			case 3:
				if (this.step3.activeSubStepId === "choose-formula")
					return this.problem.itsData.step3.formulaBySignal[
						this.flippedSignal
					].hints;
				return (
					this.step3.subSteps[this.step3.activeSubStepId]?.hints ?? []
				);
			case 4:
				return (
					this.step4.subSteps[this.step4.activeSubStepId]?.hints ?? []
				);
			case 5:
				return (
					this.step5.subSteps[this.step5.activeSubStepId]?.hints ?? []
				);
			case 6:
				return (
					this.step6.subSteps[this.step6.activeSubStepId]?.hints ?? []
				);
			case 7:
				return this.problem.itsData.step7.hints;
			default:
				return [];
		}
	});

	/** Creates a convolution solver controller. */
	constructor(
		getProblem: () => ConvolutionProblem,
		getOnComplete?: () => (() => void) | undefined,
	) {
		super(7, getOnComplete);
		this.getProblem = getProblem;
		this.reset();
	}

	/** Validates the active Step 1 start, end, and width fields. */
	checkStep1(): void {
		const id = this.step1.activeSubStepId;
		const state = this.step1.subSteps[id];
		const expected = this.problem.itsData.step1.parts.find(
			(part) => part.id === id,
		);
		if (!state || !expected) return;
		if (
			![state.start, state.end, state.width].every((value) =>
				value.trim(),
			)
		) {
			this.setSubStepValidation(
				this.step1,
				id,
				"Enter the start time, end time, and width before checking this part.",
			);
			return;
		}
		if (!scalarMatches(state.start, expected.start)) {
			this.setSubStepIncorrect(
				this.step1,
				id,
				"The start time is not the first point where this signal can be nonzero.",
			);
			return;
		}
		if (!scalarMatches(state.end, expected.end)) {
			this.setSubStepIncorrect(
				this.step1,
				id,
				"The end time is not the last point where this signal can be nonzero.",
			);
			return;
		}
		if (!scalarMatches(state.width, expected.width)) {
			this.setSubStepMisconception(
				this.step1,
				id,
				"Width is the overall end time minus the start time; convolution widths add for finite connected spans.",
			);
			return;
		}
		this.passActiveSubStep(this.step1, 2);
	}

	/** Validates Step 2 definition choice. */
	checkStep2(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step2,
			option,
			"Use one fixed signal in $\\tau$ and one reflected signal in $t-\\tau$.",
			"Select the convolution definition.",
			3,
		);
	}

	/** Stores either valid moving-signal preference and opens Step 3B. */
	chooseMovingSignal(signal: ConvolutionMovingSignal): void {
		this.step3.selectedSignal = signal;
		this.setSubStepPassed(this.step3, "choose-signal", "choose-formula");
	}

	/** Validates the formula matching the selected moving signal. */
	checkStep3Formula(option: ConvolutionItsOption | null): void {
		const id = "choose-formula";
		if (!option) {
			this.setSubStepValidation(
				this.step3,
				id,
				"Select the integral that matches your moving-signal choice.",
			);
			return;
		}
		this.step3.formulaSelected = option.id;
		if (!option.isCorrect) {
			this.setSubStepMisconception(
				this.step3,
				id,
				option.feedback ??
					"The formula does not match the selected path.",
			);
			return;
		}
		this.setSubStepPassed(this.step3, id, "transform-edges");
	}

	/** Validates all transformed moving sections and endpoint conventions. */
	checkStep3Edges(): void {
		const id = "transform-edges";
		const expectedSections =
			this.problem.itsData.step3.sectionsBySignal[this.flippedSignal];
		for (const expected of expectedSections) {
			const input = this.step3.edgeInputs[expected.id];
			if (
				!input ||
				!input.left.trim() ||
				!input.right.trim() ||
				!input.includedEndpoint
			) {
				this.setSubStepValidation(
					this.step3,
					id,
					"Enter both transformed edges and choose the endpoint convention for every connected section.",
				);
				return;
			}
			if (
				convolutionExpressionsMatch(input.left, expected.rightLatex) &&
				convolutionExpressionsMatch(input.right, expected.leftLatex)
			) {
				this.setSubStepMisconception(
					this.step3,
					id,
					"The transformed edges are reversed. Reflection places the original right edge on the transformed left.",
				);
				return;
			}
			if (
				!convolutionExpressionsMatch(input.left, expected.leftLatex) ||
				!convolutionExpressionsMatch(input.right, expected.rightLatex)
			) {
				this.setSubStepIncorrect(
					this.step3,
					id,
					"Recheck the shift direction: an original section $[c,d]$ becomes $[t-d,t-c]$ after reflection and translation.",
				);
				return;
			}
			if (input.includedEndpoint !== expected.includedEndpoint) {
				this.setSubStepMisconception(
					this.step3,
					id,
					"Reflection swaps the original left and right endpoint conventions.",
				);
				return;
			}
		}
		this.setSubStepPassed(this.step3, id, undefined, 4);
	}

	/** Validates the currently active Step 4 count, breakpoint, transition, or interval part. */
	checkStep4(): void {
		const id = this.step4.activeSubStepId;
		const state = this.step4.subSteps[id];
		if (!state) return;
		if (id === "interval-builder") {
			if (state.intervalInputs.some((input) => !input.trim())) {
				this.setSubStepValidation(
					this.step4,
					id,
					"Enter every verified boundary to build the chronological intervals.",
				);
				return;
			}
			const actual = state.intervalInputs.map(
				parseConvolutionScalarInput,
			);
			const expected = this.problem.itsData.step4.intervalBoundaries;
			if (new Set(actual).size !== actual.length) {
				this.setSubStepMisconception(
					this.step4,
					id,
					"Each distinct transition appears once in the sorted interval boundary list.",
				);
				return;
			}
			if (
				!actual.every((value, index) =>
					scalarMatches(String(value), expected[index]),
				)
			) {
				this.setSubStepIncorrect(
					this.step4,
					id,
					"Use the verified transition times in ascending order without reflecting, omitting, or adding values.",
				);
				return;
			}
			this.setSubStepPassed(this.step4, id, undefined, 5);
			return;
		}
		if (!state.input.trim()) {
			this.setSubStepValidation(
				this.step4,
				id,
				"Enter the requested count or transition value.",
			);
			return;
		}
		let expected: number | undefined;
		if (id === "section-count-x")
			expected = this.problem.itsData.step4.sectionCounts.x;
		else if (id === "section-count-h")
			expected = this.problem.itsData.step4.sectionCounts.h;
		else
			expected =
				this.problem.itsData.step4.breakpointParts.find(
					(part) => part.id === id,
				)?.value ??
				this.problem.itsData.step4.transitionGroups.find(
					(group) => group.id === id,
				)?.time;
		if (expected === undefined || !scalarMatches(state.input, expected)) {
			this.setSubStepIncorrect(
				this.step4,
				id,
				id.startsWith("transition-")
					? "Solve the displayed contact equation as $t=a+b$ and group contacts with the same answer."
					: "Count each disconnected pulse separately and include each interior edge, slope change, or formula change.",
			);
			return;
		}
		this.passActiveSubStep(this.step4, 5);
	}

	/** Validates overlap existence, every bound, and every split point for Step 5. */
	checkStep5(): void {
		const id = this.step5.activeSubStepId;
		const state = this.step5.subSteps[id];
		const part = this.problem.itsData.step5.parts.find(
			(candidate) => candidate.id === id,
		);
		const setup = part?.setupBySignal?.[this.flippedSignal];
		if (!state || !setup) return;
		if (state.hasOverlap === null) {
			this.setSubStepValidation(
				this.step5,
				id,
				"First decide whether the signals overlap in this interval.",
			);
			return;
		}
		if (state.hasOverlap !== setup.hasOverlap) {
			this.setSubStepMisconception(
				this.step5,
				id,
				"Compare the fixed and transformed left and right edges before deciding whether overlap exists.",
			);
			return;
		}
		if (setup.hasOverlap) {
			for (const [index, expected] of setup.overlaps.entries()) {
				const input = state.boundInputs[index];
				if (
					!input ||
					!input.lower.trim() ||
					!input.upper.trim() ||
					input.splits.some((split) => !split.trim())
				) {
					this.setSubStepValidation(
						this.step5,
						id,
						"Enter the lower limit, upper limit, and every requested interior split point.",
					);
					return;
				}
				if (
					!convolutionExpressionsMatch(
						input.lower,
						expected.lowerLatex,
					)
				) {
					this.setSubStepMisconception(
						this.step5,
						id,
						"The lower limit is the larger of the two active left edges.",
					);
					return;
				}
				if (
					!convolutionExpressionsMatch(
						input.upper,
						expected.upperLatex,
					)
				) {
					this.setSubStepMisconception(
						this.step5,
						id,
						"The upper limit is the smaller of the two active right edges.",
					);
					return;
				}
				if (
					!input.splits.every((split, splitIndex) =>
						convolutionExpressionsMatch(
							split,
							expected.splitPointsLatex[splitIndex] ?? "",
						),
					)
				) {
					this.setSubStepIncorrect(
						this.step5,
						id,
						"Split wherever an active triangle apex, slope change, or piecewise formula change lies inside the bounds.",
					);
					return;
				}
			}
		}
		this.passActiveSubStep(this.step5, 6);
	}

	/** Strictly validates the active Step 6 expression on its own interval. */
	checkStep6(): void {
		const id = this.step6.activeSubStepId;
		const state = this.step6.subSteps[id];
		const index = this.problem.itsData.step6.parts.findIndex(
			(part) => part.id === id,
		);
		const interval = this.problem.intervals[index];
		if (!state || !interval) return;
		if (!state.input.trim()) {
			this.setSubStepValidation(
				this.step6,
				id,
				"Enter the evaluated expression for this interval.",
			);
			return;
		}
		for (const time of intervalSampleTimes(interval.min, interval.max)) {
			const actual = tryEvaluateLatexAt(state.input, time);
			if (actual === null) {
				this.setSubStepValidation(
					this.step6,
					id,
					"The expression could not be parsed. Enter valid math in $t$, such as $t-1$ or $e^{-t}$.",
				);
				return;
			}
			if (Math.abs(actual - interval.eval(time)) > 1e-6) {
				this.setSubStepIncorrect(
					this.step6,
					id,
					"The expression does not match the verified definite integral throughout this interval.",
				);
				return;
			}
		}
		this.passActiveSubStep(this.step6, 7);
	}

	/** Validates Step 7 final piecewise selection. */
	checkStep7(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step7,
			option,
			"Attach every Step 6 expression to its matching interval.",
			"Select the complete piecewise response.",
			8,
		);
	}

	/** Passes the active substep and advances within or beyond its parent. */
	private passActiveSubStep(
		state:
			| ConvolutionTimingStepState
			| ConvolutionTransitionStepState
			| ConvolutionBoundsStepState
			| ConvolutionEvaluationStepState,
		nextParentStep: number,
	): void {
		const id = state.activeSubStepId;
		const index = state.subStepOrder.indexOf(id);
		const next = state.subStepOrder[index + 1];
		this.setSubStepPassed(
			state,
			id,
			next,
			next ? undefined : nextParentStep,
		);
	}

	/** Resets all steps and typed entries for a new problem. */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
		this.step1 = createTimingState(this.problem);
		this.step2 = createStepState({ selected: null as string | null });
		this.step3 = createFlipState(this.problem);
		this.step4 = createTransitionState(this.problem);
		this.step5 = createBoundsState(this.problem);
		this.step6 = createEvaluationState(this.problem);
		this.step7 = createStepState({ selected: null as string | null });
	}

	/** Named visual states for each parent and dynamic interval part. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const states: SolverVisualStateDescriptor[] = [];
		const addMultipart = (
			step: number,
			label: string,
			order: string[],
		): void => {
			order.forEach((subStep, index) => {
				states.push({
					id:
						index === 0
							? `convolution.step-${String(step).padStart(2, "0")}`
							: `convolution.step-${String(step).padStart(2, "0")}.${subStep}`,
					label: `Step ${step}${String.fromCharCode(65 + index)} · ${label}`,
					step,
					subStep,
					kind: "interactive",
				});
			});
		};
		addMultipart(1, "Signal Timing", this.step1.subStepOrder);
		states.push({
			id: "convolution.step-02",
			label: "Step 2 · Convolution Definition",
			step: 2,
			kind: "interactive",
		});
		addMultipart(3, "Flip Path", this.step3.subStepOrder);
		addMultipart(4, "Transition Points", this.step4.subStepOrder);
		addMultipart(5, "Integration Bounds", this.step5.subStepOrder);
		addMultipart(6, "Integral Evaluation", this.step6.subStepOrder);
		states.push({
			id: "convolution.step-07",
			label: "Step 7 · Final Response",
			step: 7,
			kind: "interactive",
		});
		return states;
	}

	/** Resets and completes whole parent steps until the requested step is active. */
	private devPrepareParentStep(targetStep: number): boolean {
		this.reset();
		let guard = 0;
		while (this.currentStep < targetStep && guard < this.totalSteps) {
			const before = this.currentStep;
			this.devAutoFillStep(before);
			if (this.currentStep === before) return false;
			guard += 1;
		}
		return this.currentStep === targetStep;
	}

	/** Navigates deterministically to every registered parent or multipart visual state. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		const descriptor = this.devGetVisualStates().find(
			({ id }) => id === stateId,
		);
		if (!descriptor || !this.devPrepareParentStep(descriptor.step))
			return false;
		if (!descriptor.subStep) return true;
		const state = this.currentStepState;
		if (!state || !("subStepOrder" in state) || !("subSteps" in state))
			return false;
		const multipart = state as
			| ConvolutionTimingStepState
			| ConvolutionFlipStepState
			| ConvolutionTransitionStepState
			| ConvolutionBoundsStepState
			| ConvolutionEvaluationStepState;
		if (!multipart.subStepOrder.includes(descriptor.subStep)) return false;
		multipart.activeSubStepId = descriptor.subStep;
		const targetIndex = multipart.subStepOrder.indexOf(descriptor.subStep);
		multipart.subStepOrder.forEach((id, index) => {
			multipart.subSteps[id].isValid = index < targetIndex;
		});
		return true;
	}

	/** Developer auto-fill using the same real validation methods. */
	override devAutoFillStep(stepIndex?: number): void {
		if (!import.meta.env.DEV) return;
		const target = stepIndex ?? this.currentStep;
		switch (target) {
			case 1:
				while (this.currentStep === 1) {
					const expected = this.problem.itsData.step1.parts.find(
						({ id }) => id === this.step1.activeSubStepId,
					);
					const state =
						this.step1.subSteps[this.step1.activeSubStepId];
					if (!expected || !state) break;
					state.start = String(expected.start);
					state.end = String(expected.end);
					state.width = String(expected.width);
					this.checkStep1();
				}
				break;
			case 2:
				this.checkStep2(
					this.problem.itsData.step2.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			case 3:
				this.chooseMovingSignal("h");
				this.checkStep3Formula(
					this.problem.itsData.step3.formulaBySignal.h.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				for (const expected of this.problem.itsData.step3
					.sectionsBySignal.h)
					this.step3.edgeInputs[expected.id] = {
						left: expected.leftLatex,
						right: expected.rightLatex,
						includedEndpoint: expected.includedEndpoint,
					};
				this.checkStep3Edges();
				break;
			case 4:
				while (this.currentStep === 4) {
					const id = this.step4.activeSubStepId;
					const state = this.step4.subSteps[id];
					if (id === "interval-builder")
						state.intervalInputs =
							this.problem.itsData.step4.intervalBoundaries.map(
								String,
							);
					else if (id === "section-count-x")
						state.input = String(
							this.problem.itsData.step4.sectionCounts.x,
						);
					else if (id === "section-count-h")
						state.input = String(
							this.problem.itsData.step4.sectionCounts.h,
						);
					else
						state.input = String(
							this.problem.itsData.step4.breakpointParts.find(
								(part) => part.id === id,
							)?.value ??
								this.problem.itsData.step4.transitionGroups.find(
									(group) => group.id === id,
								)?.time ??
								"",
						);
					this.checkStep4();
				}
				break;
			case 5:
				while (this.currentStep === 5) {
					const id = this.step5.activeSubStepId;
					const state = this.step5.subSteps[id];
					const setup = this.problem.itsData.step5.parts.find(
						(part) => part.id === id,
					)?.setupBySignal?.[this.flippedSignal];
					if (!setup) break;
					state.hasOverlap = setup.hasOverlap;
					state.boundInputs = setup.overlaps.map((overlap) => ({
						lower: overlap.lowerLatex,
						upper: overlap.upperLatex,
						splits: [...overlap.splitPointsLatex],
					}));
					this.checkStep5();
				}
				break;
			case 6:
				while (this.currentStep === 6) {
					const index = this.problem.itsData.step6.parts.findIndex(
						(part) => part.id === this.step6.activeSubStepId,
					);
					this.step6.subSteps[this.step6.activeSubStepId].input =
						this.problem.intervals[index]?.exprLatex ?? "0";
					this.checkStep6();
				}
				break;
			case 7:
				this.checkStep7(
					this.problem.itsData.step7.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			default:
				break;
		}
	}
}
