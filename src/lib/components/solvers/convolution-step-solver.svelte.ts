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
	ConvolutionChoiceStepState,
	ConvolutionIntervalMultiPartState,
	ConvolutionIntervalSubStepState,
} from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
import type {
	ConvolutionItsOption,
	ConvolutionProblem,
} from "$lib/math-engine/convolution";

export type {
	ConvolutionChoiceStepState,
	ConvolutionIntervalMultiPartState,
	ConvolutionIntervalSubStepState,
};

/**
 * Creates the ordered multi-part state for a problem's convolution intervals.
 *
 * @param problem - Active exact convolution problem.
 * @returns Initialized interval evaluation state.
 */
function createIntervalMultiPartState(
	problem: ConvolutionProblem,
): ConvolutionIntervalMultiPartState {
	const parts = problem.itsData.step4.parts;
	const normalizedParts =
		parts.length > 0
			? parts
			: [
					{
						id: "interval-placeholder",
						title: "Evaluate Region",
						intervalLatex: "t \\in \\mathbb{R}",
						resultLatex: "y(t)=0",
						options: [],
						hints: [],
					},
				];
	const order = normalizedParts.map(({ id }) => id);
	const subSteps = Object.fromEntries(
		normalizedParts.map((part) => [
			part.id,
			createSubStepState(
				part.id,
				part.title,
				{ selected: null as string | null },
				part.hints,
			),
		]),
	) as Record<string, ConvolutionIntervalSubStepState>;

	return createMultiPartStepState(
		{},
		order,
		subSteps,
		order[0],
	) as ConvolutionIntervalMultiPartState;
}

/** Reactive state and validation controller for the five-step convolution tutor. */
export class ConvolutionStepSolverState extends BaseStepSolverState {
	/** Getter closure returning the active convolution problem. */
	private readonly getProblem: () => ConvolutionProblem;

	/** Active convolution problem definition. */
	get problem(): ConvolutionProblem {
		return this.getProblem();
	}

	/** Step 1 state: convolution integral definition. */
	step1: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 2 state: flip-and-shift transformation. */
	step2: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 3 state: transition-time partition. */
	step3: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 4 state: interval-by-interval overlap evaluation. */
	step4: ConvolutionIntervalMultiPartState = $state(
		createMultiPartStepState(
			{},
			["interval-placeholder"],
			{
				"interval-placeholder": createSubStepState(
					"interval-placeholder",
					"Evaluate Region",
					{ selected: null as string | null },
					[],
				),
			},
			"interval-placeholder",
		) as ConvolutionIntervalMultiPartState,
	);

