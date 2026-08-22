<script lang="ts">
	/**
	 * FourierStep2Symmetry Svelte 5 Component.
	 *
	 * Step 2: Waveform Symmetry Analysis (Multi-Part Step).
	 *
	 * Sequentially guides students through:
	 * - Part 2A: Origin Parity Classification ($x(-t) = x(t)$ or $x(-t) = -x(t)$)
	 * - Part 2B: Half-Wave Symmetry Test ($x(t + T_0/2) = -x(t)$)
	 * Integrates PartProgressPill and verified subpart summary blocks (ADR-0034).
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
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
		solver.currentStep === 2
			? "active"
			: solver.currentStep > 2
				? "completed"
				: "locked",
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step2Progress} />
	{/if}
{/snippet}

{#snippet summarySnippet()}
	<span>
		Origin parity: <strong class="capitalize"
			>{problem.coeffs.originParity}</strong
		>; half-wave symmetry:
		<strong>
			{problem.coeffs.hasHalfWaveSymmetry ? "yes" : "no"}
		</strong>
	</span>
{/snippet}

<StepCard
	stepNumber={2}
	title="Waveform Symmetry Analysis"
	{status}
	{headerExtra}
	{summarySnippet}
>
	<div class="step-body">
		<!-- Part 2A: Origin Parity -->
		<SubStepBlock
			badge="Part 2A"
			title="Classify Origin Parity"
			isCompleted={solver.step2.activeSubStepId !== "origin-parity"}
		>
			{#snippet summarySnippet()}
				<div class="substep-verified-line">
					Origin parity validated: <strong class="capitalize"
						>{problem.coeffs.originParity}</strong
					>
				</div>
			{/snippet}

			<p class="step-prompt">
				<MathText
					text={"Classify the parity of $x(t)$ about the time origin:"}
				/>
			</p>
			<div
				class="button-grid-taxonomic"
				data-testid="fourier-step2-origin-options"
			>
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step2.subSteps["origin-parity"]
						.selected === "even"}
					onclick={() =>
						(solver.step2.subSteps["origin-parity"].selected =
							"even")}
				>
					<strong>Even Symmetry</strong>
					<span class="choice-sub"
						><MathText text={"$x(-t) = x(t)$"} /></span
					>
				</button>
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step2.subSteps["origin-parity"]
						.selected === "odd"}
					onclick={() =>
						(solver.step2.subSteps["origin-parity"].selected =
							"odd")}
				>
					<strong>Odd Symmetry</strong>
					<span class="choice-sub"
						><MathText text={"$x(-t) = -x(t)$"} /></span
					>
				</button>
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step2.subSteps["origin-parity"]
						.selected === "none"}
					onclick={() =>
						(solver.step2.subSteps["origin-parity"].selected =
							"none")}
				>
					<strong>Neither Symmetry</strong>
					<span class="choice-sub">Asymmetric / Shifted</span>
				</button>
			</div>
			<div class="step-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => solver.checkStep2OriginParity()}
				>
					Check Origin Parity →
				</button>
			</div>
		</SubStepBlock>

		<!-- Part 2B: Half-Wave Symmetry -->
		{#if solver.step2.activeSubStepId === "half-wave"}
			<SubStepBlock
				badge="Part 2B"
				title="Test Half-Wave Symmetry"
				isCompleted={false}
			>
				<p class="step-prompt">
					<MathText
						text={"Half-wave symmetry means the second half of each period is an upside-down copy of the first half. Equivalently, shifting the signal by half a period reverses its sign: $x(t+T_0/2)=-x(t)$."}
					/>
				</p>
				<div
					class="button-grid-taxonomic"
					data-testid="fourier-step2-half-wave-options"
				>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.subSteps["half-wave"]
							.selected === true}
						onclick={() =>
							(solver.step2.subSteps["half-wave"].selected =
								true)}
					>
						<strong>Has Half-Wave Symmetry</strong>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.subSteps["half-wave"]
							.selected === false}
						onclick={() =>
							(solver.step2.subSteps["half-wave"].selected =
								false)}
					>
						<strong>No Half-Wave Symmetry</strong>
					</button>
				</div>
				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.checkStep2HalfWave()}
					>
						Check Half-Wave Symmetry →
					</button>
				</div>
			</SubStepBlock>
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

	/* ── Subpart verified line & modifiers ─────────────────── */

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 600;
		padding: 0.25rem 0;
	}

	.capitalize {
		text-transform: capitalize;
	}

	/* ── Multiple choice button grid ───────────────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
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

	/* ── Step actions & buttons ────────────────────────────── */

	.step-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
		font-family: inherit;
		line-height: var(--leading-snug);
		text-wrap: balance;
		max-width: 100%;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast);
	}

	.btn-primary:hover {
		background: var(--accent-hover);
	}

	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.step-actions {
			width: 100%;
		}

		.btn-primary {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
	}
</style>
