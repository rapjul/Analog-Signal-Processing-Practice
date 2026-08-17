/**
 * Diagnostic feedback classification for step solver responses.
 * - `validation`: Incomplete, blank, or non-numeric/invalid input format.
 * - `misconception`: Diagnosed pedagogical misconception or distractor pattern.
 * - `incorrect`: General calculation error or algebraic mismatch.
 */

export type StepFeedbackType = "validation" | "misconception" | "incorrect";

/**
 * Common state interface implemented by every sequential step in an ITS module.
 */
export interface BaseStepState {
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType: StepFeedbackType | null;
	/** Whether this step has passed validation */
	isValid: boolean;
}

/**
 * State interface for an individual sub-step / part within a multi-part step.
 */
export interface BaseSubStepState {
	/** Unique sub-step identifier */
	id: string;
	/** Sub-step title for display */
	title: string;
	/** Diagnostic feedback message if validation fails */
	feedback: string | null;
	/** Diagnostic feedback classification */
	feedbackType: StepFeedbackType | null;
	/** Current progressive hint tier for this sub-step (0 = closed, 1..N) */
	hintTier: number;
	/** Available hint strings specific to this sub-step */
	hints?: string[];
	/** Whether this sub-step has been validated and completed */
	isValid: boolean;
}

/**
 * State interface for a multi-part step containing sequential or conditional sub-steps.
 */
export interface MultiPartStepState<
	TSubStepId extends string = string,
> extends BaseStepState {
	/** Active sub-step identifier */
	activeSubStepId: TSubStepId;
	/** Ordered list of sub-step identifiers */
	subStepOrder: TSubStepId[];
	/** Map of individual sub-step states */
	subSteps: Record<TSubStepId, BaseSubStepState>;
}

/**
 * Metadata configuration for diagnostic feedback categories.
 */
export const FEEDBACK_META: Record<
	StepFeedbackType,
	{ title: string; icon: string; className: string }
> = {
	validation: {
		title: "Input Required:",
		icon: "ℹ️",
		className: "feedback-validation",
	},
	misconception: {
		title: "Misconception Detected:",
		icon: "⚠️",
		className: "feedback-misconception",
	},
	incorrect: {
		title: "Incorrect:",
		icon: "❌",
		className: "feedback-incorrect",
	},
};

/**
 * Factory helper function to initialize a step state with default validation fields.
 *
 * @template T - Custom step form fields object type.
 * @param {T} customFields - Initial custom field values for the step.
 * @returns {T & BaseStepState} The combined step state with initialized validation fields.
 */
export function createStepState<T extends object>(
	customFields: T,
): T & BaseStepState {
	return {
		...customFields,
		feedback: null,
		feedbackType: null,
		isValid: false,
	};
}

/**
 * Factory helper function to initialize a sub-step state with default validation fields.
 *
 * @template T - Custom sub-step form fields object type.
 * @param {string} id - Unique sub-step identifier.
 * @param {string} title - Sub-step display title.
 * @param {T} [customFields] - Initial custom field values for the sub-step.
 * @param {string[]} [hints] - Optional array of progressive hint strings.
 * @returns {T & BaseSubStepState} The combined sub-step state.
 */
export function createSubStepState<T extends object = Record<string, unknown>>(
	id: string,
	title: string,
	customFields: T = {} as T,
	hints?: string[],
): T & BaseSubStepState {
	return {
		...customFields,
		id,
		title,
		feedback: null,
		feedbackType: null,
		hintTier: 0,
		hints,
		isValid: false,
	};
}

/**
 * Factory helper function to initialize a multi-part step state.
 *
 * @template TSubStepId - Sub-step string literal identifier union.
 * @template TCustom - Custom step-level fields object type.
 * @param {TCustom} customFields - Initial step-level field values.
 * @param {TSubStepId[]} subStepOrder - Sequential array of sub-step IDs.
 * @param {Record<TSubStepId, BaseSubStepState>} subSteps - Map of sub-step states.
 * @param {TSubStepId} initialActiveId - Initial active sub-step ID.
 * @returns {TCustom & MultiPartStepState<TSubStepId>} The combined multi-part step state.
 */
