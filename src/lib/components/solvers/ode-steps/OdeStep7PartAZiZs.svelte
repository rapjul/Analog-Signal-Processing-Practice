<script lang="ts">
	/**
	 * OdeStep7PartAZiZs Svelte 5 Component.
	 *
	 * Step 7 Part 7A: Zero-Input ($y_{ZI}$) & Zero-State ($y_{ZS}$) Decomposition.
	 *
	 * Handles inputting constants for Zero-Input solution and derives Zero-State via superposition.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	/**
	 * Component properties for OdeStep7PartAZiZs.
	 */
	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();
</script>

<SubStepBlock
	badge="Part 7A"
	title={"Zero-Input ($y_{ZI}$) & Zero-State ($y_{ZS}$) Decomposition"}
	isCompleted={solver.step7.ziZsPassed}
>
	{#snippet summarySnippet()}
		<div class="substep-verified-line">
			<div class="verified-item">
				<span class="verified-label">Zero-Input:</span>
				<MathText
					text={`$y_{ZI}(t) = ${problem.solutions.y_zi_latex}$`}
				/>
			</div>
			<div class="verified-item">
				<span class="verified-label">Zero-State:</span>
				<MathText
					text={`$y_{ZS}(t) = ${problem.solutions.y_zs_latex}$`}
				/>
			</div>
		</div>
	{/snippet}

	<p class="step-prompt">
		<MathText
			text={problem.params.order === 1
				? String.raw`For $y_{ZI}(t) = C_{1,ZI} e^{rt}$ with $x(t)=0$, match the initial condition $y(0^-) = ${problem.initialConditions.y0}$ to find $C_{1,ZI}$:`
				: String.raw`Find the Zero-Input response $y_{ZI}(t)$ by setting forcing $x(t) = 0$ and solving for constants matching the original initial conditions $y(0^-) = ${problem.initialConditions.y0}, \quad y'(0^-) = ${problem.initialConditions.dy0}$:`}
		/>
	</p>

	<!-- Zero-Input Initial Conditions System Display -->
	{#if problem.params.order === 2}
		<div class="ic-system-display">
			<span class="system-lead-label">
				<MathText
					text={"Zero-Input Initial Condition System ($x(t) = 0$):"}
				/>
			</span>
			<MathBlock
				math={problem.itsData.step7.ziSystemLatex}
				compact={true}
				hideHeader={true}
			/>
		</div>
	{/if}

	<div class="input-row-grid">
		<div class="input-pair">
			<label
				for="ode-zic1-input"
				class="field-label"
			>
				<MathText text={"Zero-Input Constant $C_{1,ZI}$:"} />
			</label>
			<input
				id="ode-zic1-input"
				type="text"
				class="text-input"
				placeholder="e.g. 1"
				bind:value={solver.step7.ziC1}
				onkeydown={(e) => e.key === "Enter" && solver.checkStep7ZI()}
			/>
		</div>
		{#if problem.params.order === 2}
			<div class="input-pair">
				<label
					for="ode-zic2-input"
					class="field-label"
				>
					<MathText text={"Zero-Input Constant $C_{2,ZI}$:"} />
				</label>
				<input
					id="ode-zic2-input"
					type="text"
					class="text-input"
					placeholder="e.g. -2"
					bind:value={solver.step7.ziC2}
					onkeydown={(e) =>
						e.key === "Enter" && solver.checkStep7ZI()}
				/>
			</div>
		{/if}
	</div>

	<div class="preview-equation-box">
		<span class="preview-label">
			Live Zero-Input & Zero-State Previews:
		</span>
		<MathBlock
			math={`y_{ZI}(t) = ${solver.previewZI}`}
			compact={true}
			hideHeader={true}
		/>
		<div class="superposition-note">
			<MathText
				text={problem.params.order === 1
					? `Superposition Identity: $C_{1,ZS} = C_1 - C_{1,ZI} = ${solver.derivedZSC1}$`
					: `Superposition Identity: $C_{1,ZS} = C_1 - C_{1,ZI} = ${solver.derivedZSC1}, \\quad C_{2,ZS} = C_2 - C_{2,ZI} = ${solver.derivedZSC2}$`}
			/>
		</div>
		<MathBlock
			math={`y_{ZS}(t) = ${solver.previewZS}`}
			compact={true}
			hideHeader={true}
		/>
	</div>

	<div class="step-actions">
		<button
			type="button"
			class="btn btn-primary"
			onclick={() => solver.checkStep7ZI()}
		>
			Verify ZI/ZS Decomposition →
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

	/* ── Initial Condition System Display ──────────────────── */

	.ic-system-display {
		margin: 0.5rem 0;
		padding: 0.5rem;
		background: var(--bg-card);
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--border-color);
	}

	.system-lead-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
		display: block;
	}

	/* ── Live Previews & Superposition Note ────────────────── */

	.preview-equation-box {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		border-top: 1px dashed var(--border-color);
		padding-top: 0.5rem;
	}

	.preview-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.superposition-note {
		font-size: var(--text-xs);
		color: var(--accent-primary);
		background: var(--accent-bg-subtle, rgba(6, 182, 212, 0.05));
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm, 4px);
		border-left: 2px solid var(--accent-primary);
	}

	/* ── Inputs & Action Buttons ───────────────────────────── */

	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.input-pair {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: 360px;
		min-width: min(100%, 220px);
		flex: 1;
	}

	.field-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
		box-sizing: border-box;
		width: 100%;
	}

	.text-input:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

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
		.input-row-grid {
			grid-template-columns: 1fr;
		}

		.btn {
			width: 100%;
		}
	}
</style>
