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
	ConvolutionPiecewiseStepState,
	ConvolutionTimingStepState,
	ConvolutionTransitionStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import {
	convolutionContactEquationMatches,
	convolutionContactSolveMatches,
	convolutionExpressionsMatch,
	convolutionScalarMatches,
	parseConvolutionScalarInput,
} from "$lib/components/solvers/convolution-solver-state/expression-validation";
import {
	createBoundsState,
	validateBoundsStage,
} from "$lib/components/solvers/convolution-solver-state/step5-bounds";
import {
	createEvaluationState,
	intervalSampleTimes,
	validateEvaluationStage,
} from "$lib/components/solvers/convolution-solver-state/step6-evaluation";
import type {
	ConvolutionBreakpointContact,
	ConvolutionItsOption,
	ConvolutionMovingSignal,
	ConvolutionProblem,
} from "$lib/math-engine/convolution/index";
import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";

export {
	convolutionExpressionsMatch,
	parseConvolutionScalarInput,
} from "$lib/components/solvers/convolution-solver-state/expression-validation";

export type {
	ConvolutionBoundsStepState,
	ConvolutionChoiceStepState,
	ConvolutionEvaluationStepState,
	ConvolutionFlipStepState,
	ConvolutionPiecewiseStepState,
	ConvolutionTimingStepState,
	ConvolutionTransitionStepState,
};

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
				].map(({ id }) => [id, { left: "", right: "" }]),
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
	movingSignal: ConvolutionMovingSignal,
): ConvolutionTransitionStepState {
	const contacts = problem.itsData.step4.transitionGroups.flatMap(
		(group) => group.contactsBySignal[movingSignal],
	);
	const partIds = [
		"section-count-x",
		"section-count-h",
		...problem.itsData.step4.breakpointParts.map(({ id }) => id),
		...contacts.flatMap(({ id }) => [`${id}-form`, `${id}-solve`]),
		"transition-count",
		"interval-count",
		"interval-builder",
	];
	const subSteps = Object.fromEntries(
		partIds.map((id) => {
			const signal = id === "section-count-x" ? "x" : "h";
			const breakpoint = problem.itsData.step4.breakpointParts.find(
				(part) => part.id === id,
			);
			const contact = contacts.find(({ id: contactId }) =>
				id.startsWith(contactId),
			);
			const isForm = id.endsWith("-form");
			let title = "Find One Signal Change";
			let hints: string[] = [];
			if (id.startsWith("section-count-")) {
				title = `Count the Sections of ${signal}(t)`;
				hints = problem.itsData.step4.sectionHints[signal];
			} else if (breakpoint) {
				title = breakpoint.title;
				hints = breakpoint.hints;
			} else if (contact) {
				title = isForm
					? "Form One Breakpoint Contact"
					: "Solve One Contact Time";
				hints = isForm
					? contact.formulationHints
					: contact.solutionHints;
			} else if (id === "transition-count") {
				title = "Count the Distinct Transition Times";
				hints = problem.itsData.step4.transitionCountHints;
			} else if (id === "interval-count") {
				title = "Count the Output Intervals";
				hints = problem.itsData.step4.intervalCountHints;
			} else if (id === "interval-builder") {
				title = "Build the Time Intervals";
				hints = problem.itsData.step4.intervalBuilderHints;
			}
			return [
				id,
				createSubStepState(
					id,
					title,
					{
						input: "",
						intervalInputs:
							id === "interval-builder"
								? problem.itsData.step4.intervalBoundaries.map(
										() => "",
									)
								: [],
					},
					hints,
				),
			];
		}),
	);
	return createMultiPartStepState(
		{},
		partIds,
		subSteps,
		partIds[0] ?? "interval-builder",
	) as ConvolutionTransitionStepState;
}

/** Returns the active path's ordered guided contacts. */
function step4Contacts(
	problem: ConvolutionProblem,
	movingSignal: ConvolutionMovingSignal,
): ConvolutionBreakpointContact[] {
	return problem.itsData.step4.transitionGroups.flatMap(
		(group) => group.contactsBySignal[movingSignal],
	);
}

