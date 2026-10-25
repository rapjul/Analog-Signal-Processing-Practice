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
	let previous = "";
	$effect(() => {
		const key = solver.task?.id ?? "completed";
		const focus = previous !== "" && previous !== key;
		previous = key;
		if (focus)
			void tick().then(() =>
				root
					?.querySelector<HTMLElement>(
						".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading]",
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
			: `Step ${solver.currentStep} of ${solver.totalSteps}. ${solver.progress.label}. ${solver.task?.title ?? ""}`}
	</p>
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>
	{#each problem.stages as stage, index}
		<StepCard
			stepNumber={index + 1}
			title={stage.title}
			status={solver.currentStep > index + 1
				? "completed"
				: solver.currentStep === index + 1
					? "active"
					: "locked"}
			summaryLatex={`${stage.tasks.length} verified tasks.`}
		>
			{#snippet summarySnippet()}<details class="verified-result">
					<summary
						>{stage.tasks.length} verified tasks — review your work</summary
					>{#each stage.tasks as task}<p>
							<MathText text={task.title} />: <MathText
								text={task.kind === "choice"
									? (solver.verified[task.id] ?? "")
									: `$${solver.verified[task.id] ?? ""}$`}
							/>
						</p>{/each}
				</details>{/snippet}
			{#snippet headerExtra()}{#if solver.currentStep === index + 1}<PartProgressPill
						progress={solver.progress}
					/>{/if}{/snippet}
			{#each stage.tasks as task, part}
				{#if solver.verified[task.id] !== undefined}
					<SubStepBlock
						badge={`Part ${part + 1}`}
						title={task.title}
						isCompleted
					>
						{#snippet summarySnippet()}<div class="verified-result">
								<MathText
									text={task.kind === "choice"
										? solver.verified[task.id]!
										: `$${solver.verified[task.id]}$`}
								/>
							</div>{/snippet}
					</SubStepBlock>
				{:else if solver.task?.id === task.id}
					<SubStepBlock
						badge={`Part ${part + 1}`}
						title={task.title}
						><LaplaceTaskInput
							{solver}
							{onAssist}
						/></SubStepBlock
					>
				{/if}
			{/each}
		</StepCard>
	{/each}
</div>

<style>
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
