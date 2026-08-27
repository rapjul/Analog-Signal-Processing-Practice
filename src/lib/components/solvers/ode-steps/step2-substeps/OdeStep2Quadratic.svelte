<script lang="ts">
	/**
	 * OdeStep2Quadratic Svelte 5 Component.
	 *
	 * Renders quadratic formula setup, root classification radio buttons,
	 * discriminant helper, and distinct/repeated/complex root evaluation forms.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import OdeStep2Discriminant from "./OdeStep2Discriminant.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();
</script>

<div class="quadratic-setup-container">
	<p class="quad-formula-prompt">
		<MathText
			text={String.raw`Substituted characteristic polynomial coefficients into the quadratic formula $s = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$:`}
		/>
	</p>

	<div class="preview-equation-box">
		<MathBlock
			math={solver.previewQuadSetup}
			compact={true}
			hideHeader={true}
		/>
	</div>

	<!-- Root Classification & Discriminant Gate -->
	<div class="quad-classification-box">
		<span class="classification-step-label">
			<MathText
				text={String.raw`1. Determine root structure from discriminant $\Delta = b^2 - 4ac$:`}
			/>
		</span>

		<div class="classification-button-group">
			<button
				type="button"
				class="quad-class-btn"
				class:active={solver.step2.quadClassChoice === "distinct_real"}
				disabled={solver.step2.quadNeedsDiscriminantCalc}
				onclick={() =>
					solver.selectQuadRootClassification("distinct_real")}
			>
				<MathText text={String.raw`Distinct Real ($\Delta > 0$)`} />
			</button>
			<button
				type="button"
				class="quad-class-btn"
				class:active={solver.step2.quadClassChoice === "repeated_real"}
				disabled={solver.step2.quadNeedsDiscriminantCalc}
				onclick={() =>
					solver.selectQuadRootClassification("repeated_real")}
			>
				<MathText text={String.raw`Repeated Real ($\Delta = 0$)`} />
			</button>
			<button
				type="button"
				class="quad-class-btn"
				class:active={solver.step2.quadClassChoice ===
					"complex_conjugate"}
				disabled={solver.step2.quadNeedsDiscriminantCalc}
				onclick={() =>
					solver.selectQuadRootClassification("complex_conjugate")}
			>
				<MathText text={String.raw`Complex Conjugate ($\Delta < 0$)`} />
			</button>
		</div>

		<!-- Discriminant Calculation Row (Helper or Remediation) -->
		<OdeStep2Discriminant
			{problem}
			{solver}
		/>
	</div>

	<!-- Dynamic Roots Input Form (revealed when classification is resolved) -->
	{#if solver.step2.quadClassChoice !== null}
		<div class="quad-roots-entry-box">
			<span class="classification-step-label">
				2. Evaluate the characteristic roots:
			</span>

			{#if solver.step2.quadClassChoice === "complex_conjugate"}
				<div class="input-row-horizontal">
					<div class="input-pair">
						<label
							for="ode-sigma-input"
							class="field-label"
						>
							<MathText text={"Real Part $\\sigma$:"} />
						</label>
						<input
							id="ode-sigma-input"
							type="text"
							class="solver-input"
							placeholder="e.g. -2"
							bind:value={solver.step2.sigma}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
						/>
					</div>
					<div class="input-pair">
						<label
							for="ode-omegad-input"
							class="field-label"
						>
							<MathText text={"Damped Frequency $\\omega_d$:"} />
						</label>
						<input
							id="ode-omegad-input"
							type="text"
							class="solver-input"
							placeholder="e.g. 3"
							bind:value={solver.step2.omegaD}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
						/>
					</div>
				</div>
				<div class="preview-equation-box">
					<span class="preview-label">Live Roots Preview:</span>
					<MathBlock
						math={solver.previewComplexRoots}
						compact={true}
						hideHeader={true}
					/>
				</div>
			{:else if solver.step2.quadClassChoice === "distinct_real"}
				<div class="input-row-grid">
					<div class="input-pair">
						<label
							for="ode-quad-r1-input"
							class="field-label"
						>
							<MathText text={"Root $r_1$:"} />
						</label>
						<input
							id="ode-quad-r1-input"
							type="text"
							class="text-input"
							placeholder="e.g. -2"
							bind:value={solver.step2.r1}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
						/>
					</div>
					<div class="input-pair">
						<label
							for="ode-quad-r2-input"
							class="field-label"
						>
							<MathText text={"Root $r_2$:"} />
						</label>
						<input
							id="ode-quad-r2-input"
							type="text"
							class="text-input"
							placeholder="e.g. -3"
							bind:value={solver.step2.r2}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
						/>
					</div>
				</div>
			{:else if solver.step2.quadClassChoice === "repeated_real"}
				<div
					class="input-pair"
					style="max-width: 260px;"
				>
					<label
						for="ode-quad-r-rep-input"
						class="field-label"
					>
						<MathText text={"Repeated Root $r = r_1 = r_2$:"} />
					</label>
					<input
						id="ode-quad-r-rep-input"
						type="text"
						class="text-input"
						placeholder="e.g. -2"
						bind:value={solver.step2.r1}
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep2()}
					/>
				</div>
			{/if}

			<div class="step-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => solver.checkStep2()}
				>
					Verify Roots →
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.quadratic-setup-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.quad-formula-prompt {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary, #a1a1aa);
	}

	.preview-equation-box {
		padding: 0.75rem;
		background: var(--bg-surface, #09090b);
		border-radius: 6px;
		border: 1px solid var(--border-subtle, #1e1e24);
	}

	.preview-label {
		font-size: 0.8rem;
		color: var(--text-tertiary, #71717a);
		margin-bottom: 0.35rem;
		display: block;
	}

	.quad-classification-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem;
		background: var(--bg-elevated, #18181b);
		border-radius: 6px;
		border: 1px solid var(--border-color, #27272a);
	}

	.classification-step-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary, #f4f4f5);
	}

	.classification-button-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.5rem;
	}

	.quad-class-btn {
		padding: 0.6rem 0.75rem;
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-secondary, #a1a1aa);
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quad-class-btn:hover:not(:disabled) {
		border-color: var(--primary, #06b6d4);
		color: var(--text-primary, #f4f4f5);
	}

	.quad-class-btn.active {
		background: var(--primary, #06b6d4);
		border-color: var(--primary, #06b6d4);
		color: #000;
		font-weight: 600;
	}

	.quad-class-btn:focus-visible {
		outline: 2px solid var(--primary, #06b6d4);
		outline-offset: 2px;
	}

	.quad-class-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quad-roots-entry-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem;
		background: var(--bg-elevated, #18181b);
		border-radius: 6px;
		border: 1px solid var(--border-color, #27272a);
	}

	.input-row-horizontal,
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

	.text-input,
	.solver-input {
		background: var(--bg-surface, #09090b);
		border: 1px solid var(--border-color, #27272a);
		color: var(--text-primary, #f4f4f5);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.95rem;
		font-family: monospace;
	}

	.text-input:focus,
	.solver-input:focus {
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
		.input-row-horizontal,
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
