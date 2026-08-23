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
	step: "step5" | "step6",
): ConvolutionIntervalMultiPartState {
	const parts = problem.itsData[step].parts;
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

	/** Step 1 state: signal support analysis. */
	step1: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 2 state: convolution integral definition. */
	step2: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 3 state: selected flip-and-shift path. */
	step3: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 4 state: transition-time partition. */
	step4: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Step 5 state: interval-by-interval integral setup. */
	step5: ConvolutionIntervalMultiPartState = $state(
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

	/** Step 6 state: interval-by-interval evaluation. */
	step6: ConvolutionIntervalMultiPartState = $state(
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

	/** Step 7 state: final piecewise response assembly. */
	step7: ConvolutionChoiceStepState = $state(
		createStepState({ selected: null as string | null }),
	);

	/** Progress through the Step 5 setup challenges. */
	get step5Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step5);
	}

	/** Progress through the Step 6 evaluation challenges. */
	get step6Progress(): SubStepProgress {
		return this.getSubStepProgress(this.step6);
	}

	/** Signal selected by the student for the moving flip-and-shift path. */
	get flippedSignal(): "x" | "h" {
		return this.step3.selected === "flip-x" ? "x" : "h";
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
			case 6:
				return this.step6;
			case 7:
				return this.step7;
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
				return this.problem.itsData.step4.hints;
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
		super(7, getOnComplete);
		this.getProblem = getProblem;
		this.reset();
	}

	/** Validates Step 1: support analysis. */
	checkStep1(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step1,
			option,
			"Convolution adds support locations; intersection is reserved for active integration bounds.",
			"Select the support relationship before continuing.",
			2,
		);
	}

	/** Validates Step 2: defining convolution integral. */
	checkStep2(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step2,
			option,
			"Use an integral over a dummy variable and reflect one signal.",
			"Select the expression that defines continuous-time convolution.",
			3,
		);
	}

	/** Validates Step 3: selecting either valid flip path. */
	checkStep3(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step3,
			option,
			"Either signal may move, but it must use the argument $t-\\tau$.",
			"Choose the signal you want to flip and shift.",
			4,
		);
	}

	/** Validates Step 4: complete transition-time partition. */
	checkStep4(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step4,
			option,
			"Include every edge and interior-breakpoint contact that changes the active formula or bound.",
			"Select the complete transition-time partition.",
			5,
		);
	}

	/** Validates the active Step 5 integral setup. */
	checkStep5(option: ConvolutionItsOption | null): void {
		this.checkIntervalPart(this.step5, option, 6, "integral setup");
	}

	/** Validates the active Step 6 evaluated expression. */
	checkStep6(option: ConvolutionItsOption | null): void {
		this.checkIntervalPart(
			this.step6,
			option,
			7,
			"evaluated output expression",
		);
	}

	/** Validates one active multipart interval response. */
	private checkIntervalPart(
		state: ConvolutionIntervalMultiPartState,
		option: ConvolutionItsOption | null,
		nextParentStep: number,
		answerName: string,
	): void {
		const activeId = state.activeSubStepId;
		const activeState = state.subSteps[activeId];
		if (!option) {
			this.setSubStepValidation(
				state,
				activeId,
				`Select the ${answerName} for this interval.`,
			);
			return;
		}

		activeState.selected = option.id;
		if (!option.isCorrect) {
			this.setSubStepMisconception(
				state,
				activeId,
				option.feedback ??
					"Recheck the active support intersection and bounds for this region.",
			);
			return;
		}

		const currentIndex = state.subStepOrder.indexOf(activeId);
		const nextSubStepId = state.subStepOrder[currentIndex + 1];
		this.setSubStepPassed(
			state,
			activeId,
			nextSubStepId,
			nextSubStepId ? undefined : nextParentStep,
		);
	}

	/** Validates Step 7: complete piecewise response assembly. */
	checkStep7(option: ConvolutionItsOption | null): void {
		this.checkOptionCardStep(
			this.step7,
			option,
			"Assemble every verified interval expression under its matching condition.",
			"Select the complete piecewise convolution response.",
			8,
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
		this.step4 = createStepState({ selected: null as string | null });
		this.step5 = createIntervalMultiPartState(this.problem, "step5");
		this.step6 = createIntervalMultiPartState(this.problem, "step6");
		this.step7 = createStepState({ selected: null as string | null });
	}

	/** Named visual states for the seven-step convolution tutor. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const labels = [
			"Signal Supports",
			"Convolution Definition",
			"Choose Flip Path",
			"Transition Points",
		];
		const states: SolverVisualStateDescriptor[] = labels.map(
			(label, index) => ({
				id: `convolution.step-${String(index + 1).padStart(2, "0")}`,
				label: `Step ${index + 1} · ${label}`,
				step: index + 1,
				kind: "interactive",
			}),
		);
		for (const [step, data] of [
			[5, this.problem.itsData.step5],
			[6, this.problem.itsData.step6],
		] as const) {
			data.parts.forEach((part, index) => {
				const id = `convolution.step-${String(step).padStart(2, "0")}.${part.id}`;
				states.push(
					{
						id,
						label: `Step ${step}${String.fromCharCode(65 + index)} · ${part.title}`,
						step,
						subStep: part.id,
						kind: "interactive",
					},
					{
						id: `${id}.hints`,
						label: `Step ${step}${String.fromCharCode(65 + index)} · ${part.title} · All Hints`,
						step,
						subStep: part.id,
						kind: "hint",
					},
				);
			});
		}
		states.push({
			id: "convolution.step-07.final-response",
			label: "Step 7 · Final Piecewise Response",
			step: 7,
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
	private devPrepareIntervalSubStep(
		step: 5 | 6,
		targetSubStepId: string,
	): boolean {
		if (!this.devPrepareParentStep(step)) return false;
		const data = this.problem.itsData[step === 5 ? "step5" : "step6"];
		const state = step === 5 ? this.step5 : this.step6;
		const targetIndex = data.parts.findIndex(
			({ id }) => id === targetSubStepId,
		);
		if (targetIndex === -1) return false;
		for (let index = 0; index < targetIndex; index += 1) {
			const correct = data.parts[index]?.options.find(
				({ isCorrect }) => isCorrect,
			);
			if (!correct) return false;
			if (step === 5) this.checkStep5(correct);
			else this.checkStep6(correct);
		}
		return state.activeSubStepId === targetSubStepId;
	}

	/** Resets and prepares one named convolution visual state deterministically. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		if (!this.devGetVisualStates().some(({ id }) => id === stateId)) {
			return false;
		}

		if (/^convolution\.step-0[1-4]$/.test(stateId)) {
			return this.devPrepareParentStep(Number(stateId.slice(18)));
		}
		if (stateId === "convolution.step-07.final-response") {
			return this.devPrepareParentStep(7);
		}
		for (const step of [5, 6] as const) {
			const prefix = `convolution.step-${String(step).padStart(2, "0")}.`;
			if (!stateId.startsWith(prefix)) continue;
			const isHints = stateId.endsWith(".hints");
			const baseId = isHints ? stateId.slice(0, -6) : stateId;
			const targetSubStepId = baseId.replace(prefix, "");
			if (!this.devPrepareIntervalSubStep(step, targetSubStepId))
				return false;
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
				this.checkStep4(
					this.problem.itsData.step4.options.find(
						({ isCorrect }) => isCorrect,
					) ?? null,
				);
				break;
			case 5:
				while (this.currentStep === 5) {
					const part = this.problem.itsData.step5.parts.find(
						({ id }) => id === this.step5.activeSubStepId,
					);
					const correct = part?.options.find(
						({ isCorrect }) => isCorrect,
					);
					if (!correct) break;
					this.checkStep5(correct);
				}
				break;
			case 6:
				while (this.currentStep === 6) {
					const part = this.problem.itsData.step6.parts.find(
						({ id }) => id === this.step6.activeSubStepId,
					);
					const correct = part?.options.find(
						({ isCorrect }) => isCorrect,
					);
					if (!correct) break;
					this.checkStep6(correct);
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