/** Creates interval-aligned typed rows for final piecewise assembly. */
function createPiecewiseState(
	problem: ConvolutionProblem,
): ConvolutionPiecewiseStepState {
	return createStepState({
		rows: problem.intervals.map((interval) => {
			const isLocked =
				interval.exprLatex === "0" &&
				interval.hasGeometricOverlap !== true;
			return {
				input: isLocked ? "0" : "",
				isValid: isLocked,
				isLocked,
				feedback: null,
			};
		}),
	});
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
	step7 = $state<ConvolutionPiecewiseStepState>(
		{} as ConvolutionPiecewiseStepState,
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
					this.problem.itsData.step5.parts.find(
						({ id }) => id === this.step5.activeSubStepId,
					)?.hintsBySignal?.[this.flippedSignal] ??
					this.step5.subSteps[this.step5.activeSubStepId]?.hints ??
					[]
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
				"Enter the start time, end time, and signal width before checking this part.",
			);
			return;
		}
		if (!convolutionScalarMatches(state.start, expected.start)) {
			this.setSubStepIncorrect(
				this.step1,
				id,
				"The start time is not the first point where this signal can be non-zero.",
			);
			return;
		}
		if (!convolutionScalarMatches(state.end, expected.end)) {
			this.setSubStepIncorrect(
				this.step1,
				id,
				"The end time is not the last point where this signal can be non-zero.",
			);
			return;
		}
		if (!convolutionScalarMatches(state.width, expected.width)) {
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
		this.step4 = createTransitionState(this.problem, signal);
		this.step5 = createBoundsState(this.problem);
		this.step6 = createEvaluationState(this.problem, signal);
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

	/** Validates all transformed moving sections. */
	checkStep3Edges(): void {
		const id = "transform-edges";
		const expectedSections =
			this.problem.itsData.step3.sectionsBySignal[this.flippedSignal];
		for (const expected of expectedSections) {
			const input = this.step3.edgeInputs[expected.id];
			if (!input?.left.trim() || !input?.right.trim()) {
				this.setSubStepValidation(
					this.step3,
					id,
					"Enter both transformed edges for every connected section.",
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
					convolutionScalarMatches(String(value), expected[index]),
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
				id.endsWith("-form")
					? "Enter the contact equation or transformed moving breakpoint expression."
					: "Enter the requested count or value.",
			);
			return;
		}
		const contact = step4Contacts(this.problem, this.flippedSignal).find(
			({ id: contactId }) => id.startsWith(contactId),
		);
		if (contact && id.endsWith("-form")) {
			if (
				!convolutionContactEquationMatches(
					state.input,
					contact.fixed,
					contact.transformedLatex,
				)
			) {
				this.setSubStepIncorrect(
					this.step4,
					id,
					"Reflect and translate the original moving breakpoint $b$ to $t-b$. Put parentheses around $b$ when it is negative.",
				);
				return;
			}
			this.passActiveSubStep(this.step4, 5);
			return;
		}
		if (contact && id.endsWith("-solve")) {
			if (
				!convolutionContactSolveMatches(
					state.input,
					contact.transitionTime,
				)
			) {
				this.setSubStepIncorrect(
					this.step4,
					id,
					"Solve the verified contact equation for $t$ by adding the original moving breakpoint to the fixed breakpoint.",
				);
				return;
			}
			this.passActiveSubStep(this.step4, 5);
			return;
		}
		let expected: number | undefined;
		if (id === "section-count-x")
			expected = this.problem.itsData.step4.sectionCounts.x;
		else if (id === "section-count-h")
			expected = this.problem.itsData.step4.sectionCounts.h;
		else if (id === "transition-count")
			expected = this.problem.itsData.step4.transitionGroups.length;
		else if (id === "interval-count")
			expected = this.problem.itsData.step4.intervalLabels.length;
		else
			expected = this.problem.itsData.step4.breakpointParts.find(
				(part) => part.id === id,
			)?.value;
		if (
			expected === undefined ||
			!convolutionScalarMatches(state.input, expected)
		) {
			this.setSubStepIncorrect(
				this.step4,
				id,
				id === "transition-count"
					? "Count each distinct grouped transition time once."
					: id === "interval-count"
						? "The transition times divide the time axis into one more interval than the number of transitions."
						: "Count each disconnected pulse separately and include each interior edge, slope change, or formula change.",
			);
			return;
		}
		this.passActiveSubStep(this.step4, 5);
	}

	/** Applies immediate feedback to the active Step 5 overlap choice. */
	chooseStep5Overlap(hasOverlap: boolean): void {
		const id = this.step5.activeSubStepId;
		const state = this.step5.subSteps[id];
		const setup = this.problem.itsData.step5.parts.find(
			(candidate) => candidate.id === id,
		)?.setupBySignal?.[this.flippedSignal];
		if (!state || !setup) return;
		state.hasOverlap = hasOverlap;
		if (hasOverlap !== setup.hasOverlap) {
			this.setSubStepMisconception(
				this.step5,
				id,
				"Compare the fixed and transformed left and right edges before deciding whether overlap exists.",
			);
			return;
		}
		this.clearSubStepFeedback(this.step5, id);
		if (!hasOverlap) this.passActiveSubStep(this.step5, 6);
		else state.stage = "evaluate";
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
		const result = validateBoundsStage(state, setup);
		if (result.kind === "blank") {
			this.setSubStepValidation(this.step5, id, result.message);
			return;
		}
		if (result.kind === "incorrect") {
			this.setSubStepIncorrect(this.step5, id, result.message);
			return;
		}
		if (result.kind === "misconception") {
			this.setSubStepMisconception(this.step5, id, result.message);
			return;
		}
		if (result.kind !== "valid") return;
		this.clearSubStepFeedback(this.step5, id);
		if (result.nextStage) {
			state.stage = result.nextStage;
			return;
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
		const part = this.problem.itsData.step6.parts[index];
		const interval = this.problem.intervals[index];
		if (!state || !part || !interval) return;
		const result = validateEvaluationStage(
			state,
			part,
			this.flippedSignal,
			interval.exprLatex,
			interval.min,
			interval.max,
		);
		if (result.kind === "blank" || result.kind === "malformed") {
			this.setSubStepValidation(this.step6, id, result.message);
			return;
		}
		if (result.kind === "incorrect") {
			this.setSubStepIncorrect(this.step6, id, result.message);
			return;
		}
		if (result.kind !== "valid") return;
		this.clearSubStepFeedback(this.step6, id);
		if (result.nextTermIndex !== undefined)
			state.activeTermIndex = result.nextTermIndex;
		if (result.nextStage) {
			state.stage = result.nextStage;
			return;
		}
		this.passActiveSubStep(this.step6, 7);
	}

	/** Validates one Step 7 interval expression independently. */
	checkStep7Row(index: number): void {
		const row = this.step7.rows[index];
		const interval = this.problem.intervals[index];
		if (!row || !interval || row.isLocked) return;
		if (!row.input.trim()) {
			row.feedback =
				"Enter the verified Step 6 expression for this interval.";
			this.setValidation(this.step7, row.feedback);
			return;
		}
		for (const time of intervalSampleTimes(interval.min, interval.max)) {
			const actual = tryEvaluateLatexAt(row.input, time);
			if (actual === null) {
				row.feedback =
					"The expression could not be parsed as mathematics in $t$.";
				this.setValidation(this.step7, row.feedback);
				return;
			}
			if (Math.abs(actual - interval.eval(time)) > 1e-6) {
				row.feedback =
					"This expression belongs to a different interval or does not match the verified result.";
				this.setIncorrect(this.step7, row.feedback);
				return;
			}
		}
		row.isValid = true;
		row.feedback = null;
		this.clearFeedback();
		if (this.step7.rows.every(({ isValid }) => isValid))
			this.setPassed(this.step7, 8);
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
		this.step4 = createTransitionState(this.problem, "h");
		this.step5 = createBoundsState(this.problem);
		this.step6 = createEvaluationState(this.problem, "h");
		this.step7 = createPiecewiseState(this.problem);
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
		states.push({
			id: "convolution.step-02.misconception",
			label: "Step 2 · Convolution Definition Misconception",
			step: 2,
			kind: "diagnostic",
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
		/* v8 ignore next -- exercised by production builds where the harness is disabled. */
		if (!import.meta.env.DEV) return false;
		const descriptor = this.devGetVisualStates().find(
			({ id }) => id === stateId,
		);
		if (!descriptor || !this.devPrepareParentStep(descriptor.step))
			return false;
		if (stateId === "convolution.step-02.misconception") {
			const incorrect = this.problem.itsData.step2.options.find(
				({ isCorrect }) => !isCorrect,
			);
			if (!incorrect) return false;
			this.checkStep2(incorrect);
			return this.currentFeedbackType === "misconception";
		}
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
		/* v8 ignore next -- exercised by production builds where the harness is disabled. */
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
					};
				this.checkStep3Edges();
				break;
			case 4:
				while (this.currentStep === 4) {
					const id = this.step4.activeSubStepId;
					const state = this.step4.subSteps[id];
					const contact = step4Contacts(
						this.problem,
						this.flippedSignal,
					).find(({ id: contactId }) => id.startsWith(contactId));
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
					else if (contact)
						state.input = id.endsWith("-form")
							? contact.transformedLatex
							: String(contact.transitionTime);
					else if (id === "transition-count")
						state.input = String(
							this.problem.itsData.step4.transitionGroups.length,
						);
					else if (id === "interval-count")
						state.input = String(
							this.problem.itsData.step4.intervalLabels.length,
						);
					else
						state.input = String(
							this.problem.itsData.step4.breakpointParts.find(
								(part) => part.id === id,
							)?.value ?? "",
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
					if (state.stage === "overlap") {
						this.chooseStep5Overlap(setup.hasOverlap);
						continue;
					}
					if (state.stage === "evaluate") {
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
						this.checkStep5();
						continue;
					}
					state.boundInputs = setup.overlaps.map(
						(overlap, index) => ({
							lowerValues: state.boundInputs[index]
								?.lowerValues ?? [
								String(overlap.lowerCandidateValues[0]),
								String(overlap.lowerCandidateValues[1] ?? ""),
							],
							upperValues: state.boundInputs[index]
								?.upperValues ?? [
								String(overlap.upperCandidateValues[0]),
								String(overlap.upperCandidateValues[1] ?? ""),
							],
							lower: overlap.lowerLatex,
							upper: overlap.upperLatex,
							splits: [...overlap.splitPointsLatex],
						}),
					);
					this.checkStep5();
				}
				break;
			case 6:
				while (this.currentStep === 6) {
					const index = this.problem.itsData.step6.parts.findIndex(
						(part) => part.id === this.step6.activeSubStepId,
					);
					const part = this.problem.itsData.step6.parts[index];
					const state =
						this.step6.subSteps[this.step6.activeSubStepId];
					const term =
						part?.evaluationBySignal?.[this.flippedSignal][
							state.activeTermIndex
						];
					const termInput = state.termInputs[state.activeTermIndex];
					if (state.stage === "combined")
						state.input =
							this.problem.intervals[index]?.exprLatex ?? "0";
					else if (term && termInput) {
						if (state.stage === "geometry-amplitude")
							termInput.amplitudeProduct =
								term.geometry?.amplitudeProductLatex ?? "0";
						else if (state.stage === "geometry-width")
							termInput.overlapWidth =
								term.geometry?.overlapWidthLatex ?? "0";
						else if (state.stage === "upper")
							termInput.upper = term.upperSubstitutionLatex;
						else if (state.stage === "lower")
							termInput.lower = term.lowerSubstitutionLatex;
						else termInput.difference = term.differenceLatex;
					}
					this.checkStep6();
				}
				break;
			case 7:
				this.problem.intervals.forEach((interval, index) => {
					const row = this.step7.rows[index];
					if (!row || row.isLocked) return;
					row.input = interval.exprLatex;
					this.checkStep7Row(index);
				});
				break;
			default:
				break;
		}
	}
}
