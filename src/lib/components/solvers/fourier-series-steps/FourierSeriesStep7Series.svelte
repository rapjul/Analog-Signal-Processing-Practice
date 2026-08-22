<script lang="ts">
	/**
	 * FourierStep7Series Svelte 5 Component.
	 *
	 * Step 7: Final Fourier Series Synthesis Expression.
	 *
	 * Prompts students to identify the complete synthesized Fourier series
	 * with correct normalization, harmonics, signs, and DC offset.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";
	import type { FourierSeriesStepSolverState } from "../fourier-series-step-solver.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Active reactive Fourier solver controller */
		solver: FourierSeriesStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 7
			? "active"
			: solver.currentStep > 7
				? "completed"
				: "locked",
	);
</script>

<StepCard
	stepNumber={7}
	title="Final Fourier Series Expression"
	{status}
	summaryLatex={"\\text{Fourier Series Synthesized}"}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={`Select the final ${problem.itsData.step7.form === "trig" ? "trigonometric" : "exponential"} Fourier series for $x(t)$:`}
			/>
		</p>
		<div class="mcq-cards-grid">
			{#each problem.itsData.step7.options as opt}
				<button
					type="button"
					class="mcq-card"
					class:selected={solver.step7.selected === opt.id}
					onclick={() => solver.checkStep7(opt)}
				>
					<MathBlock
						math={opt.latex}
						compact={true}
						hideHeader={true}
					/>
				</button>
			{/each}
		</div>

		<!-- Feedback & Progressive Hints -->
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

	/* ── Multiple choice math cards ────────────────────────── */

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		width: 100%;
	}

	.mcq-card {
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
		font-family: inherit;
		box-sizing: border-box;
	}

	.mcq-card :global(.math-block) {
		margin: 0;
		background: transparent;
		border: none;
		box-shadow: none;
		width: 100%;
	}

	.mcq-card :global(.math-block-content) {
		padding: 0.25rem 0.5rem;
	}

	.mcq-card:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.mcq-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.mcq-card.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	/* ── Mobile media query (≤640px) ─────────────────────── */

	@media (max-width: 640px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
