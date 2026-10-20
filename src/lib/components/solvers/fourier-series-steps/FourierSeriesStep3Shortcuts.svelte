<script lang="ts">
	/**
	 * FourierStep3Shortcuts Svelte 5 Component.
	 *
	 * Step 3: Vanishing Coefficient Shortcuts.
	 *
	 * Prompts students to apply symmetry properties to identify vanishing coefficients
	 * ($b_n = 0$ for even, $a_0 = a_n = 0$ for odd, or all active for asymmetric waveforms).
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Active reactive Fourier solver controller */
		solver: FourierSeriesStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 3
			? "active"
			: solver.currentStep > 3
				? "completed"
				: "locked",
	);
</script>

{#snippet summarySnippet()}
	<span>
		Shortcut:
		{#if problem.coeffs.originParity === "even"}
			<MathText
				text={String.raw`$b_n = 0 \implies$ Cosine harmonics only`}
			/>
		{:else if problem.coeffs.originParity === "odd"}
			<MathText
				text={String.raw`$a_0 = 0, \; a_n = 0 \implies$ Sine harmonics only`}
			/>
		{:else}
			Neither entire family vanishes by origin parity
		{/if}
	</span>
	{#if problem.coeffs.hasHalfWaveSymmetry}
		<MathText
			text={String.raw`Half-wave symmetry also gives $a_0=0$ and zero even harmonics.`}
		/>
	{/if}
{/snippet}

<StepCard
	stepNumber={3}
	title="Vanishing Coefficient Shortcuts"
	{status}
	{summarySnippet}
>
	<div class="step-body">
		<p class="step-prompt">
			Based on the identified symmetry, which coefficients vanish:
		</p>
		<div class="button-grid-taxonomic">
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "bn_zero"}
				onclick={() => solver.checkStep3("bn_zero")}
			>
				<strong><MathText text={"$b_n = 0$"} /></strong>
				<span class="choice-sub">
					<MathText text={"Only cosine terms ($a_n$) exist"} />
				</span>
			</button>
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "an_zero"}
				onclick={() => solver.checkStep3("an_zero")}
			>
				<strong>
					<MathText text={String.raw`$a_0 = 0, \; a_n = 0$`} />
				</strong>
				<span class="choice-sub">
					<MathText text={"Only sine terms ($b_n$) exist"} />
				</span>
			</button>
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "none"}
				onclick={() => solver.checkStep3("none")}
			>
				<strong
					>Neither entire coefficient family vanishes by origin parity</strong
				>
				<span class="choice-sub">
					<MathText text={"Must compute both $a_n$ and $b_n$"} />
				</span>
			</button>
		</div>
		{#if problem.coeffs.hasHalfWaveSymmetry}
			<MathText
				text={String.raw`Half-wave symmetry additionally gives $a_0=0$ and $a_{2k}=b_{2k}=F_{2k}=0$ for positive integers $k$.`}
			/>
		{/if}

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

	/* ── Multiple choice button grid ───────────────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
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

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.button-grid-taxonomic {
			grid-template-columns: 1fr;
		}
	}
</style>
