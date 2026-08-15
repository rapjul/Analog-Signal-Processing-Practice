/**
 * Diagnostic feedback classification for step solver responses.
 * - `validation`: Incomplete, blank, or non-numeric/invalid input format.
 * - `misconception`: Diagnosed pedagogical misconception or distractor pattern.
 * - `incorrect`: General calculation error or algebraic mismatch.
 */
export type StepFeedbackType = "validation" | "misconception" | "incorrect";

/**
 * Abstract Base Step Solver State class for Svelte 5 ITS modules.
 *
 * Encapsulates universal step navigation, 3-tier progressive hint mechanics,
 * and solver completion status.
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
	 * Resets all solver state and step answers for a new problem instance.
	 */
	abstract reset(): void;
}
