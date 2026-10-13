<script lang="ts">
	/**
	 * OdeStep2Discriminant Svelte 5 Component.
	 *
	 * Renders the remedial/helper discriminant calculation input and verification badge.
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

<div
	class="disc-calc-row"
	class:disc-remediation-required={solver.step2.quadNeedsDiscriminantCalc}
>
	<label
		for="ode-disc-input"
		class="disc-field-label"
	>
		<MathText text={String.raw`Calculate $\Delta = b^2 - 4ac$:`} />
	</label>
	<div class="disc-input-with-action">
		<input
			id="ode-disc-input"
			type="text"
			class="text-input disc-input"
			placeholder="e.g. -36"
			bind:value={solver.step2.quadDiscriminantInput}
			onkeydown={(e) => e.key === "Enter" && solver.verifyDiscriminant()}
		/>
		<button
			type="button"
			class="btn-primary btn-verify-disc"
			onclick={() => solver.verifyDiscriminant()}
		>
			Verify Discriminant
		</button>
		{#if solver.step2.quadDiscriminantVerified && "discriminant" in problem.itsData.step2}
			<span class="disc-verified-badge">
				<span class="check-icon">✓</span>
				<MathText
					text={solver.step2.quadClassChoice === "complex_conjugate"
						? String.raw`$\Delta = ${problem.itsData.step2.discriminant} < 0$ (Complex Roots)`
						: solver.step2.quadClassChoice === "repeated_real"
							? String.raw`$\Delta = 0$ (Repeated Real Root)`
							: String.raw`$\Delta = ${problem.itsData.step2.discriminant} > 0$ (Distinct Real Roots)`}
				/>
			</span>
		{/if}
	</div>
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.disc-calc-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.75rem;
		background: var(--bg-surface, #09090b);
		border-radius: 6px;
		border: 1px solid var(--border-subtle, #1e1e24);
	}

	.disc-remediation-required {
		border-color: var(--amber, #f59e0b);
		background: rgba(245, 158, 11, 0.05);
	}

	.disc-field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
	}

	.disc-input-with-action {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
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

	.disc-input {
		max-width: 140px;
	}

	.btn-verify-disc {
		padding: 0.45rem 0.85rem;
		background: var(--bg-elevated, #18181b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-primary, #f4f4f5);
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-verify-disc:hover {
		border-color: var(--primary, #06b6d4);
	}

	.btn-verify-disc:focus-visible {
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}

	.disc-verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--success, #10b981);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.check-icon {
		font-weight: bold;
	}
</style>
