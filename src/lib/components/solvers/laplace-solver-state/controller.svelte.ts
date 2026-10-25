import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import {
	laplaceExpression,
	renderLaplaceFields,
} from "$lib/math-engine/laplace/answer-entry";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import type {
	LaplaceExercise,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";

/** Reactive checked task controller shared by the four Laplace workflows. */
export class LaplaceStepSolverState extends BaseStepSolverState {
	/** Current task within the parent stage. */ taskIndex = $state(0);
	/** Submitted expression or chosen answer. */ input = $state("");
	/** Independent coefficient drafts, never prefilled in learner controls. */ fieldInputs =
		$state<Record<string, string>>({});
	/** Feedback for each checked coefficient. */ fieldResults = $state<
		Record<string, TransformValidationResult>
	>({});
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
	/** @returns A single equation preview with blank slots preserved. */
	get preview(): string {
		const task = this.task;
		if (!task) return "";
		if (task.kind === "fields")
			return renderLaplaceFields(task.frame, this.fieldInputs);
		if (task.kind !== "s" && task.kind !== "t") return this.input;
		try {
			const expression =
				laplaceExpression(this.input, task.kind, task.lhs).trim() ||
				"\\square";
			return task.lhs ? `${task.lhs}=${expression}` : expression;
		} catch {
			return this.input;
		}
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
		this.fieldResults = {};
		this.state.feedback = null;
		this.state.feedbackType = null;
	}
	/** @returns Whether the current task passed independent verification. */
	check(): boolean {
		const task = this.task;
		if (!task || this.isCompleted) return false;
		const checked = validateLaplaceTask(
			task,
			this.input,
			this.fieldInputs,
			this.problem.terms,
		);
		const result = checked.result;
		this.fieldResults = checked.fields;
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
		this.verified = {
			...this.verified,
			[task.id]:
				task.kind === "choice" || task.kind === "scalar"
					? this.input
					: this.preview,
		};
		this.taskIndex++;
		if (
			this.taskIndex >=
			this.problem.stages[this.currentStep - 1]!.tasks.length
		) {
			this.taskIndex = 0;
			this.advanceToStep(this.currentStep + 1);
		}
		this.input = "";
		this.fieldInputs = {};
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
		this.fieldInputs = {};
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
			this.fillDevelopmentAnswer();
			if (!this.check()) break;
		}
	}
	/** Solves through real validators; never advances past a failed check. */
	override devSolveAll(): void {
		if (!import.meta.env.DEV) return;
		let limit = 0;
		while (!this.isCompleted && this.task && limit++ < 300) {
			this.fillDevelopmentAnswer();
			if (!this.check()) break;
		}
	}
	/** Fills targets only within the development harness; all answers still pass real validation. */
	private fillDevelopmentAnswer(): void {
		if (!import.meta.env.DEV || !this.task) return;
		if (this.task.kind === "fields")
			this.fieldInputs = Object.fromEntries(
				this.task.fields.map((field) => [field.id, field.target]),
			);
		else this.input = this.task.answer;
	}
}
