<script lang="ts">
	/** Isolated problem-and-mode attempt, remounted by its public keyed wrapper. */
	import { onDestroy, tick, untrack } from "svelte";
	import CtftSpectrum from "$lib/components/canvas/CtftSpectrum.svelte";
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import CompletionBanner from "$lib/components/ui/CompletionBanner.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type {
		CtftLessonPart,
		CtftPracticeMode,
		CtftStageId,
	} from "$lib/math-engine/ctft-lesson";
	import { normalizeMathLatex } from "$lib/math-engine/evaluator";
	import type { GeneratedCtftProblem } from "$lib/math-engine/fourier-transform";
	import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";
	import {
		type CtftPartState,
		CtftStepSolverState,
	} from "./ctft-step-solver.svelte";

	/** Inputs fixed for the lifetime of this keyed session. */
	interface Props {
		/** Authoritative signal. */ problem: GeneratedCtftProblem;
		/** Teaching path. */ mode: CtftPracticeMode;
		/** Optional completion notification. */ onComplete?:
			(() => void) | undefined;
	}
	let { problem, mode, onComplete }: Props = $props();
	const solver = untrack(
		/** Creates one attempt while retaining the latest completion callback. */
		() =>
			new CtftStepSolverState(
				problem,
				mode,
				/** Notifies the current parent without capturing its original callback value. */
				() => onComplete?.(),
			),
	);
	let root: HTMLDivElement | undefined = $state();
	let previousKey = "";
	const progressKey = $derived(
		`${solver.revision}:${solver.currentStep}:${solver.activePart?.id ?? "complete"}`,
	);
	$effect(
		/** Synchronizes keyboard focus with verified progress in this attempt. */ () => {
			const key = progressKey;
			const shouldFocus = previousKey !== "" && key !== previousKey;
			previousKey = key;
			if (!shouldFocus) return;
			let cancelled = false;
			void tick().then(
				/** Focuses the active instructions after verification without stealing initial focus. */
				() => {
					if (cancelled) return;
					const heading = root?.querySelector<HTMLElement>(
						".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading], .completion-heading",
					);
					heading?.focus({ preventScroll: true });
					if (
						heading &&
						(heading.getBoundingClientRect().top < 0 ||
							heading.getBoundingClientRect().bottom >
								window.innerHeight)
					)
						heading.scrollIntoView({
							block: "nearest",
							behavior: window.matchMedia(
								"(prefers-reduced-motion: reduce)",
							).matches
								? "auto"
								: "smooth",
						});
				},
			);
			return /** Cancels focus work after resets or component destruction. */ () => {
				cancelled = true;
			};
		},
	);
	onDestroy(
		/** Unregisters only this session's development interface. */ () => {
			if (
				import.meta.env.DEV &&
				typeof window !== "undefined" &&
				window.__signalLabDev?.activeSolver === solver
			)
				delete window.__signalLabDev;
		},
	);
	/** @param state - Editable response. Clears feedback when its input changes. */
	function edit(state: CtftPartState): void {
		state.result = null;
		state.feedback = null;
		state.feedbackType = null;
	}
	/** @param event - Form submission. @param stage - Captured stage. @param task - Captured task. Checks owned work. */
	function submit(
		event: SubmitEvent,
		stage: CtftStageId,
		task: string,
	): void {
		event.preventDefault();
		solver.check(stage, task);
	}
	/** @param task - Owned task. @param state - Verified response. @returns Selected label or typed expression. */
	function summary(task: CtftLessonPart, state: CtftPartState): string {
		return task.kind === "choice"
			? (task.choices?.find(
					/** @param choice - Owned choice. @returns Selection equality. */
					(choice) => choice.id === state.input,
				)?.label ?? "")
			: displayInput(state.input);
	}
	/**
	 * Formats supported shorthand for presentation without rewriting grading input.
	 * @param input - Original student answer.
	 * @returns Display LaTeX, retaining malformed input for visible syntax feedback.
	 */
	function displayInput(input: string): string {
		try {
			return normalizeMathLatex(
				normalizeTransformNotation(input, "omega"),
				false,
			).replace(/\\operatorname\{DiracDelta\}/g, "\\delta");
		} catch {
			return input;
		}
	}
</script>

<div
	class="ctft-step-solver"
	bind:this={root}
	data-mode={mode}
