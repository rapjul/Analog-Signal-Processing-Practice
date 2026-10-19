<script lang="ts">
	/**
	 * OdeStep4Ansatz Svelte 5 Component.
	 *
	 * Step 4: Particular Solution Ansatz Form Selection.
	 *
	 * Prompts the student to choose the correct trial particular solution $y_p(t)$
	 * based on the input forcing function $x(t)$ and resonance detection.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
</script>

<StepCard
	stepNumber={4}
	title="Particular Solution Ansatz Form"
	{status}
	summaryLatex={`Particular Ansatz: $${solver.correctAnsatz}$`}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={`Given forcing input $x(t) = ${problem.forcing.latex}$, select the trial particular solution $y_p(t)$:`}
			/>
		</p>
		<div class="mcq-cards-grid">
			{#each problem.itsData.step4.options as opt}
				<button
					type="button"
					class="mcq-card"
					data-option-id={opt.id}
					class:selected={solver.step4.selected === opt.id}
					onclick={() => solver.checkStep4(opt)}
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
	/* ── Step body ────────────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Multiple choice math cards ───────────────────────── */

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.mcq-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 55px;
		font-family: inherit;
		box-sizing: border-box;
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

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
