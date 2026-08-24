<script lang="ts">
	/**
	 * Shared single-choice step renderer for the convolution ITS solver.
	 *
	 * Used for definition, transformation, transition, and final assembly steps
	 * so their behavior and responsive interaction styling stay consistent.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionChoiceStepState } from "$lib/components/solvers/convolution-solver-state/convolution-step-types";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type {
		ConvolutionItsChoiceStep,
		ConvolutionItsOption,
	} from "$lib/math-engine/convolution";

	interface Props {
		/** Parent step number. */
		stepNumber: number;
		/** Student-facing step title. */
		title: string;
		/** Exact tutoring choices and progressive hints. */
		data: ConvolutionItsChoiceStep;
		/** Reactive selection state for this step. */
		state: ConvolutionChoiceStepState;
		/** Active convolution solver controller. */
		solver: ConvolutionStepSolverState;
		/** Validation callback for a selected option. */
		onCheck: (option: ConvolutionItsOption | null) => void;
		/** Exact result displayed after the step is completed. */
		summaryLatex: string;
		/** Whether option cards should remain in a single column. */
		singleColumn?: boolean;
	}

	let {
		stepNumber,
		title,
		data,
		state,
		solver,
		onCheck,
		summaryLatex,
		singleColumn = false,
	}: Props = $props();

	/** Visual status derived from the active solver step. */
	const status = $derived(
		solver.currentStep === stepNumber
			? "active"
			: solver.currentStep > stepNumber
				? "completed"
				: "locked",
	);

	/**
	 * Stores and validates one selected response.
	 *
	 * @param option - Selected mathematical response.
	 */
	function handleSelection(option: ConvolutionItsOption): void {
		onCheck(option);
	}
</script>

<StepCard
	{stepNumber}
	{title}
	{status}
	{summaryLatex}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText text={data.prompt} />
		</p>
		<div
			class="option-grid"
			class:single-column={singleColumn}
			data-testid={`convolution-step${stepNumber}-options`}
		>
			{#each data.options as option}
				<button
					type="button"
					class="option-card"
					class:selected={state.selected === option.id}
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

	/* ── Mathematical choice cards ─────────────────────────── */

	.option-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.option-grid.single-column {
		grid-template-columns: 1fr;
	}

	.option-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
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
		min-width: 0;
	}

	.option-card :global(.math-block-content) {
		padding: 0.25rem;
	}

	.option-card:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.option-card:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
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
