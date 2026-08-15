<script lang="ts">
	/**
	 * StepReveal Svelte 5 Component.
	 * Provides interactive collapsible progressive step breakdowns
	 * for zero-guesswork math solutions.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";
	import type { SolutionStep } from "$lib/math-engine/types";

	/**
	 * Backward compatibility alias for callers referencing StepItem.
	 */
	export type StepItem = SolutionStep;

	interface Props {
		/** Array of solution steps */
		steps: SolutionStep[];
	}

	let { steps }: Props = $props();
	let revealedCount = $state(1);

	/**
	 * Reveals the next step in the breakdown.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function revealNextStep() {
		if (revealedCount < steps.length) {
			revealedCount += 1;
		}
	}

	/**
	 * Reveals all steps in the breakdown.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function revealAllSteps() {
		revealedCount = steps.length;
	}
</script>

<div class="step-reveal-container">
	<div class="step-header">
		<h3 class="step-main-title">
			Solution Breakdown ({revealedCount}/{steps.length} Steps Revealed)
		</h3>
		<div class="step-controls">
			{#if revealedCount < steps.length}
				<button type="button" class="btn-step" onclick={revealNextStep}>
					Reveal Step {revealedCount + 1}
				</button>
				<button
					type="button"
					class="btn-step-secondary"
					onclick={revealAllSteps}
				>
					Reveal All
				</button>
			{/if}
		</div>
	</div>

	<div class="steps-list">
		{#each steps.slice(0, revealedCount) as step, idx}
			<div class="step-card">
				<h4 class="step-title">Step {idx + 1}: {step.title}</h4>
				{#if step.description}
					<p class="step-description">
						<MathText text={step.description} />
					</p>
				{/if}
				{#if step.latex && step.latex.trim().length > 0}
					<MathBlock
						math={step.latex}
						aligned={step.aligned}
						cases={step.cases}
						matrix={step.matrix}
						gathered={step.gathered}
						responsive={step.responsive}
						compact={true}
					/>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.step-reveal-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border-top: 1px solid var(--border-color);
		padding-top: 1rem;
	}

	.step-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.step-main-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.step-controls {
		display: flex;
		gap: 0.5rem;
	}

	.btn-step {
		background: var(--accent-primary);
		color: #ffffff;
		border: none;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-step:hover,
	.btn-step:focus-visible {
		background: var(--accent-hover);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.btn-step-secondary {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-step-secondary:hover,
	.btn-step-secondary:focus-visible {
		border-color: var(--accent-primary);
		color: var(--text-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.steps-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.step-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.step-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	.step-description {
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}
</style>
