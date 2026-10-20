<script lang="ts">
	/**
	 * OdeStep7PartBTrSs Svelte 5 Component.
	 *
	 * Step 7 Part 7B: Transient ($y_{tr}$) & Steady-State ($y_{ss}$) Identification.
	 *
	 * Guides students through classifying natural decaying modes vs persistent forced responses.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	/**
	 * Component properties for OdeStep7PartBTrSs.
	 */
	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const isAlgebraic = $derived(
		problem.itsData.step7.decompositionMode === "homogeneous_particular",
	);
	const firstName = $derived(isAlgebraic ? "Homogeneous" : "Transient");
	const secondName = $derived(isAlgebraic ? "Particular" : "Steady-State");
	const firstSymbol = $derived(isAlgebraic ? "y_h" : "y_{tr}");
	const secondSymbol = $derived(isAlgebraic ? "y_p" : "y_{ss}");
</script>

<SubStepBlock
	badge="Part 7B"
	title={`${firstName} ($${firstSymbol}$) & ${secondName} ($${secondSymbol}$) Identification`}
	isCompleted={solver.step7.trSsPassed}
>
	{#snippet summarySnippet()}
		<div class="substep-verified-line">
			<div class="verified-item">
				<span class="verified-label">{firstName}:</span>
				<MathText
					text={`$${firstSymbol}(t) = ${isAlgebraic ? problem.solutions.y_h_latex : problem.solutions.y_tr_latex}$`}
				/>
			</div>
			<div class="verified-item">
				<span class="verified-label">{secondName}:</span>
				<MathText
					text={`$${secondSymbol}(t) = ${isAlgebraic ? problem.solutions.y_p_latex : problem.solutions.y_ss_latex}$`}
				/>
			</div>
		</div>
	{/snippet}

	<p class="step-prompt">
		<MathText
			text={isAlgebraic
				? "Identify the homogeneous contribution $y_h(t)$ and particular solution $y_p(t)$ in the total response. Both decay for this stable system and decaying exponential input: the entire response is transient and $y_{ss}(t)=0$."
				: String.raw`Identify the Transient Response $y_{tr}(t)$ (the component tending to zero) and the Steady-State Response $y_{ss}(t)$ (what remains after the transient decays):`}
		/>
	</p>

	<div class="classification-group">
		<span class="classification-step-label">
			<MathText
				text={`1. Select ${firstName} ${isAlgebraic ? "Contribution" : "Response"} $${firstSymbol}(t)$:`}
			/>
		</span>
		<div class="mcq-cards-grid">
			{#each problem.itsData.step7.transientOptions as option}
				<button
					type="button"
					class="mcq-card"
					data-option-id={option.id}
					class:selected={solver.step7.selectedTransient ===
						option.id}
					onclick={() => {
						solver.step7.selectedTransient = option.id;
						solver.clearFeedback();
					}}
				>
					<MathText text={`$${option.latex}$`} />
				</button>
			{/each}
		</div>
	</div>

	<div class="classification-group">
		<span class="classification-step-label">
			<MathText
				text={`2. Select ${secondName} ${isAlgebraic ? "Solution" : "Response"} $${secondSymbol}(t)$:`}
			/>
		</span>
		<div class="mcq-cards-grid">
			{#each problem.itsData.step7.steadyStateOptions as option}
				<button
					type="button"
					class="mcq-card"
					data-option-id={option.id}
					class:selected={solver.step7.selectedSteadyState ===
						option.id}
					onclick={() => {
						solver.step7.selectedSteadyState = option.id;
						solver.clearFeedback();
					}}
				>
					<MathText text={`$${option.latex}$`} />
				</button>
			{/each}
		</div>
	</div>

	<div class="step-actions">
		<button
			type="button"
			class="btn btn-primary"
			onclick={() => solver.checkStep7TrSS()}
		>
			Verify {firstName} & {secondName} →
		</button>
	</div>
</SubStepBlock>

<style>
	/* ── Step prompt & verified items ──────────────────────── */

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.verified-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		flex-wrap: wrap;
	}

	.verified-label {
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 90px;
	}

	/* ── Classification groups & labels ────────────────────── */

	.classification-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.classification-step-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-primary);
	}

	/* ── Multiple choice option cards ──────────────────────── */

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.mcq-card {
		background: var(--bg-card);
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
		color: var(--text-primary);
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

	/* ── Step actions & buttons ────────────────────────────── */

	.step-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 1.1rem;
		border-radius: var(--radius-sm, 6px);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
		font-family: inherit;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--text-on-accent, #000);
	}

	.btn-primary:hover {
		filter: brightness(1.1);
	}

	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}

		.btn {
			width: 100%;
		}
	}
</style>
