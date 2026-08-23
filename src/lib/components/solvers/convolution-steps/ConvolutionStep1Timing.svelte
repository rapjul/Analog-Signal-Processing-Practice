<script lang="ts">
	/** Multipart typed timing step for x, h, and the convolution output. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution";

	interface Props {
		/** Active exact convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 1
			? "active"
			: solver.currentStep > 1
				? "completed"
				: "locked",
	);
	const activeIndex = $derived(
		problem.itsData.step1.parts.findIndex(
			({ id }) => id === solver.step1.activeSubStepId,
		),
	);
	const activePart = $derived(problem.itsData.step1.parts[activeIndex]);
	const activeState = $derived(
		solver.step1.subSteps[solver.step1.activeSubStepId],
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step1Progress} />
	{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-list">
		{#each problem.itsData.step1.parts as part}
			<MathBlock
				math={part.resultLatex}
				compact={true}
				hideHeader={true}
				responsive={true}
			/>
		{/each}
	</div>
{/snippet}

<StepCard
	stepNumber={1}
	title="Find Signal Start Times, End Times, and Widths"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p class="support-intro">{problem.itsData.step1.intro}</p>
		{#each problem.itsData.step1.parts.slice(0, activeIndex) as part, index}
			<SubStepBlock
				badge={`Part 1${String.fromCharCode(65 + index)}`}
				title={part.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}
					<MathBlock
						math={part.resultLatex}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>
				{/snippet}
			</SubStepBlock>
		{/each}

		{#if activePart && activeState}
			<SubStepBlock
				badge={`Part 1${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
				title={activePart.title}
			>
				<p class="part-prompt">
					<MathText
						text={`Enter the first nonzero time, last nonzero time, and overall width for $${activePart.signalLatex}$.`}
					/>
				</p>
				<div class="timing-grid">
					<label>
						<span>Start time</span>
						<input
							type="text"
							bind:value={activeState.start}
							placeholder="e.g. -2 or 0"
							onkeydown={(event) =>
								event.key === "Enter" && solver.checkStep1()}
						/>
					</label>
					<label>
						<span>End time</span>
						<input
							type="text"
							bind:value={activeState.end}
							placeholder="e.g. 3 or infinity"
							onkeydown={(event) =>
								event.key === "Enter" && solver.checkStep1()}
						/>
					</label>
					<label>
						<span>Overall width</span>
						<input
							type="text"
							bind:value={activeState.width}
							placeholder="end - start"
							onkeydown={(event) =>
								event.key === "Enter" && solver.checkStep1()}
						/>
					</label>
				</div>
				<button
					type="button"
					class="check-button"
					onclick={() => solver.checkStep1()}
					>Check timing and width</button
				>
			</SubStepBlock>
		{/if}
		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step layout ───────────────────────────────────────── */
	.step-body,
	.summary-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}
	.support-intro {
		margin: 0;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
	}
	.part-prompt {
		margin: 0;
		color: var(--text-primary);
	}
	.timing-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.timing-grid label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.timing-grid input {
		min-width: 0;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font: inherit;
	}
	.timing-grid input:focus-visible,
	.check-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
	.check-button {
		align-self: flex-start;
		padding: 0.55rem 0.9rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--accent-primary);
		color: var(--black-100);
		font-weight: 700;
		cursor: pointer;
	}

	/* ── Mobile media query (≤640px) ──────────────────────── */
	@media (max-width: 640px) {
		.timing-grid {
			grid-template-columns: 1fr;
		}
		.check-button {
			width: 100%;
		}
	}
</style>
