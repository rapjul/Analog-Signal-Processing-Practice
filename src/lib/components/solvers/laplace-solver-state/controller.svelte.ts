import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
} from "$lib/components/solvers/base-step-solver.svelte";
import {
	laplaceExpression,
	renderLaplaceFields,
} from "$lib/math-engine/laplace/answer-entry";
import {
	constructionPreview,
	emptyConstruction,
} from "$lib/math-engine/laplace/construction";
import type { ConstructionFeedback } from "$lib/math-engine/laplace/construction-feedback";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import type {
	LaplaceConstruction,
	LaplaceExercise,
	LaplaceTask,
} from "$lib/math-engine/laplace/types";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { type LaplaceVisualScene, laplaceVisualScenes } from "./visual";

/** Reactive checked task controller shared by the four Laplace workflows. */
export class LaplaceStepSolverState extends BaseStepSolverState {
	/** Current task within the parent stage. */ taskIndex = $state(0);
	/** Construction errors keyed by row and field. */ constructionResults =
		$state<ConstructionFeedback>({});
	/** Submitted expression or chosen answer. */ input = $state("");
	/** Learner-built factor, root, or template draft. */ construction =
		$state<LaplaceConstruction>(emptyConstruction());
	/** Accepted strategy selections control supported task branches. */ decisions =
		$state<Record<string, string>>({});
	/** Independent coefficient drafts, never prefilled in learner controls. */ fieldInputs =
		$state<Record<string, string>>({});
	/** Feedback for each checked coefficient. */ fieldResults = $state<
		Record<string, TransformValidationResult>
	>({});
	/** Inputs already established by validation. */ verified = $state<
		Record<string, string>
	>({});
	/** Derived summaries recorded after checked source work, never independent passes. */ carried =
		$state<Record<string, string[]>>({});
	/** Current feedback and validation state. */ state = $state(
		createStepState({}),
	);
	/** Exact grading status, retained separately from pedagogical feedback. */ result =
		$state<TransformValidationResult | null>(null);
	/** Active immutable exercise. */ readonly problem: LaplaceExercise;
	/** Lazily prepared development-only scene catalog. */ private visualScenes?: LaplaceVisualScene[];

