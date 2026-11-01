<script lang="ts">
	import { onDestroy, tick, untrack } from "svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
	import LaplaceTaskInput from "$lib/components/solvers/laplace-steps/LaplaceTaskInput.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { LaplaceExercise } from "$lib/math-engine/laplace/types";

	/** Checked workflow properties. */
	interface Props {
		/** Validated exercise. */ problem: LaplaceExercise;
		/** Completion notification. */ onComplete?: () => void;
		/** Assistance notification, separate from validation. */ onAssist?:
			(() => void) | undefined;
	}
	let { problem, onComplete, onAssist }: Props = $props();
	let solver = $state(
		untrack(
			() => new LaplaceStepSolverState(problem, () => onComplete?.()),
		),
	);
	$effect(() => {
		if (solver.problem !== problem)
			solver = new LaplaceStepSolverState(problem, () => onComplete?.());
	});
	let root: HTMLDivElement | undefined;
	/** @param index - Zero-based part index. @returns Alphabetic part suffix, including stages with more than 26 tasks. */
	function partSuffix(index: number): string {
		let number = index + 1,
			suffix = "";
		while (number > 0) {
			number--;
			suffix = String.fromCharCode(65 + (number % 26)) + suffix;
			number = Math.floor(number / 26);
		}
		return suffix;
	}
	let previous = "";
	$effect(() => {
		const key = `${solver.task?.id ?? "completed"}:${solver.awaitingContinue}`;
		const focus = previous !== "" && previous !== key;
		previous = key;
		if (focus)
			void tick().then(() =>
				root
					?.querySelector<HTMLElement>(
						solver.awaitingContinue
							? "[data-success-heading]"
							: ".step-card.active [data-task-id] h3, .step-card.active .subpart-block:not(.subpart-done) [data-progress-heading], .step-card.active [data-single-heading]",
					)
					?.focus(),
			);
	});
	onDestroy(() => {
		if (
			import.meta.env.DEV &&
			typeof window !== "undefined" &&
			window.__signalLabDev?.activeSolver === solver
		)
			delete window.__signalLabDev;
	});
</script>

<div
	class="laplace-step-solver"
	bind:this={root}
>
	<p
		class="sr-only"
		role="status"
		aria-live="polite"
	>
		{solver.isCompleted
			? "Laplace derivation completed."
			: `Step ${solver.displayStep} of ${solver.visibleStages.length}. ${solver.progress.total > 1 ? solver.progress.label : ""} ${solver.task?.title ?? ""}`}
	</p>
	<Progress
		currentStep={solver.displayStep}
		totalSteps={solver.visibleStages.length}
	/>
	{#each solver.visibleStages as stage, displayIndex}
		{@const index = problem.stages.indexOf(stage)}
		{@const tasks = solver.tasksForStage(index)}
		<StepCard
			stepNumber={displayIndex + 1}
			title={stage.title}
			status={solver.currentStep > index + 1
				? "completed"
				: solver.currentStep === index + 1
					? "active"
					: "locked"}
		>
			{#snippet summarySnippet()}<div class="verified-result">
					{#each tasks as task}<p>
							<MathText text={task.title} />: <MathText
								text={task.kind === "choice"
									? (solver.verified[task.id] ?? "")
									: `$${solver.verified[task.id] ?? ""}$`}
							/>
						</p>
						{#each solver.carried[task.id] ?? [] as conclusion}<p>
								<MathText text={conclusion} />
							</p>{/each}{/each}
				</div>{/snippet}
			{#snippet headerExtra()}{#if solver.currentStep === index + 1 && tasks.length > 1}<PartProgressPill
						progress={solver.progress}
					/>{/if}{/snippet}
			{#each tasks as task, part}
				{#if solver.verified[task.id] !== undefined}
					<SubStepBlock
						badge={`Part ${displayIndex + 1}${partSuffix(part)}`}
						title={task.title}
						isCompleted
					>
						{#snippet summarySnippet()}<div class="verified-result">
								<MathText
									text={task.kind === "choice"
										? solver.verified[task.id]!
										: `$${solver.verified[task.id]}$`}
								/>
								{#each solver.carried[task.id] ?? [] as conclusion}<p
									>
										<MathText text={conclusion} />
									</p>{/each}
							</div>{/snippet}
					</SubStepBlock>
				{:else if solver.task?.id === task.id}
					{#if tasks.length === 1}
						<h3
							tabindex="-1"
							data-single-heading
						>
							{task.title}
						</h3>
						<LaplaceTaskInput
							{solver}
							{onAssist}
						/>
					{:else}
						<SubStepBlock
							badge={`Part ${displayIndex + 1}${partSuffix(part)}`}
							title={task.title}
							><LaplaceTaskInput
								{solver}
								{onAssist}
							/></SubStepBlock
						>
					{/if}
				{/if}
			{/each}
		</StepCard>
	{/each}
</div>

<style>
	/* ── Guided workflow and verified summaries ───────────────────────────── */
	.laplace-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	.verified-result {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
	}
</style>