export function createMultiPartStepState<
	TCustom extends object = Record<string, unknown>,
	TSubStepId extends string = string,
>(
	customFields: TCustom,
	subStepOrder: TSubStepId[],
	subSteps: Record<TSubStepId, BaseSubStepState>,
	initialActiveId: TSubStepId,
): TCustom & MultiPartStepState<TSubStepId> {
	return {
		...customFields,
		feedback: null,
		feedbackType: null,
		isValid: false,
		activeSubStepId: initialActiveId,
		subStepOrder,
		subSteps,
	};
}

/**
 * Abstract Base Step Solver State class for Svelte 5 ITS modules.
 *
 * Encapsulates universal step navigation, 3-tier progressive hint mechanics,
 * centralized feedback derivations, and step validation helpers.
 */
export abstract class BaseStepSolverState {
	/** Active 1-based step index */
	currentStep = $state<number>(1);

	/** Whether all steps have been successfully completed */
	isCompleted = $state<boolean>(false);

	/** Hint tier for the active step (0 = closed, 1 = Tier 1, 2 = Tier 2, 3 = Tier 3) */
	hintTier = $state<number>(0);

	/** Total number of sequential steps in this ITS module */
	readonly totalSteps: number;

	/** Getter closure for the completion callback function */
	readonly getOnComplete?: () => (() => void) | undefined;

	/**
	 * Abstract getter returning the active step state object for the current step.
	 */
	abstract get currentStepState(): BaseStepState | undefined;

	/**
	 * Active feedback message for the currently active step.
	 */
	currentFeedback = $derived.by((): string => {
		return this.currentStepState?.feedback ?? "";
	});

	/**
	 * Diagnostic feedback classification for the currently active step.
	 */
	currentFeedbackType = $derived.by((): StepFeedbackType | null => {
		return this.currentStepState?.feedbackType ?? null;
	});

	/**
	 * Diagnostic title label for the active feedback banner.
	 */
	currentFeedbackTitle = $derived.by((): string => {
		if (!this.currentFeedbackType) return "Feedback:";
		return FEEDBACK_META[this.currentFeedbackType]?.title ?? "Feedback:";
	});

	/**
	 * Icon emoji indicator corresponding to the active feedback type.
	 */
	currentFeedbackIcon = $derived.by((): string => {
		if (!this.currentFeedbackType) return "ℹ️";
		return FEEDBACK_META[this.currentFeedbackType]?.icon ?? "ℹ️";
	});

	/**
	 * Creates an instance of BaseStepSolverState.
	 * @param {number} totalSteps Total number of steps in the ITS module
	 * @param {() => (() => void) | undefined} [getOnComplete] Optional completion callback getter
	 */
	constructor(
		totalSteps: number,
		getOnComplete?: () => (() => void) | undefined,
	) {
		this.totalSteps = totalSteps;
		this.getOnComplete = getOnComplete;
	}

	/**
	 * Increments the hint tier for the active step up to Tier 3.
	 */
	revealNextHint(): void {
		if (this.hintTier < 3) {
			this.hintTier += 1;
		}
	}

	/**
	 * Advances to a specified target step and resets the hint tier.
	 * Triggers onComplete callback when progressing past the final step.
	 * @param {number} nextStep Target 1-based step index
	 */
	advanceToStep(nextStep: number): void {
		this.currentStep = nextStep;
		this.hintTier = 0;
		if (nextStep > this.totalSteps) {
			this.isCompleted = true;
			this.getOnComplete?.()?.();
		}
	}

