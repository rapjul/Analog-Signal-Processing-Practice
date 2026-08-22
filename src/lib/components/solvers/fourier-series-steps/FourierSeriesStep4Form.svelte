<script lang="ts">
	/**
	 * FourierStep4Form Svelte 5 Component.
	 *
	 * Step 4: Optimal Representation Form Selection.
	 *
	 * Prompts students to choose between Trigonometric, Exponential, or Compact Harmonic
	 *
	 * Fourier representations based on waveform symmetry and computational efficiency.
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
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
</script>

{#snippet summarySnippet()}
	<span>
		Optimal Form:
		<strong>
			{#if problem.coeffs.originParity !== "none"}
				Trigonometric Form
			{:else}
				Exponential Form
			{/if}
		</strong>
	</span>
{/snippet}

<StepCard
	stepNumber={4}
	title="Optimal Representation Form"
	{status}
	{summarySnippet}
>
	<div class="step-body">
		<p class="step-prompt">
			Which Fourier series representation is most efficient to calculate
			for this waveform?
		</p>
		<div class="button-grid-taxonomic">
			<button
				type="button"
				class="choice-btn representation-choice"
				class:selected={solver.step4.selected === "trig"}
				onclick={() => solver.checkStep4("trig")}
			>
				<strong>Trigonometric Form</strong>
				<div class="choice-sub representation-content">
					<MathText
						text={"Ideal when symmetries eliminate $a_n$ or $b_n$"}
					/>
					<MathBlock
						math={"a_n \\cos(n \\omega_0 t) + b_n \\sin(n \\omega_0 t)"}
						compact={true}
						hideHeader={true}
					/>
				</div>
			</button>
			<button
				type="button"
				class="choice-btn representation-choice"
				class:selected={solver.step4.selected === "exp"}
				onclick={() => solver.checkStep4("exp")}
			>
				<strong>Exponential Form</strong>
				<div class="choice-sub representation-content">
					<MathText text={"Single integral for $F_n$"} />
					<MathBlock
						math={"F_n e^{j n \\omega_0 t}"}
						compact={true}
						hideHeader={true}
					/>
				</div>
			</button>
			<button
				type="button"
				class="choice-btn representation-choice"
				class:selected={solver.step4.selected === "compact"}
				onclick={() => solver.checkStep4("compact")}
			>
				<strong>Compact Harmonic Form</strong>
				<div class="choice-sub representation-content">
					<span>Amplitude-Phase</span>
					<MathBlock
						math={"c_n \\cos(n \\omega_0 t + \\theta_n)"}
						compact={true}
						hideHeader={true}
					/>
				</div>
			</button>
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

	/* ── Multiple choice representation grid ───────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.choice-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		cursor: pointer;
		color: var(--text-primary);
		text-align: left;
		transition: all 0.15s ease;
		max-width: 100%;
		font-family: inherit;
	}

	.choice-btn:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.choice-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.choice-btn.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	.choice-sub {
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.representation-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		width: 100%;
		text-align: left;
	}

	.representation-content :global(.math-block) {
		width: 100%;
		margin: 0;
		background: transparent;
		border: none;
	}

	.representation-content :global(.katex-display),
	.representation-content :global(.katex-display > .katex) {
		text-align: left;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.button-grid-taxonomic {
			grid-template-columns: 1fr;
		}
	}
</style>
