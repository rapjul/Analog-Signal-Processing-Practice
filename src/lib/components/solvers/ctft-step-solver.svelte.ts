/** Guarded reactive CTFT tutor, sharing the established solver lifecycle. */

import {
	buildCtftLesson,
	type CtftLesson,
	type CtftLessonPart,
	type CtftPracticeMode,
	type CtftStageId,
} from "$lib/math-engine/ctft-lesson";
import {
	validateCtftConstant,
	validateCtftImpulseRows,
	validateCtftPhase,
} from "$lib/math-engine/ctft-tutor-validation";
import {
	type GeneratedCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import {
	BaseStepSolverState,
	type BaseStepState,
	createStepState,
	type SolverVisualStateDescriptor,
} from "./base-step-solver.svelte";

/** Reactive response and verification for one independently checked field. */
export interface CtftPartState extends BaseStepState {
	/** Student-owned text or choice identifier. */ input: string;
	/** Full mathematical verification status. */ result: TransformValidationResult | null;
}
/** Reactive stage with its sequential task cursor. */
export interface CtftStageState extends BaseStepState {
	/** Next task index. */ cursor: number;
	/** Per-task response state. */ parts: Record<string, CtftPartState>;
}

/** Parameter-owned controller for either CTFT teaching path. */
export class CtftStepSolverState extends BaseStepSolverState {
	/** Immutable authoritative problem. */ readonly problem: GeneratedCtftProblem;
	/** Immutable teaching path and mathematical targets. */ readonly lesson: CtftLesson;
	/** Fresh state for each mathematical stage. */ stages = $state<
		Record<string, CtftStageState>
	>({});
	/** Invalidates pending UI work when this controller is restarted. */ revision =
		$state(0);

	/**
	 * Creates a controller for one problem and mode; mode changes recreate it.
	 * @param problem - Active parameter-owned problem.
	 * @param mode - Selected teaching approach.
	 * @param onComplete - Optional exactly-once completion callback.
	 */
	constructor(
		problem: GeneratedCtftProblem,
		mode: CtftPracticeMode,
		onComplete?: () => void,
	) {
		super(
			mode === "derivation" ? 6 : 5,
			/** @returns This attempt's completion callback. */
			() => onComplete,
		);
		this.problem = problem;
		this.lesson = buildCtftLesson(problem, mode);
		this.reset();
	}

	/** @returns Active lesson stage. */
	get activeStage() {
		return this.lesson.stages[this.currentStep - 1];
	}
	/** @returns Active typed or choice task. */
	get activePart(): CtftLessonPart | undefined {
		const stage = this.activeStage;
		return stage?.parts[this.stages[stage.id]?.cursor ?? 0];
	}
	/** @returns Active field state for shared feedback components. */
	get currentStepState(): CtftPartState | undefined {
		return this.activeStage && this.activePart
			? this.stages[this.activeStage.id]?.parts[this.activePart.id]
			: undefined;
	}
	/** @returns Only guidance for the current mode and task. */
	get activeHints(): string[] {
		return this.activePart?.hints ?? [];
	}
	/** @returns Current substep position for the shared progress pill. */
	get partProgress() {
		const total = this.activeStage?.parts.length ?? 0;
		const current = this.activeStage
			? (this.stages[this.activeStage.id]?.cursor ?? 0) + 1
			: 0;
		return { current, total, label: `Part ${current} of ${total}` };
	}

	/**
	 * Grades only the task currently owned by this controller.
	 * @param stageId - Mathematical stage captured by the submitting form.
	 * @param partId - Task captured by the submitting form.
	 */
	check(stageId: CtftStageId, partId: string): void {
		const task = this.activePart;
		if (
			this.isCompleted ||
			this.activeStage?.id !== stageId ||
			task?.id !== partId
		)
			return;
		const stage = this.stages[stageId];
		const state = stage?.parts[partId];
		if (!stage || !state || state.isValid) return;
		const result = this.grade(task, state.input, stageId);
		state.result = result;
		if (result.status !== "correct") {
			if (result.status === "incorrect")
				this.setMisconception(
					state,
					this.diagnose(task, result.message),
				);
			else this.setValidation(state, result.message);
			return;
		}
		// A final distribution must match globally as well as field by field.
		if (
			(stageId === "base" || stageId === "final") &&
			this.problem.signalType === "cos" &&
			stage.cursor === this.activeStage.parts.length - 1
		) {
			const target =
				stageId === "base" ? this.lesson.baseProblem : this.problem;
			const full = validateCtftImpulseRows(
				[
					stage.parts["location-0"]!.input,
					stage.parts["location-1"]!.input,
				],
				[
					stage.parts["weight-0"]!.input,
					stage.parts["weight-1"]!.input,
				],
				target,
			);
			if (full.status !== "correct") {
				state.result = full;
				if (full.status === "incorrect")
					this.setIncorrect(state, full.message);
				else this.setValidation(state, full.message);
				return;
			}
		}
		this.setPassed(state);
		stage.cursor++;
		this.hintTier = 0;
		if (stage.cursor === this.activeStage.parts.length) {
			stage.isValid = true;
			this.advanceToStep(this.currentStep + 1);
		}
	}

	/**
	 * Verifies a task using authoritative parameters and owned choice identifiers.
	 * @param task - Current lesson task.
	 * @param input - Student response.
	 * @param stageId - Base versus final-spectrum context.
	 * @returns Strict mathematical result.
	 */
	private grade(
		task: CtftLessonPart,
		input: string,
		stageId: CtftStageId,
	): TransformValidationResult {
		if (task.kind === "choice") {
			if (
				!task.choices?.some(
					/** @param option - Owned lesson choice. @returns Whether the token belongs to this task. */
					(option) => option.id === input,
				)
			)
				return {
					status: "invalid",
					message: "Select one of the options for this question.",
				};
			return {
				status: input === task.expected ? "correct" : "incorrect",
				message:
					"Check the signal family, forward kernel, or property.",
			};
		}
		if (task.kind === "constant")
			return validateCtftConstant(input, task.expected, true);
		if (task.kind === "phase")
			return validateCtftPhase(input, this.problem);
		if (task.kind === "spectrum")
			return validateCtftAnswer(
				input,
				stageId === "base" ? this.lesson.baseProblem : this.problem,
			);
		const stage = this.stages[stageId]!;
		const row = Number(task.id.split("-")[1]);
		if (task.kind === "location") {
			const candidates = [
				-this.problem.params.w0,
				this.problem.params.w0,
			];
			for (const candidate of candidates) {
				const result = validateCtftConstant(
					input,
					String(candidate),
					true,
				);
				if (
					result.status === "invalid" ||
					result.status === "unsupported"
				)
					return result;
				if (result.status !== "correct") continue;
				if (
					row === 1 &&
					validateCtftConstant(
						stage.parts["location-0"]!.input,
						String(candidate),
						true,
					).status === "correct"
				)
					return {
						status: "incorrect",
						message:
							"The second impulse must occupy the other carrier location.",
					};
				return result;
			}
			return {
				status: "incorrect",
				message:
					"Place the two impulses at opposite carrier frequencies.",
			};
		}
		const locationInput = stage.parts[`location-${row}`]!.input;
		// Construct the target from the verified carrier coordinate, never student syntax.
		const location =
			validateCtftConstant(
				locationInput,
				String(this.problem.params.w0),
				true,
			).status === "correct"
				? this.problem.params.w0
				: -this.problem.params.w0;
		const shift = stageId === "base" ? 0 : this.problem.params.t0;
		return validateCtftConstant(
			input,
			`\\pi e^{-j(${location})(${shift})}`,
		);
	}

	/**
	 * Adds task-specific remediation without treating unsupported answers as wrong.
	 * @param task - Failed learning task.
	 * @param fallback - Detailed mathematical feedback.
	 * @returns Accessible misconception guidance.
	 */
	private diagnose(task: CtftLessonPart, fallback: string): string {
		if (task.kind === "phase")
			return String.raw`Check the phase sign: a delay uses $e^{-j\omega t_0}$, applied to the entire spectrum.`;
		if (task.kind === "location")
			return `${fallback} Do not translate carrier locations for a time shift.`;
		if (task.kind === "weight")
			return String.raw`Keep the factor $\pi$ and evaluate the phase separately at each impulse's verified location.`;
		if (task.kind === "spectrum" && this.problem.signalType === "rect")
			return String.raw`Check the pulse amplitude factor $T$ and normalized sinc argument $T\omega/(2\pi)$, then the sign of any shift phase.`;
		if (task.kind === "spectrum" && this.problem.signalType === "gaussian")
			return String.raw`Keep the amplitude $\sqrt{\pi/a}$, exponent $-\omega^2/(4a)$, and any time-shift phase.`;
		return `${fallback} ${task.hints[0]}`;
	}

	/**
	 * Prevents navigation helpers from bypassing verification or repeating completion.
	 * @param nextStep - Requested sequential destination.
	 */
	override advanceToStep(nextStep: number): void {
		if (this.isCompleted || nextStep !== this.currentStep + 1) return;
		for (const stage of this.lesson.stages.slice(0, this.currentStep)) {
			const state = this.stages[stage.id];
			if (
				!state?.isValid ||
				stage.parts.some(
					/** @param task - Required task. @returns Whether its verification is missing. */
					(task) => !state.parts[task.id]?.isValid,
				)
			)
				return;
		}
		super.advanceToStep(nextStep);
	}

	/** Clears every response and derived completion flag for the same problem. */
	reset(): void {
		this.currentStep = 1;
		this.isCompleted = false;
		this.hintTier = 0;
		this.stages = {};
		for (const stage of this.lesson.stages) {
			const parts: Record<string, CtftPartState> = {};
			for (const task of stage.parts)
				parts[task.id] = createStepState({ input: "", result: null });
			this.stages[stage.id] = createStepState({ cursor: 0, parts });
		}
		this.revision++;
	}

	/**
	 * Supplies correct development input through the same real grading path.
	 * @param stepIndex - Optional current displayed step number.
	 */
	override devAutoFillStep(stepIndex = this.currentStep): void {
		if (!import.meta.env.DEV || stepIndex !== this.currentStep) return;
		let remaining = 20;
		while (
			this.currentStep === stepIndex &&
			!this.isCompleted &&
			remaining-- > 0
		) {
			const stage = this.activeStage;
			const task = this.activePart;
			const state = this.currentStepState;
			if (!stage || !task || !state) return;
			state.input = task.expected;
			if (task.kind === "weight") {
				const location =
					this.stages[stage.id]!.parts[
						task.id.replace("weight", "location")
					]!.input;
				state.input = `\\pi e^{-j(${location})(${stage.id === "base" ? 0 : this.problem.params.t0})}`;
			}
			const before = this.partProgress.current;
			this.check(stage.id, task.id);
			if (
				this.currentStep === stepIndex &&
				this.partProgress.current === before
			)
				return;
		}
	}

	/** Completes development captures without the base helper's forced advancement. */
	override devSolveAll(): void {
		if (!import.meta.env.DEV) return;
		for (
			let count = 0;
			count < this.totalSteps && !this.isCompleted;
			count++
		) {
			const before = this.currentStep;
			this.devAutoFillStep();
			if (before === this.currentStep) return;
		}
	}

	/** @returns Named interactive, hint, and diagnostic states for every task. */
	override devGetVisualStates(): SolverVisualStateDescriptor[] {
		const states: SolverVisualStateDescriptor[] = [];
		for (const [index, stage] of this.lesson.stages.entries())
			for (const task of stage.parts)
				for (const kind of [
					"interactive",
					"hint",
					"diagnostic",
				] as const)
					states.push({
						id: `${this.lesson.mode}:${stage.id}:${task.id}:${kind}`,
						label: `${stage.title}: ${task.label} (${kind})`,
						step: index + 1,
						subStep: task.id,
						kind,
					});
		return states;
	}

	/**
	 * Reaches a named capture state by validating all preceding tasks.
	 * @param stateId - Owned visual-state identifier.
	 * @returns Whether the state could be reached without bypassing grading.
	 */
	override devGoToVisualState(stateId: string): boolean {
		if (!import.meta.env.DEV) return false;
		const descriptor = this.devGetVisualStates().find(
			/** @param candidate - Owned capture descriptor. @returns Identifier equality. */
			(candidate) => candidate.id === stateId,
		);
		if (!descriptor) return false;
		this.reset();
		while (this.currentStep < descriptor.step) {
			const before = this.currentStep;
			this.devAutoFillStep();
			if (this.currentStep === before) return false;
		}
		while (this.activePart?.id !== descriptor.subStep) {
			const task = this.activePart;
			const stage = this.activeStage;
			const state = this.currentStepState;
			if (!task || !stage || !state) return false;
			state.input =
				task.kind === "weight"
					? `\\pi e^{-j(${this.stages[stage.id]!.parts[task.id.replace("weight", "location")]!.input})(${stage.id === "base" ? 0 : this.problem.params.t0})}`
					: task.expected;
			this.check(stage.id, task.id);
			if (!state.isValid) return false;
		}
		if (descriptor.kind === "hint") this.devRevealAllHints();
		if (descriptor.kind === "diagnostic") this.devSimulateMisconception();
		return true;
	}
}
