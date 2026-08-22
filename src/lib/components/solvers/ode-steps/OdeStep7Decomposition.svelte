<script lang="ts">
	/**
	 * OdeStep7Decomposition Svelte 5 Component.
	 *
	 * Step 7: Dual Response Decomposition & Conceptual Mastery (Multi-Part Step).
	 *
	 * Orchestrates decomposed child components:
	 * - OdeStep7PartAZiZs: Zero-Input ($y_{ZI}$) & Zero-State ($y_{ZS}$) Decomposition
	 * - OdeStep7PartBTrSs: Transient ($y_{tr}$) & Steady-State ($y_{ss}$) Identification
	 * - OdeStep7PartCConceptual: Targeted Conceptual Mastery Check
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import type { OdeStepSolverState } from "../ode-step-solver.svelte";
	import OdeStep7PartAZiZs from "./OdeStep7PartAZiZs.svelte";
	import OdeStep7PartBTrSs from "./OdeStep7PartBTrSs.svelte";
	import OdeStep7PartCConceptual from "./OdeStep7PartCConceptual.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
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

{#snippet headerExtra()}
	{#if solver.currentStep === 7}
		<PartProgressPill progress={solver.step7Progress} />
	{/if}
{/snippet}

{#snippet summarySnippet()}
	<div class="step-summary-full">
		<div class="summary-row">
			<span class="check-icon">✓</span>
			<span class="summary-heading">Complete Solution:</span>
			<MathText text={`$y(t) = ${problem.solutions.y_complete_latex}$`} />
		</div>
		<div class="summary-decomposition-grid">
			<div class="decomp-card">
				<span class="decomp-title"
					>Zero-Input / Zero-State Decomposition</span
				>
				<div class="decomp-math">
					<MathText
						text={`$y_{ZI}(t) = ${problem.solutions.y_zi_latex}$`}
					/>
				</div>
				<div class="decomp-math">
					<MathText
						text={`$y_{ZS}(t) = ${problem.solutions.y_zs_latex}$`}
					/>
				</div>
			</div>
			<div class="decomp-card">
				<span class="decomp-title"
					>Transient / Steady-State Decomposition</span
				>
				<div class="decomp-math">
					<MathText
						text={`$y_{tr}(t) = ${problem.solutions.y_tr_latex}$`}
					/>
				</div>
				<div class="decomp-math">
					<MathText
						text={`$y_{ss}(t) = ${problem.solutions.y_ss_latex}$`}
					/>
				</div>
			</div>
		</div>
		<div class="concept-takeaway-box">
			<span class="takeaway-label">💡 Key Conceptual Insight:</span>
			<div class="takeaway-text">
				<MathText
					text={problem.itsData.step7.conceptQuestion.explanation}
				/>
			</div>
		</div>
	</div>
{/snippet}

<StepCard
	stepNumber={7}
	badgeText={solver.step7Badge}
	title="Response Decomposition & Conceptual Mastery"
	{status}
	{headerExtra}
	{summarySnippet}
>
	<div class="step-body">
		<!-- Total Solution Synthesis Banner -->
		<div class="synthesis-banner">
			<span class="synthesis-badge">Total Solution Form:</span>
			<div class="synthesis-math">
				<MathBlock
					math={`y(t) = ${problem.solutions.y_complete_latex}`}
					compact={true}
					hideHeader={true}
				/>
			</div>
		</div>

		<!-- Part 7A: Zero-Input (y_ZI) vs Zero-State (y_ZS) Decomposition -->
		<OdeStep7PartAZiZs
			{problem}
			{solver}
		/>

		<!-- Part 7B: Transient (y_tr) vs Steady-State (y_ss) Identification -->
		{#if solver.step7.ziZsPassed}
			<OdeStep7PartBTrSs
				{problem}
				{solver}
			/>
		{/if}

		<!-- Part 7C: Targeted Conceptual Mastery Question -->
		{#if solver.step7.trSsPassed}
			<OdeStep7PartCConceptual
				{problem}
				{solver}
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
	/* ── Step body ────────────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.check-icon {
		color: var(--color-success, #10b981);
		font-weight: 800;
	}

	/* ── Synthesis banner ─────────────────────────────────── */

	.synthesis-banner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		background: var(--accent-bg-subtle, rgba(6, 182, 212, 0.05));
		border: 1px solid var(--accent-bg, rgba(6, 182, 212, 0.2));
		border-radius: var(--radius-sm, 6px);
	}

	.synthesis-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-primary);
	}

	.synthesis-math {
		width: 100%;
		overflow-x: auto;
	}

	/* ── Summary full ─────────────────────────────────────── */

	.step-summary-full {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.summary-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: var(--text-sm);
	}

	.summary-heading {
		font-weight: 700;
		color: var(--text-primary);
	}

	.summary-decomposition-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
	}

	.decomp-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
	}

	.decomp-title {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.2rem;
	}

	.decomp-math {
		font-size: var(--text-sm);
	}

	.concept-takeaway-box {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.75rem;
		background: var(--color-warning-bg, rgba(245, 158, 11, 0.1));
		border: 1px solid var(--color-warning, #f59e0b);
		border-radius: var(--radius-sm, 6px);
	}

	.takeaway-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-warning, #f59e0b);
	}

	.takeaway-text {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		line-height: var(--leading-normal);
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.summary-decomposition-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
