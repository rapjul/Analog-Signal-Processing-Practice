<script lang="ts">
	/**
	 * OdeStep7PartCConceptual Svelte 5 Component.
	 *
	 * Step 7 Part 7C: Targeted Conceptual Mastery Check.
	 *
	 * Evaluates deep understanding of system response decomposition principles.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	/**
	 * Component properties for OdeStep7PartCConceptual.
	 */
	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();
</script>

<SubStepBlock
	badge="Part 7C"
	title="Targeted Conceptual Mastery Check"
	isCompleted={false}
>
	<p class="step-prompt">
		<MathText text={problem.itsData.step7.conceptQuestion.prompt} />
	</p>

	<div class="concept-options-list">
		{#each problem.itsData.step7.conceptQuestion.options as option}
			<button
				type="button"
				class="concept-option-card"
				class:selected={solver.step7.selectedConcept === option.id}
				onclick={() => {
					solver.step7.selectedConcept = option.id;
					solver.checkStep7Concept(option);
				}}
			>
				<span class="option-radio-indicator">
					{solver.step7.selectedConcept === option.id ? "●" : "○"}
				</span>
				<div class="option-math-content">
					<MathText text={`$${option.latex}$`} />
				</div>
			</button>
		{/each}
	</div>
</SubStepBlock>

<style>
	/* ── Step prompt ────────────────────────────────────────── */

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Conceptual Mastery Options ────────────────────────── */

	.concept-options-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.concept-option-card {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.9rem 1.2rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
		color: var(--text-primary);
		font-size: var(--text-base, 1rem);
		width: 100%;
		font-family: inherit;
		box-sizing: border-box;
	}

	.concept-option-card:hover {
		border-color: var(--accent-primary);
		background: var(--bg-card-hover);
	}

	.concept-option-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.concept-option-card.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	.option-radio-indicator {
		font-size: 1.25rem;
		color: var(--accent-primary);
		flex-shrink: 0;
	}

	.option-math-content {
		flex: 1;
		font-size: 1.05rem;
		line-height: 1.5;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.option-math-content::-webkit-scrollbar {
		display: none;
	}
</style>
