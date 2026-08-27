<script lang="ts">
	/**
	 * OdeStep2StrategyGate Svelte 5 Component.
	 *
	 * Renders the strategy selection buttons (Factoring vs Quadratic Formula)
	 * for 2nd-order differential equations.
	 */

	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();
</script>

{#if problem.params.order === 2}
	<div class="strategy-gate-box">
		<span class="field-label">Select solving strategy:</span>
		<div class="strategy-button-group">
			<button
				type="button"
				class="strategy-pill-btn"
				class:active={solver.step2.strategy === "factoring"}
				onclick={() => solver.selectStep2Strategy("factoring")}
			>
				<span class="strategy-icon">🔍</span>
				<span>Factoring by inspection</span>
			</button>
			<button
				type="button"
				class="strategy-pill-btn"
				class:active={solver.step2.strategy === "quadratic"}
				onclick={() => solver.selectStep2Strategy("quadratic")}
			>
				<span class="strategy-icon">📐</span>
				<span>Quadratic formula / Square root</span>
			</button>
		</div>
	</div>
{/if}

{#if problem.params.order === 2 && solver.step2.strategy === null}
	<div class="strategy-unselected-prompt">
		<p class="strategy-helper-text">
			Select whether to factor the polynomial directly or apply the
			quadratic formula.
		</p>
	</div>
{/if}

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.strategy-gate-box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		border-radius: 8px;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
	}

	.strategy-button-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.strategy-pill-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem 0.85rem;
		background: var(--bg-elevated, #18181b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-secondary, #a1a1aa);
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.strategy-pill-btn:hover {
		border-color: var(--primary, #06b6d4);
		color: var(--text-primary, #f4f4f5);
	}

	.strategy-pill-btn.active {
		background: var(--primary, #06b6d4);
		border-color: var(--primary, #06b6d4);
		color: #000;
		font-weight: 600;
	}

	.strategy-pill-btn:focus-visible {
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}

	.strategy-icon {
		font-size: 1rem;
	}

	.strategy-unselected-prompt {
		padding: 1rem;
		background: var(--bg-elevated, #18181b);
		border-radius: 6px;
		text-align: center;
	}

	.strategy-helper-text {
		color: var(--text-tertiary, #71717a);
		font-size: 0.875rem;
		margin: 0;
	}

	/* ── Mobile media query (≤480px) ─────────────────────────────────────────── */
	@media (max-width: 480px) {
		.strategy-button-group {
			grid-template-columns: 1fr;
		}
	}
</style>