	/**
	 * Sets an input validation error on the given step state.
	 *
	 * @param {BaseStepState} step - Step state to update.
	 * @param {string} message - Validation feedback message to display.
	 */
	setValidation(step: BaseStepState, message: string): void {
		step.isValid = false;
		step.feedbackType = "validation";
		step.feedback = message;
	}

	/**
	 * Sets a pedagogical misconception alert on the given step state.
	 *
	 * @param {BaseStepState} step - Step state to update.
	 * @param {string} message - Misconception explanation message to display.
	 */
	setMisconception(step: BaseStepState, message: string): void {
		step.isValid = false;
		step.feedbackType = "misconception";
		step.feedback = message;
	}

	/**
	 * Sets a generic incorrect answer error on the given step state.
	 *
	 * @param {BaseStepState} step - Step state to update.
	 * @param {string} message - Incorrect error message to display.
	 */
	setIncorrect(step: BaseStepState, message: string): void {
		step.isValid = false;
		step.feedbackType = "incorrect";
		step.feedback = message;
	}

	/**
	 * Clears the feedback and validation state for the current active step.
	 */
	clearFeedback(): void {
		if (this.currentStepState) {
			this.currentStepState.feedback = null;
			this.currentStepState.feedbackType = null;
		}
	}

	/**
	 * Marks the given step state as passed and optionally advances to the next step.
	 *
	 * @param {BaseStepState} step - Step state to mark as valid.
	 * @param {number} [nextStep] - Optional next step index to advance to.
	 */
	setPassed(step: BaseStepState, nextStep?: number): void {
		step.isValid = true;
		step.feedback = null;
		step.feedbackType = null;
		if (nextStep !== undefined) {
			this.advanceToStep(nextStep);
		}
	}

	/**
	 * Validates a multiple-choice / discrete taxonomy selection step.
	 *
	 * @template T - Discrete choice string literal type.
	 * @param {BaseStepState & { selected: T | null }} step - Active step state.
	 * @param {T | null} selection - Student's selection.
	 * @param {T} correctValue - Expected correct option.
	 * @param {Record<string, string>} misconceptions - Map of option IDs to targeted misconception messages.
	 * @param {string} fallbackFeedback - Generic feedback if option is incorrect without targeted misconception.
	 * @param {string} [validationMsg] - Validation message if selection is empty.
	 * @param {number} [nextStep] - Step to advance to upon success.
	 */
	checkChoiceStep<T extends string>(
		step: BaseStepState & { selected: T | null },
		selection: T | null,
		correctValue: T,
		misconceptions: Record<string, string>,
		fallbackFeedback: string,
		validationMsg = "Please select an option.",
		nextStep?: number,
	): void {
		if (!selection) {
			this.setValidation(step, validationMsg);
			return;
		}

		step.selected = selection;
		if (selection === correctValue) {
			this.setPassed(step, nextStep);
		} else {
			this.setMisconception(
				step,
				misconceptions[selection] ?? fallbackFeedback,
			);
		}
	}

	/**
	 * Validates an option card selection step.
	 *
	 * @template T - Option card object type with id, isCorrect, and feedback properties.
	 * @param {BaseStepState & { selected: string | null }} step - Active step state.
	 * @param {T | null} option - Selected option card object.
	 * @param {string} fallbackFeedback - Generic feedback if option is incorrect without specific feedback.
	 * @param {string} [validationMsg] - Validation message if option is unselected.
	 * @param {number} [nextStep] - Step to advance to upon success.
	 */
	checkOptionCardStep<
		T extends { id: string; isCorrect: boolean; feedback?: string },
	>(
		step: BaseStepState & { selected: string | null },
		option: T | null,
		fallbackFeedback: string,
		validationMsg = "Please select an option.",
		nextStep?: number,
	): void {
		if (!option) {
			this.setValidation(step, validationMsg);
			return;
		}

		step.selected = option.id;
		if (option.isCorrect) {
			this.setPassed(step, nextStep);
		} else {
			this.setMisconception(step, option.feedback ?? fallbackFeedback);
		}
	}

