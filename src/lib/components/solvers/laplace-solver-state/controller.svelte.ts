import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import type {
	LaplaceExercise,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";

/** Reactive checked task controller shared by the four Laplace workflows. */
export class LaplaceStepSolverState extends BaseStepSolverState {
	/** Current task within the parent stage. */ taskIndex = $state(0);
	/** Submitted expression or chosen answer. */ input = $state("");
	/** Inputs already established by validation. */ verified = $state<
		Record<string, string>
	>({});
	/** Current feedback and validation state. */ state = $state(
		createStepState({}),
	);
	/** Exact grading status, retained separately from pedagogical feedback. */ result =
		$state<TransformValidationResult | null>(null);
	/** Active immutable exercise. */ readonly problem: LaplaceExercise;

	/** @param problem - Validated exercise. @param onComplete - Completion notification. */
	constructor(problem: LaplaceExercise, onComplete?: () => void) {
		super(problem.stages.length, () => onComplete);
		this.problem = problem;
	}
	/** @returns Active stage's task. */
	get task(): LaplaceTask | undefined {
		return this.problem.stages[this.currentStep - 1]?.tasks[this.taskIndex];
	}
	/** @returns Feedback contract for shared tutoring components. */
	get currentStepState(): BaseStepState {
		return this.state;
	}
	/** @returns Hints for the current task only. */
	get activeHints(): string[] {
		return this.task?.hints ?? [];
	}
	/** @returns Progress within the active stage. */
	get progress() {
		const total =
			this.problem.stages[this.currentStep - 1]?.tasks.length ?? 0;
		return {
			current: this.taskIndex + 1,
			total,
			label: `Part ${this.taskIndex + 1} of ${total}`,
		};
	}
	/** Clears stale feedback after an edit without validating the new input. */
	override clearFeedback(): void {
		this.result = null;
		this.state.feedback = null;
		this.state.feedbackType = null;
	}
	/** @returns Whether the current task passed independent verification. */
	check(): boolean {
		const task = this.task;
		if (!task || this.isCompleted) return false;
		const result: TransformValidationResult = !this.input.trim()
			? {
					status: "invalid",
					message: "Enter or select an answer before checking.",
				}
			: task.kind === "choice"
				? {
						status:
							this.input === task.answer
								? "correct"
								: "incorrect",
						message:
							"Recheck the mathematical distinction in this question.",
					}
				: task.kind === "t"
					? verifyLaplaceTime(
							this.input,
							task.terms ?? this.problem.terms,
						)
					: verifyLaplaceS(this.input, task.answer);
		this.result = result;
		if (result.status !== "correct") {
			this.state.feedback = result.message;
			this.state.feedbackType =
				result.status === "invalid" || result.status === "unsupported"
					? "validation"
					: task.kind === "choice"
						? "misconception"
						: "incorrect";
			return false;
		}
		this.verified = { ...this.verified, [task.id]: this.input };
		this.taskIndex++;
		if (
			this.taskIndex >=
			this.problem.stages[this.currentStep - 1]!.tasks.length
		) {
			this.taskIndex = 0;
			this.advanceToStep(this.currentStep + 1);
		}
		this.input = "";
		this.hintTier = 0;
		this.clearFeedback();
		return true;
	}
	/** Resets every task, hint, answer, and completion flag. */
	reset(): void {
		this.currentStep = 1;
		this.taskIndex = 0;
		this.isCompleted = false;
		this.input = "";
		this.verified = {};
		this.hintTier = 0;
		this.state = createStepState({});
		this.result = null;
	}
	/** @param step - Optional active parent step. Fills through the real validators in development only. */
	override devAutoFillStep(step = this.currentStep): void {
		if (!import.meta.env.DEV || step !== this.currentStep) return;
		let limit = 0;
		while (
			!this.isCompleted &&
			this.currentStep === step &&
			this.task &&
			limit++ < 100
		) {
			this.input = this.task.answer;
			if (!this.check()) break;
		}
	}
	/** Solves through real validators; never advances past a failed check. */
	override devSolveAll(): void {
		if (!import.meta.env.DEV) return;
		let limit = 0;
		while (!this.isCompleted && this.task && limit++ < 300) {
			this.input = this.task.answer;
			if (!this.check()) break;
		}
	}
}