	/** Step 5 state: final piecewise response assembly. */
	step5: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Progress through the Step 4 interval challenges. */
	get step4Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step4);
	}

	/** Returns the active state object for the current parent step. */
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
			default:
				return undefined;
		}
	}

	/** Progressive hints for the active parent step or interval sub-step. */
	activeHints = $derived.by((): string[] => {
		switch (this.currentStep) {
			case 1:
				return this.problem.itsData.step1.hints;
			case 2:
				return this.problem.itsData.step2.hints;
			case 3:
				return this.problem.itsData.step3.hints;
			case 4:
				return (
					this.step4.subSteps[this.step4.activeSubStepId]?.hints ?? []
				);
			case 5:
				return this.problem.itsData.step5.hints;
			default:
				return [];
		}
	});

	/**
	 * Creates a convolution solver controller.
	 *
	 * @param getProblem - Reactive getter for the active problem.
	 * @param getOnComplete - Optional reactive getter for the completion callback.
	 */
	constructor(
		getProblem: () => ConvolutionProblem,
		getOnComplete?: () => (() => void) | undefined,
	) {
		super(5, getOnComplete);
		this.getProblem = getProblem;
		this.reset();
	}

	/** Validates Step 1: defining convolution integral. */
	checkStep1(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step1,
			option,
			"Use the defining convolution integral with a flipped and shifted second signal.",
			"Select the expression that defines continuous-time convolution.",
			2,
		);
	}

	/** Validates Step 2: flip-and-shift transformation. */
	checkStep2(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step2,
			option,
			"Track the argument of the reflected and shifted impulse response carefully.",
			"Select the correctly flipped and shifted signal.",
			3,
		);
	}

	/** Validates Step 3: complete transition-time partition. */
	checkStep3(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step3,
			option,
			"Include every edge-contact event that changes the overlap or an integration bound.",
			"Select the complete transition-time partition.",
			4,
		);
	}

	/** Validates the active Step 4 interval expression. */
	checkStep4(option: ConvolutionItsOption | null): void {
		const activeId = this.step4.activeSubStepId;
		const activeState = this.step4.subSteps[activeId];
		if (!option) {
			this.setSubStepValidation(
				this.step4,
				activeId,
				"Select the evaluated output expression for this interval.",
			);
			return;
		}

		activeState.selected = option.id;
		if (!option.isCorrect) {
			this.setSubStepMisconception(
				this.step4,
				activeId,
				option.feedback ??
					"Re-evaluate the overlap integral using the active bounds for this region.",
			);
			return;
		}

		const currentIndex = this.step4.subStepOrder.indexOf(activeId);
		const nextSubStepId = this.step4.subStepOrder[currentIndex + 1];
		this.setSubStepPassed(
			this.step4,
			activeId,
			nextSubStepId,
			nextSubStepId ? undefined : 5,
		);
	}

	/** Validates Step 5: complete piecewise response assembly. */
	checkStep5(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step5,
			option,
			"Assemble every verified interval expression under its matching condition.",
			"Select the complete piecewise convolution response.",
			6,
		);
	}

	/** Resets all steps, sub-steps, feedback, and completion state. */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
		this.step1 = createStepState({ selected: null as string | null });
		this.step2 = createStepState({ selected: null as string | null });
		this.step3 = createStepState({ selected: null as string | null });
		this.step4 = createIntervalMultiPartState(this.problem);
		this.step5 = createStepState({ selected: null as string | null });
	}

	/** Named visual states for the five-step convolution tutor. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const states: SolverVisualStateDescriptor[] = [
			{
				id: "convolution.step-01.definition",
				label: "Step 1 · Convolution Definition",
				step: 1,
				kind: "interactive",
			},
			{
				id: "convolution.step-01.definition.hints",
				label: "Step 1 · Convolution Definition · All Hints",
				step: 1,
				kind: "hint",
			},
			{
				id: "convolution.step-02.flip-shift",
				label: "Step 2 · Flip and Shift",
				step: 2,
				kind: "interactive",
			},
			{
				id: "convolution.step-02.flip-shift.misconception",
				label: "Step 2 · Flip and Shift Misconception",
				step: 2,
				kind: "diagnostic",
			},
			{
				id: "convolution.step-03.transition-regions",
				label: "Step 3 · Transition Regions",
				step: 3,
				kind: "interactive",
			},
		];

		this.problem.itsData.step4.parts.forEach((part, index) => {
			const id = `convolution.step-04.${part.id}`;
			states.push(
				{
					id,
					label: `Step 4${String.fromCharCode(65 + index)} · ${part.title}`,
					step: 4,
					subStep: part.id,
					kind: "interactive",
				},
				{
					id: `${id}.hints`,
					label: `Step 4${String.fromCharCode(65 + index)} · ${part.title} · All Hints`,
					step: 4,
					subStep: part.id,
					kind: "hint",
				},
			);
		});

		states.push({
			id: "convolution.step-05.final-response",
			label: "Step 5 · Final Piecewise Response",
			step: 5,
			kind: "interactive",
		});
		return states;
	}

	/**
	 * Advances through completed parent steps using real validation methods.
	 *
	 * @param targetStep - Parent step to prepare.
	 * @returns Whether the requested step became active.
	 */
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

	/**
	 * Prepares one interval sub-step using earlier real validations.
	 *
	 * @param targetSubStepId - Interval part identifier to activate.
	 * @returns Whether the requested interval became active.
	 */
	private devPrepareStep4SubStep(targetSubStepId: string): boolean {
		if (!this.devPrepareParentStep(4)) return false;
		const targetIndex = this.problem.itsData.step4.parts.findIndex(
			({ id }) => id === targetSubStepId,
		);
		if (targetIndex === -1) return false;
		for (let index = 0; index < targetIndex; index += 1) {
			const correct = this.problem.itsData.step4.parts[
				index
			]?.options.find(({ isCorrect }) => isCorrect);
			if (!correct) return false;
			this.checkStep4(correct);
		}
		return this.step4.activeSubStepId === targetSubStepId;
	}

	/** Resets and prepares one named convolution visual state deterministically. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		if (!this.devGetVisualStates().some(({ id }) => id === stateId)) {
			return false;
		}

		switch (stateId) {
			case "convolution.step-01.definition":
				return this.devPrepareParentStep(1);
			case "convolution.step-01.definition.hints":
				if (!this.devPrepareParentStep(1)) return false;
				this.devRevealAllHints();
				return true;
			case "convolution.step-02.flip-shift":
				return this.devPrepareParentStep(2);
			case "convolution.step-02.flip-shift.misconception": {
				if (!this.devPrepareParentStep(2)) return false;
				const wrong = this.problem.itsData.step2.options.find(
					({ isCorrect }) => !isCorrect,
				);
				if (!wrong) return false;
				this.checkStep2(wrong);
				return this.currentFeedbackType === "misconception";
			}
			case "convolution.step-03.transition-regions":
				return this.devPrepareParentStep(3);
			case "convolution.step-05.final-response":
				return this.devPrepareParentStep(5);
			default:
				break;
		}

		if (stateId.startsWith("convolution.step-04.")) {
			const isHints = stateId.endsWith(".hints");
			const baseId = isHints ? stateId.slice(0, -6) : stateId;
			const targetSubStepId = baseId.replace("convolution.step-04.", "");
			if (!this.devPrepareStep4SubStep(targetSubStepId)) return false;
			if (isHints) this.devRevealAllHints();
			return true;
		}

		return false;
	}

	/**
	 * Automatically fills and validates one convolution tutor step in dev mode.
	 *
	 * @param stepIndex - Target parent step, defaulting to the active step.
	 */
	override devAutoFillStep(stepIndex?: number): void {
		if (!import.meta.env.DEV) return;
		const target = stepIndex ?? this.currentStep;
		switch (target) {
			case 1:
				this.checkStep1(
					this.problem.itsData.step1.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			case 2:
				this.checkStep2(
					this.problem.itsData.step2.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			case 3:
				this.checkStep3(
					this.problem.itsData.step3.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			case 4:
				while (this.currentStep === 4) {
					const part = this.problem.itsData.step4.parts.find(
						({ id }) => id === this.step4.activeSubStepId,
					);
					const correct = part?.options.find(
						({ isCorrect }) => isCorrect,
					);
					if (!correct) break;
					this.checkStep4(correct);
				}
				break;
			case 5:
				this.checkStep5(
					this.problem.itsData.step5.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			default:
				break;
		}
	}
}