	/**
	 * Sets an input validation error on a specific sub-step of a multi-part step.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state containing the sub-step.
	 * @param {string} subStepId - Target sub-step identifier.
	 * @param {string} message - Validation feedback message to display.
	 */
	setSubStepValidation(
		step: MultiPartStepState,
		subStepId: string,
		message: string,
	): void {
		const sub = step.subSteps[subStepId];
		if (sub) {
			sub.isValid = false;
			sub.feedbackType = "validation";
			sub.feedback = message;
		}
		this.setValidation(step, message);
	}

	/**
	 * Sets a pedagogical misconception alert on a specific sub-step.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state containing the sub-step.
	 * @param {string} subStepId - Target sub-step identifier.
	 * @param {string} message - Misconception explanation message to display.
	 */
	setSubStepMisconception(
		step: MultiPartStepState,
		subStepId: string,
		message: string,
	): void {
		const sub = step.subSteps[subStepId];
		if (sub) {
			sub.isValid = false;
			sub.feedbackType = "misconception";
			sub.feedback = message;
		}
		this.setMisconception(step, message);
	}

	/**
	 * Sets a generic incorrect answer error on a specific sub-step.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state containing the sub-step.
	 * @param {string} subStepId - Target sub-step identifier.
	 * @param {string} message - Incorrect error message to display.
	 */
	setSubStepIncorrect(
		step: MultiPartStepState,
		subStepId: string,
		message: string,
	): void {
		const sub = step.subSteps[subStepId];
		if (sub) {
			sub.isValid = false;
			sub.feedbackType = "incorrect";
			sub.feedback = message;
		}
		this.setIncorrect(step, message);
	}

	/**
	 * Clears the diagnostic feedback for a specific sub-step and the parent step.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state.
	 * @param {string} subStepId - Target sub-step identifier.
	 */
	clearSubStepFeedback(step: MultiPartStepState, subStepId: string): void {
		const sub = step.subSteps[subStepId];
		if (sub) {
			sub.feedback = null;
			sub.feedbackType = null;
		}
		this.clearFeedback();
	}

	/**
	 * Marks a sub-step as passed, resets its feedback, and transitions to the next sub-step or parent step.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state.
	 * @param {string} subStepId - Sub-step identifier to mark valid.
	 * @param {string} [nextSubStepId] - Next sub-step ID within the active step.
	 * @param {number} [nextParentStep] - Next parent step index if all sub-steps completed.
	 */
	setSubStepPassed(
		step: MultiPartStepState,
		subStepId: string,
		nextSubStepId?: string,
		nextParentStep?: number,
	): void {
		const sub = step.subSteps[subStepId];
		if (sub) {
			sub.isValid = true;
			sub.feedback = null;
			sub.feedbackType = null;
		}
		this.clearFeedback();

		if (nextSubStepId) {
			step.activeSubStepId = nextSubStepId;
			this.hintTier = 0;
			// Reset sub-step hint tier for the next sub-step
			const nextSub = step.subSteps[nextSubStepId];
			if (nextSub) {
				nextSub.hintTier = 0;
			}
		} else if (nextParentStep !== undefined) {
			this.setPassed(step, nextParentStep);
		}
	}

	/**
	 * Increments the hint tier for a specific sub-step up to maxTiers.
	 *
	 * @param {MultiPartStepState} step - Multi-part step state.
	 * @param {string} subStepId - Target sub-step identifier.
	 * @param {number} [maxTiers=3] - Maximum available hint tiers for this sub-step.
	 */
	revealSubStepHint(
		step: MultiPartStepState,
		subStepId: string,
		maxTiers = 3,
	): void {
		const sub = step.subSteps[subStepId];
		if (sub && sub.hintTier < maxTiers) {
			sub.hintTier += 1;
		}
	}

	/**
	 * Resets all solver state and step answers for a new problem instance.
	 */
	abstract reset(): void;
}
