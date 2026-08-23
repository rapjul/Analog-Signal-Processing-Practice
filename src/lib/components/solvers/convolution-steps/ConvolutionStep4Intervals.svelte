<script lang="ts">
	/**
	 * Step 4 multi-part interval evaluator for the convolution ITS solver.
	 *
	 * Carries verified regions forward while focusing the student on one exact
	 * overlap interval at a time, matching the Fourier Series coefficient flow.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type {
		ConvolutionItsOption,
		ConvolutionProblem,
	} from "$lib/math-engine/convolution";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Active reactive convolution solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();

	/** Visual status for Step 4. */
	const status = $derived(
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
	/** Zero-based index of the active interval part. */
	const activeIndex = $derived(
		problem.itsData.step4.parts.findIndex(
			({ id }) => id === solver.step4.activeSubStepId,
		),
	);
	/** Exact data for the active interval part. */
	const activePart = $derived(
		problem.itsData.step4.parts.find(
			({ id }) => id === solver.step4.activeSubStepId,
		),
	);

	/**
	 * Stores and validates one selected interval result.
	 *
	 * @param option - Selected interval response.
	 */
	function handleSelection(option: ConvolutionItsOption): void {
		solver.checkStep4(option);
	}
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step4Progress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={4}
	title="Evaluate Each Overlap Region"
	{status}
	{headerExtra}
	summaryLatex={String.raw`\text{All interval integrals evaluated}`}
>
	<div class="step-body">
		{#each problem.itsData.step4.parts.slice(0, activeIndex) as previousPart, index}
			<SubStepBlock
				badge={`Part 4${String.fromCharCode(65 + index)}`}
				title={previousPart.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}
					<MathBlock
						math={previousPart.resultLatex}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>
				{/snippet}
			</SubStepBlock>
		{/each}

		<SubStepBlock
			badge={`Part 4${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
			title={activePart?.title ?? "Evaluate Region"}
			isCompleted={false}
		>
			<p class="step-prompt">
				<MathText
					text={String.raw`For $${activePart?.intervalLatex ?? ""}$, evaluate the overlap integral using the active support intersection:`}
				/>
			</p>
			<MathBlock
				math={String.raw`y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau`}
				compact={true}
				responsive={true}
			/>
			<div
				class="option-grid"
				data-testid="convolution-step4-options"
			>
				{#each activePart?.options ?? [] as option}
					<button
						type="button"
						class="option-card"
						class:selected={solver.step4.subSteps[
							solver.step4.activeSubStepId
						]?.selected === option.id}
						onclick={() => handleSelection(option)}
					>
						<MathBlock
							math={option.latex}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
					</button>
				{/each}
			</div>
		</SubStepBlock>

		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step body & prompt ────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* ── Interval choice cards ─────────────────────────────── */

	.option-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.option-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		color: var(--text-primary);
		width: 100%;
		max-width: 100%;
		min-width: 0;
		font-family: inherit;
		box-sizing: border-box;
	}

	.option-card :global(.math-block) {
		margin: 0;
		background: transparent;
		border: none;
		box-shadow: none;
		width: 100%;
	}

	.option-card:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.option-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* Selected state */
	.option-card.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	/* ── Mobile media query (≤640px) ──────────────────────── */

	@media (max-width: 640px) {
		.option-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