>
	<p
		class="sr-only"
		role="status"
		aria-live="polite"
		aria-atomic="true"
	>
		{solver.isCompleted
			? mode === "derivation"
				? "CTFT derivation completed."
				: "CTFT pairs and properties practice completed."
			: `Step ${solver.currentStep} of ${solver.totalSteps}. ${solver.partProgress.label}`}
	</p>
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>
	{#if mode === "pairs-properties" && solver.stages.pair?.isValid}
		<div class="standard-pair">
			<h3>Selected standard transform pair</h3>
			<MathBlock
				math={solver.lesson.standardPair}
				compact
				hideHeader
			/>
		</div>
	{/if}
	{#each solver.lesson.stages as stage, index (stage.id)}
		{@const stageState = solver.stages[stage.id]!}
		{@const status = stageState.isValid
			? "completed"
			: solver.currentStep === index + 1
				? "active"
				: "locked"}
		{#snippet headerExtra()}{#if status === "active" && stage.parts.length > 1}<PartProgressPill
					progress={solver.partProgress}
				/>{/if}{/snippet}
		{#snippet verifiedSummary()}<div class="verified-fields">
				{#each stage.parts as task}
					<p>
						<MathText text={`${task.labelMath ?? task.label}:`} />
					</p>
					{#if task.kind === "choice" && !task.mathChoices}<p>
							{summary(task, stageState.parts[task.id]!)}
						</p>{:else}<MathBlock
							math={summary(task, stageState.parts[task.id]!)}
							compact
							hideHeader
						/>{/if}
				{/each}
			</div>{/snippet}
		<StepCard
			stepNumber={index + 1}
			title={stage.title}
			{status}
			{headerExtra}
			summarySnippet={verifiedSummary}
		>
			{#if stage.id === "setup" && problem.signalType === "gaussian"}
				<p>
					<MathText
						text={String.raw`Use the Gaussian identity with $b=-j\omega$:`}
					/>
				</p>
				<MathBlock
					math={String.raw`\int_{-\infty}^{\infty}e^{-at^2+bt}\,dt=\sqrt{\pi/a}e^{b^2/(4a)},\quad a>0`}
					compact
					hideHeader
				/>
			{/if}
			{#if stage.id === "property" || stage.id === "final"}<p>
					Verified base spectrum:
				</p>
				<MathBlock
					math={solver.lesson.baseProblem.referenceAnswerLatex}
					compact
					hideHeader
				/>{/if}
			{#each stage.parts.slice(0, stageState.cursor + 1) as task, partIndex (task.id)}
				{@const state = stageState.parts[task.id]!}
				<SubStepBlock
					badge={`Part ${partIndex + 1}`}
					title={task.labelMath ?? task.label}
					isCompleted={state.isValid}
				>
					{#snippet summarySnippet()}{#if task.kind === "choice" && !task.mathChoices}<p
								class="verified-answer"
							>
								Verified: {summary(task, state)}
							</p>{:else}<MathBlock
								math={summary(task, state)}
								compact
								hideHeader
							/>{/if}{/snippet}
					<form
						onsubmit={/** @param event - Native submission captured for this task. */ (
							event,
						) => submit(event, stage.id, task.id)}
					>
						{#if task.contextLatex}<MathBlock
								math={task.contextLatex}
								compact
								hideHeader
							/>{/if}
						{#if task.kind === "choice"}
							<fieldset>
								<legend
									><MathText
										text={task.labelMath ?? task.label}
									/></legend
								>{#each task.choices ?? [] as choice}
									<label class="choice"
										><input
											type="radio"
											name={`ctft-${stage.id}-${task.id}`}
											value={choice.id}
											aria-label={choice.accessibleLabel ??
												choice.label}
											bind:group={state.input}
											onchange={/** Invalidates feedback after selecting a different option. */ () =>
												edit(state)}
										/>
										{#if task.mathChoices}<span
												class="choice-math"
												aria-hidden="true"
												><MathText
													text={`$${choice.label}$`}
												/></span
											>{:else}<span>{choice.label}</span
											>{/if}
									</label>
								{/each}
							</fieldset>
						{:else}
							<label
								class="answer-label"
								for={stage.id === "final" &&
								task.kind === "spectrum"
									? "ctft-input"
									: `ctft-${stage.id}-${task.id}`}
								><MathText
									text={task.labelMath ?? task.label}
								/></label
							>
							<input
								id={stage.id === "final" &&
								task.kind === "spectrum"
									? "ctft-input"
									: `ctft-${stage.id}-${task.id}`}
								class="math-text-input"
								aria-label={task.label}
								type="text"
								autocomplete="off"
								spellcheck="false"
								maxlength="16384"
								bind:value={state.input}
								oninput={/** Invalidates feedback after editing the active answer. */ () =>
									edit(state)}
								aria-describedby="ctft-notation"
							/>
							{#if state.input.trim()}<div class="answer-preview">
									<span>Your input:</span><MathBlock
										math={displayInput(state.input)}
										compact
										hideHeader
									/>
								</div>{/if}
						{/if}
						<button
							class="btn btn-primary"
							type="submit">Check Answer</button
						>
					</form>
				</SubStepBlock>
			{/each}
			<div
				class="feedback-box"
				data-validation={solver.currentStepState?.result?.status}
			>
				<StepFeedback {solver} />
			</div>
			<HintDisclosure
				hints={solver.activeHints}
				hintTier={solver.hintTier}
				onRevealNextHint={/** Reveals the next hint for this task. */ () =>
					solver.revealNextHint()}
			/>
		</StepCard>
	{/each}
	{#if solver.isCompleted}
		<section class="completion-section">
			<h3
				class="completion-heading"
				tabindex="-1"
			>
				CTFT solution verified
			</h3>
			<CompletionBanner
				title="Transform Completed!"
				description={mode === "derivation"
					? "You verified the derivation, property application, and final spectrum."
					: "You verified the transform pair, parameter substitution, and property application."}
			/>
			<MathBlock
				math={solver.lesson.finalLatex}
				responsive
			/>
			<details class="solution-breakdown">
				<summary>View Complete Worked Solution</summary>
				{#each solver.lesson.stages as stage}<section>
						<h4>{stage.title}</h4>
						{#if stage.derivationLatex}<MathBlock
								math={stage.derivationLatex}
								responsive
							/>{/if}
						{#each stage.parts as task}{@const state =
								solver.stages[stage.id]!.parts[task.id]!}
							<p>
								<MathText text={task.labelMath ?? task.label} />
							</p>
							{#if task.kind === "choice" && !task.mathChoices}<p>
									{summary(task, state)}
								</p>{:else}<MathBlock
									math={summary(task, state)}
									compact
									hideHeader
								/>{/if}
						{/each}
					</section>{/each}
			</details>
			<CtftSpectrum {problem} />
		</section>
	{/if}
	<button
		class="btn btn-secondary"
		type="button"
		onclick={/** Starts a fresh attempt on the same parameters. */ () =>
			solver.reset()}>Restart Problem</button
	>
</div>

<style>
	/* ═══════════════════════════════════════════════════════════════════════
	   Layout and answer controls
	   ═══════════════════════════════════════════════════════════════════════ */
	.ctft-step-solver,
	form,
	.verified-fields,
	.completion-section {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}
	fieldset {
		border: 0;
		padding: 0;
		min-width: 0;
		display: grid;
		gap: 0.6rem;
	}
	legend {
		margin-bottom: 0.5rem;
	}
	.choice {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.65rem;
		min-width: 0;
		cursor: pointer;
	}
	.choice-math {
		min-width: 0;
		flex: 1;
		overflow-x: auto;
		padding-block: 0.3rem;
	}
	input[type="radio"] {
		flex-shrink: 0;
	}
	input[type="text"] {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}
	/* ═══════════════════════════════════════════════════════════════════════
	   Verified work and completed solution
	   ═══════════════════════════════════════════════════════════════════════ */
	.verified-fields p,
	.verified-answer {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.answer-preview,
	.standard-pair,
	.solution-breakdown {
		min-width: 0;
	}
	.solution-breakdown section {
		margin-top: 1rem;
	}
	.btn {
		align-self: flex-start;
	}
	summary {
		cursor: pointer;
		font-weight: 700;
	}
	/* ═══════════════════════════════════════════════════════════════════════
	   Keyboard focus and screen reader announcements
	   ═══════════════════════════════════════════════════════════════════════ */
	:global(.ctft-step-solver :focus-visible) {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	/* ═══════════════════════════════════════════════════════════════════════
	   Media: reduced motion
	   ═══════════════════════════════════════════════════════════════════════ */
	@media (prefers-reduced-motion: reduce) {
		.ctft-step-solver :global(*) {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
