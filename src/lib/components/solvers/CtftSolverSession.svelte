<script lang="ts">
	/** One keyed problem-and-mode attempt, with solver-independent workspace layout. */
	import { onDestroy, tick, untrack } from "svelte";
	import CtftSpectrum from "$lib/components/canvas/CtftSpectrum.svelte";
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import CompletionBanner from "$lib/components/ui/CompletionBanner.svelte";
	import GuidedSolverWorkspace from "$lib/components/ui/GuidedSolverWorkspace.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type {
		CtftLessonPart,
		CtftPracticeMode,
	} from "$lib/math-engine/ctft-lesson";
	import { summarizeCtftInput } from "$lib/math-engine/ctft-presentation";
	import type { GeneratedCtftProblem } from "$lib/math-engine/fourier-transform";
	import CtftExercise from "./CtftExercise.svelte";
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
		/** Creates one attempt using the latest callback. */ () =>
			new CtftStepSolverState(
				problem,
				mode,
				/** Notifies the current parent. */ () => onComplete?.(),
			),
	);
	let root: HTMLDivElement | undefined = $state();
	let previousKey = "";
	const progressKey = $derived(
		`${solver.revision}:${solver.currentStep}:${solver.activePart?.id ?? "complete"}`,
	);
	$effect(
		/** Follows verified progress without stealing initial focus. */ () => {
			const key = progressKey;
			const shouldFocus = previousKey !== "" && key !== previousKey;
			previousKey = key;
			if (!shouldFocus) return;
			let cancelled = false;
			void tick().then(
				/** Focuses the new task after the DOM updates. */ () => {
					if (cancelled) return;
					const heading = root?.querySelector<HTMLElement>(
						".step-card.active .subpart-block [data-progress-heading], .completion-heading",
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
			return /** Cancels pending focus on unmount or another progress change. */ () => {
				cancelled = true;
			};
		},
	);
	onDestroy(
		/** Unregisters only this attempt's development interface. */ () => {
			if (
				import.meta.env.DEV &&
				typeof window !== "undefined" &&
				window.__signalLabDev?.activeSolver === solver
			)
				delete window.__signalLabDev;
		},
	);
	/** @param task - Verified task. @param state - Accepted response. @returns Read-only simplified presentation. */
	function summary(task: CtftLessonPart, state: CtftPartState): string {
		return summarizeCtftInput(task, state.input);
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
		{#snippet verifiedSummary()}
			<details class="verified-fields">
				<summary
					>{stage.parts.length} verified {stage.parts.length === 1
						? "exercise"
						: "exercises"} — review work</summary
				>
				<dl>
					{#each stage.parts as task}<dt>
							<MathText text={task.labelMath ?? task.label} />
						</dt>
						<dd>
							{#if task.kind === "choice" && !task.mathChoices}{summary(
									task,
									stageState.parts[task.id]!,
								)}{:else}<MathText
									text={`$${summary(task, stageState.parts[task.id]!)}$`}
								/>{/if}
						</dd>{/each}
				</dl>
			</details>
		{/snippet}
		<StepCard
			stepNumber={index + 1}
			title={stage.title}
			{status}
			{headerExtra}
			summarySnippet={verifiedSummary}
		>
			{#if solver.activePart && status === "active"}
				{@const task = solver.activePart}
				{@const state = stageState.parts[task.id]!}
				{#snippet results()}
					<dl class="context-results">
						{#each solver.contextResults as result}<dt>
								<MathText
									text={result.task.labelMath ??
										result.task.label}
								/>
							</dt>
							<dd>
								<MathText
									text={`$${summary(result.task, result.state)}$`}
								/>
							</dd>{/each}
					</dl>
				{/snippet}
				{#snippet identities()}
					{#if mode === "pairs-properties" && solver.stages.pair?.isValid}<p
							class="standard-pair"
						>
							Selected standard transform pair
						</p>
						<MathBlock
							math={solver.lesson.standardPair}
							compact
							hideHeader
							responsive
						/>{/if}
					{#if task.identityLatex}<MathBlock
							math={task.identityLatex}
							compact
							hideHeader
							responsive
						/>{/if}
				{/snippet}
				<GuidedSolverWorkspace
					results={solver.contextResults.length ? results : undefined}
					identities={task.identityLatex ||
					(mode === "pairs-properties" && solver.stages.pair?.isValid)
						? identities
						: undefined}
				>
					{#key task.id}
						<SubStepBlock
							{...stage.parts.length > 1
								? {
										badge: `Part ${index + 1}${String.fromCharCode(65 + stageState.cursor)}`,
									}
								: {}}
							title={task.labelMath ?? task.label}
						>
							{#if problem.signalType === "cos" && (stage.id === "base" || stage.id === "final") && (task.kind === "location" || task.kind === "weight")}
								<div
									class="impulse-builder"
									aria-label="Impulse rows"
								>
									{#each [0, 1] as row}<div
											class="impulse-row"
											class:editing={task.id.endsWith(
												String(row),
											)}
										>
											<strong>Impulse {row + 1}</strong
											><span
												>Location: {#if stageState.parts[`location-${row}`]?.isValid}<MathText
														text={`$${summary(
															stage.parts.find(
																/** @param part - Row field. @returns Coordinate ownership. */
																(part) =>
																	part.id ===
																	`location-${row}`,
															)!,
															stageState.parts[
																`location-${row}`
															]!,
														)}$`}
													/>{:else}pending{/if}</span
											><span
												>Weight: {#if stageState.parts[`weight-${row}`]?.isValid}<MathText
														text={`$${summary(
															stage.parts.find(
																/** @param part - Row field. @returns Weight ownership. */
																(part) =>
																	part.id ===
																	`weight-${row}`,
															)!,
															stageState.parts[
																`weight-${row}`
															]!,
														)}$`}
													/>{:else}pending{/if}</span
											>
										</div>{/each}
								</div>
							{/if}
							<CtftExercise
								{solver}
								stageId={stage.id}
								{task}
								response={state}
							/>
						</SubStepBlock>
					{/key}
				</GuidedSolverWorkspace>
			{/if}
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
						{#each stage.parts as task}<p>
								<MathText text={task.labelMath ?? task.label} />
							</p>
							{#if task.kind === "choice" && !task.mathChoices}<p>
									{summary(
										task,
										solver.stages[stage.id]!.parts[
											task.id
										]!,
									)}
								</p>{:else}<MathBlock
									math={summary(
										task,
										solver.stages[stage.id]!.parts[
											task.id
										]!,
									)}
									compact
									hideHeader
								/>{/if}{/each}
					</section>{/each}
			</details>
			<CtftSpectrum {problem} />
		</section>
	{/if}
</div>

<style>
	/* ── Verified work, active context, and completion ───────────────────── */
	.ctft-step-solver,
	.completion-section {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}
	dl {
		margin: 0;
		min-width: 0;
	}
	dt {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin-top: 0.6rem;
	}
	dd {
		margin: 0.2rem 0 0;
		overflow-wrap: anywhere;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}
	.standard-pair {
		font-size: var(--text-sm);
		margin: 0;
	}
	.verified-fields,
	.solution-breakdown {
		min-width: 0;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	.solution-breakdown section {
		margin-top: 1rem;
	}
	.impulse-builder {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
	}
	.impulse-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.65rem;
		min-width: 0;
	}
	.impulse-row.editing {
		border-color: var(--accent-primary);
	}
	.impulse-row span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
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
	/* ── Reduced motion ─────────────────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.ctft-step-solver :global(*) {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
