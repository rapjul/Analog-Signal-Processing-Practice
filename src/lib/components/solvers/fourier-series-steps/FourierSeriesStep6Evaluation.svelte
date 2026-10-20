<script lang="ts">
	/**
	 * FourierStep6Evaluation Svelte 5 Component.
	 *
	 * Step 6: Harmonic Coefficient Evaluation (Multi-Part Step).
	 *
	 * Sequentially guides students through evaluating the definite integrals,
	 * applying boundary values, and simplifying parity/harmonic factors
	 * for each active non-zero coefficient family ($a_0, a_n, b_n$, or $F_n$).
	 *
	 * Includes PartProgressPill and carried symmetry coefficient badges (ADR-0034).
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { FourierSeriesStepSolverState } from "$lib/components/solvers/fourier-series-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Active reactive Fourier solver controller */
		solver: FourierSeriesStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 6
			? "active"
			: solver.currentStep > 6
				? "completed"
				: "locked",
	);

	const activeStep6Index = $derived(
		problem.itsData.step6.parts.findIndex(
			({ id }) => id === solver.step6.activeSubStepId,
		),
	);
	const activeStep6Part = $derived(
		problem.itsData.step6.parts.find(
			({ id }) => id === solver.step6.activeSubStepId,
		),
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step6Progress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={6}
	title="Harmonic Coefficient Evaluation"
	{status}
	{headerExtra}
	summaryLatex="Harmonic Coefficients Evaluated"
>
	<div class="step-body">
		{#each problem.itsData.step6.parts.slice(0, activeStep6Index) as prevPart, idx}
			<SubStepBlock
				badge={`Part 6${String.fromCharCode(65 + idx)}`}
				title={prevPart.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}
					<div class="substep-verified-line">
						<MathBlock
							math={prevPart.resultLatex}
							compact={true}
							hideHeader={true}
						/>
					</div>
				{/snippet}
			</SubStepBlock>
		{/each}

		<SubStepBlock
			badge={`Part 6${String.fromCharCode(
				65 + Math.max(0, activeStep6Index),
			)}`}
			title={activeStep6Part?.title ?? ""}
			isCompleted={false}
		>
			{#if problem.itsData.step6.carriedCoefficients.length > 0}
				<div class="carried-coefficients">
					{#each problem.itsData.step6.carriedCoefficients as carried}
						<div>
							<MathText
								text={`$${carried.latex}$ — ${carried.reason}`}
							/>
						</div>
					{/each}
				</div>
			{/if}

			<p class="step-prompt">
				<MathText text={activeStep6Part?.prompt ?? ""} />
			</p>
			<div
				class="mcq-cards-grid"
				data-testid="fourier-step6-options"
			>
				{#each activeStep6Part?.options ?? [] as opt}
					<button
						type="button"
						class="mcq-card"
						class:selected={solver.step6.subSteps[
							solver.step6.activeSubStepId
						]?.selected === opt.id}
						onclick={() => solver.checkStep6(opt)}
					>
						<MathBlock
							math={opt.latex}
							compact={true}
							hideHeader={true}
						/>
					</button>
				{/each}
			</div>
		</SubStepBlock>

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

	/* ── Subpart verified lines & carried coefficients ─────── */

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 600;
		padding: 0.25rem 0;
	}

	.carried-coefficients {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: var(--text-xs);
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
