<script lang="ts">
	/**
	 * OdeStep2Factoring Svelte 5 Component.
	 *
	 * Renders root input fields for the factoring path of Step 2.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
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

{#if problem.params.order === 1}
	<div
		class="input-pair"
		style="max-width: 260px;"
	>
		<label
			for="ode-r1-input"
			class="field-label"
		>
			<MathText text={"Root $r$:"} />
		</label>
		<input
			id="ode-r1-input"
			type="text"
			class="text-input"
			placeholder="e.g. -2"
			bind:value={solver.step2.r1}
			onkeydown={(e) => e.key === "Enter" && solver.checkStep2()}
		/>
	</div>
{:else if problem.itsData.step2.rootType === "repeated_real"}
	<div
		class="input-pair"
		style="max-width: 260px;"
	>
		<label
			for="ode-r-rep-input"
			class="field-label"
		>
			<MathText text={"Repeated Root $r = r_1 = r_2$:"} />
		</label>
		<input
			id="ode-r-rep-input"
			type="text"
			class="text-input"
			placeholder="e.g. -2"
			bind:value={solver.step2.r1}
			onkeydown={(e) => e.key === "Enter" && solver.checkStep2()}
		/>
	</div>
{:else}
	<div class="input-row-grid">
		<div class="input-pair">
			<label
				for="ode-r1-input"
				class="field-label"
			>
				<MathText text={"Root $r_1$:"} />
			</label>
			<input
				id="ode-r1-input"
				type="text"
				class="text-input"
				placeholder="e.g. -2"
				bind:value={solver.step2.r1}
				onkeydown={(e) => e.key === "Enter" && solver.checkStep2()}
			/>
		</div>
		<div class="input-pair">
			<label
				for="ode-r2-input"
				class="field-label"
			>
				<MathText text={"Root $r_2$:"} />
			</label>
			<input
				id="ode-r2-input"
				type="text"
				class="text-input"
				placeholder="e.g. -3"
				bind:value={solver.step2.r2}
				onkeydown={(e) => e.key === "Enter" && solver.checkStep2()}
			/>
		</div>
	</div>
{/if}

<div class="step-actions">
	<button
		type="button"
		class="btn btn-primary"
		onclick={() => solver.checkStep2()}
	>
		Check Factored Roots →
	</button>
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.input-pair {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
	}

	.text-input {
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-primary, #f4f4f5);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.95rem;
		font-family: monospace;
	}

	.text-input:focus {
		border-color: var(--primary, #06b6d4);
		outline: none;
	}

	.step-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.5rem;
	}

	.btn {
		padding: 0.55rem 1.1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--primary, #06b6d4);
		color: #000;
	}

	.btn-primary:hover {
		filter: brightness(1.1);
	}

	.btn:focus-visible {
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤480px) ─────────────────────────────────────────── */
	@media (max-width: 480px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
