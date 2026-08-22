<script lang="ts">
	/**
	 * FourierStep5Integrals Svelte 5 Component.
	 *
	 * Step 5: Piecewise Integral Setup Formulation (Multi-Part Step).
	 *
	 * Sequentially guides students through setting up definite integral expressions
	 * for each active non-zero Fourier coefficient family (DC $a_0$, cosine $a_n$,
	 * sine $b_n$, or exponential $F_n$).
	 *
	 * Includes PartProgressPill and carried symmetry coefficient badges (ADR-0034).
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
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
		solver.currentStep === 5
			? "active"
			: solver.currentStep > 5
				? "completed"
				: "locked",
	);

	const activeStep5Index = $derived(
		problem.itsData.step5.parts.findIndex(
			({ id }) => id === solver.step5.activeSubStepId,
		),
	);
	const activeStep5Part = $derived(
		problem.itsData.step5.parts.find(
			({ id }) => id === solver.step5.activeSubStepId,
		),
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step5Progress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={5}
	title="Integral Setup Formulation"
	{status}
	{headerExtra}
	summaryLatex={"\\text{Integral Form: Validated}"}
>
	<div class="step-body">
		{#each problem.itsData.step5.parts.slice(0, activeStep5Index) as prevPart, idx}
			<div class="subpart-block subpart-done">
				<div class="subpart-header">
					<span class="subpart-badge"
						>Part 5{String.fromCharCode(65 + idx)}</span
					>
					<h4 class="subpart-title">
						<MathText text={prevPart.title} />
					</h4>
					<span class="substep-check-badge">
						<span class="check-icon">✓</span> Verified
					</span>
				</div>
				<div class="substep-verified-line">
					<MathBlock
						math={prevPart.resultLatex}
						compact={true}
						hideHeader={true}
					/>
				</div>
			</div>
		{/each}

		<div class="subpart-block">
			<div class="subpart-header">
				<span class="subpart-badge"
					>Part 5{String.fromCharCode(
						65 + Math.max(0, activeStep5Index),
					)}</span
				>
				<h4 class="subpart-title">
					<MathText text={activeStep5Part?.title ?? ""} />
				</h4>
			</div>

			{#if problem.itsData.step5.carriedCoefficients.length > 0}
				<div class="carried-coefficients">
					{#each problem.itsData.step5.carriedCoefficients as carried}
						<div>
							<MathText
								text={`$${carried.latex}$ — ${carried.reason}`}
							/>
						</div>
					{/each}
				</div>
			{/if}

			<p class="step-prompt">
				<MathText text={activeStep5Part?.prompt ?? ""} />
			</p>
			<div
				class="mcq-cards-grid"
				data-testid="fourier-step5-options"
			>
				{#each activeStep5Part?.options ?? [] as opt}
					<button
						type="button"
						class="mcq-card"
						class:selected={solver.step5.subSteps[
							solver.step5.activeSubStepId
						]?.selected === opt.id}
						onclick={() => solver.checkStep5(opt)}
					>
						<MathBlock
							math={opt.latex}
							compact={true}
							hideHeader={true}
						/>
					</button>
				{/each}
			</div>
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

	/* ── Subpart blocks & headers ──────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}

	.subpart-done {
		opacity: 0.92;
	}

	.subpart-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.subpart-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	.subpart-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.substep-check-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-success, #10b981);
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 600;
		padding: 0.25rem 0;
	}

	.check-icon {
		color: var(--color-success);
		font-weight: 800;
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