	/** @param problem - Validated exercise. @param onComplete - Completion notification. */
	constructor(problem: LaplaceExercise, onComplete?: () => void) {
		super(problem.stages.length, () => onComplete);
		this.problem = problem;
	}
	/** @returns Active stage's task. */
	get task(): LaplaceTask | undefined {
		return this.tasksForStage(this.currentStep - 1)[this.taskIndex];
	}
	/** @param index - Original stage index. @returns Visible tasks on the selected supported path. */
	tasksForStage(index: number): LaplaceTask[] {
		return (this.problem.stages[index]?.tasks ?? []).filter(
			(task) =>
				!task.when ||
				task.when.values.includes(this.decisions[task.when.id] ?? ""),
		);
	}
	/** @returns Stages whose branch is either not yet selected or has active work. */
	get visibleStages() {
		return this.problem.stages.filter(
			(stage, index) =>
				this.tasksForStage(index).length ||
				stage.tasks.some(
					(task) =>
						task.when && this.decisions[task.when.id] === undefined,
				),
		);
	}
	/** @returns Contiguous display step number after irrelevant branches are removed. */
	get displayStep(): number {
		return this.isCompleted
			? this.visibleStages.length + 1
			: this.visibleStages.indexOf(
					this.problem.stages[this.currentStep - 1]!,
				) + 1;
	}
	/** @returns Whether the active draft has passed and awaits explicit continuation. */
	get awaitingContinue(): boolean {
		return this.result?.status === "correct";
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
		if (
			task.kind === "factors" ||
			task.kind === "roots" ||
			task.kind === "template"
		)
			return constructionPreview(task, this.construction);
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
		const total = this.tasksForStage(this.currentStep - 1).length;
		return {
			current: this.taskIndex + 1,
			total,
			label: `Part ${this.taskIndex + 1} of ${total}`,
		};
	}
	/** Clears stale feedback after an edit without validating the new input. */
	override clearFeedback(): void {
		this.constructionResults = {};
		this.result = null;
		this.fieldResults = {};
		this.state.feedback = null;
		this.state.feedbackType = null;
	}
	/** @returns Whether the current task passed independent verification. */
	check(): boolean {
		const task = this.task;
		if (!task || this.isCompleted) return false;
		if (this.awaitingContinue) return true;
		const checked = validateLaplaceTask(
			task,
			this.input,
			this.fieldInputs,
			this.problem.terms,
			this.construction,
		);
		const result = checked.result;
		this.fieldResults = checked.fields;
		this.constructionResults = checked.construction ?? {};
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
		this.state.feedback = null;
		this.state.feedbackType = null;
		return true;
	}
	/** Records independently checked work and advances only after the learner reads its explanation. */
	continue(): void {
		const task = this.task;
		if (!task || !this.awaitingContinue) return;
		if (task.kind === "choice")
			this.decisions = { ...this.decisions, [task.id]: this.input };
		this.verified = {
			...this.verified,
			[task.id]:
				task.kind === "choice" || task.kind === "scalar"
					? this.input
					: this.preview,
		};
		if (task.conclusions)
			this.carried = { ...this.carried, [task.id]: task.conclusions };
		this.taskIndex++;
		if (this.taskIndex >= this.tasksForStage(this.currentStep - 1).length) {
			this.taskIndex = 0;
			let next = this.currentStep + 1;
			while (
				next <= this.totalSteps &&
				!this.tasksForStage(next - 1).length
			)
				next++;
			this.advanceToStep(next);
		}
		this.input = "";
		this.fieldInputs = {};
		this.construction = emptyConstruction();
		this.hintTier = 0;
		this.clearFeedback();
	}
	/** Resets every task, hint, answer, and completion flag. */
	reset(): void {
		this.constructionResults = {};
		this.fieldResults = {};
		this.currentStep = 1;
		this.taskIndex = 0;
		this.isCompleted = false;
		this.input = "";
		this.fieldInputs = {};
		this.verified = {};
		this.carried = {};
		this.decisions = {};
		this.construction = emptyConstruction();
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
			this.continue();
		}
	}
	/** Solves through real validators; never advances past a failed check. */
	override devSolveAll(): void {
		if (!import.meta.env.DEV) return;
		let limit = 0;
		while (!this.isCompleted && this.task && limit++ < 300) {
			this.fillDevelopmentAnswer();
			if (!this.check()) break;
			this.continue();
		}
	}
	/** @param answer - Optional accepted strategy choice. Fills development targets that still pass real validation. */
	private fillDevelopmentAnswer(answer?: string): void {
		if (!import.meta.env.DEV || !this.task) return;
		if (this.task.kind === "fields")
			this.fieldInputs = Object.fromEntries(
				this.task.fields.map((field) => [field.id, field.target]),
			);
		else if ("construction" in this.task)
			this.construction = structuredClone(
				$state.snapshot(this.task.construction),
			);
		else this.input = answer ?? this.task.answer;
	}
	/** @returns Every reachable task phase on each accepted strategy branch, in teaching order. */
	override devGetVisualStates(): LaplaceVisualScene[] {
		if (!import.meta.env.DEV) return [];
		return (this.visualScenes ??= laplaceVisualScenes(
			$state.snapshot(this.problem),
		));
	}
	/** @param stateId - Stable branch/task/phase identity. @returns Whether checked prerequisite replay reached the requested scene. */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		const scene = this.devGetVisualStates().find(
			(candidate) => candidate.id === stateId,
		);
		if (!scene) return false;
		this.prepareVisualReplay(scene);
		let guard = 0;
		while (this.task && guard++ < 1000) {
			if (this.isAtVisualScene(scene))
				return this.applyVisualScene(scene);
			this.fillDevelopmentAnswer(scene.decisions[this.task.id]);
			if (!this.check()) return false;
			this.continue();
		}
		return false;
	}
	/** @param scene - Requested task and stage. @returns Whether the live controller is at that exact task. */
	private isAtVisualScene(scene: LaplaceVisualScene): boolean {
		return (
			this.task?.id === scene.taskId &&
			this.problem.stages[this.currentStep - 1]?.id === scene.stageId
		);
	}
	/** @param scene - Requested branch. Resets incompatible prerequisites or clears only the current draft when verified work can be reused. */
	private prepareVisualReplay(scene: LaplaceVisualScene): void {
		const samePath = Object.entries(this.decisions).every(
			([id, answer]) => scene.decisions[id] === answer,
		);
		if (!this.isAtVisualScene(scene) || !samePath) this.reset();
		else {
			this.input = "";
			this.fieldInputs = {};
			this.construction = emptyConstruction();
			this.hintTier = 0;
			this.clearFeedback();
		}
	}
	/** @param scene - Reachable capture phase. @returns Whether real validation or hint revelation prepared the advertised state. */
	private applyVisualScene(scene: LaplaceVisualScene): boolean {
		if (scene.phase === "diagnostic" && scene.draft) {
			this.input = scene.draft.input;
			this.fieldInputs = { ...scene.draft.fields };
			this.construction = structuredClone(scene.draft.construction);
			this.check();
			return this.result?.status === scene.feedbackStatus;
		}
		if (scene.phase === "success") {
			this.fillDevelopmentAnswer(scene.decisions[scene.taskId]);
			return this.check();
		}
		for (let tier = 0; tier < (scene.hintTier ?? 0); tier++)
			this.revealNextHint();
		return true;
	}
}
