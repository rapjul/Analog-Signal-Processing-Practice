<script lang="ts">
	/**
	 * OdeStep1CharEq Svelte 5 Component.
	 *
	 * Step 1: Characteristic Equation Setup ($a_2 s^2 + a_1 s + a_0 = 0$).
	 * Maps differential operators to algebraic polynomial s-powers with live equation preview.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import type { OdeStepSolverState } from "../ode-step-solver.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 1
			? "active"
			: solver.currentStep > 1
				? "completed"
				: "locked",
	);
</script>

<StepCard
	stepNumber={1}
	title="Characteristic Equation Formulation"
	{status}
	summaryLatex={`Characteristic Equation: $Q(s) = ${problem.itsData.step1.latex}$`}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={String.raw`Map differential operators $\frac{d^n}{dt^n} \to s^n$ and set the homogeneous right-hand side to $0$:`}
			/>
		</p>

		<div class="char-eq-interactive-box">
			<div class="coeff-inputs-row">
				{#if problem.params.order === 2}
					<div class="coeff-group">
						<label
							for="ode-a2-input"
							class="coeff-label"
						>
							<MathText text={"$s^2$ Coeff ($a_2$):"} />
						</label>
						<input
							id="ode-a2-input"
							type="text"
							class="text-input coeff-input"
							placeholder="1"
							bind:value={solver.step1.a2}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep1()}
						/>
					</div>
					<span class="plus-symbol">+</span>
				{/if}
				<div class="coeff-group">
					<label
						for="ode-a1-input"
						class="coeff-label"
					>
						<MathText text={"$s$ Coeff ($a_1$):"} />
					</label>
					<input
						id="ode-a1-input"
						type="text"
						class="text-input coeff-input"
						placeholder="e.g. 8"
						bind:value={solver.step1.a1}
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep1()}
					/>
				</div>
				<span class="plus-symbol">+</span>
				<div class="coeff-group">
					<label
						for="ode-a0-input"
						class="coeff-label"
					>
						<MathText text={"Constant ($a_0$):"} />
					</label>
					<input
						id="ode-a0-input"
						type="text"
						class="text-input coeff-input"
						placeholder="e.g. 12"
						bind:value={solver.step1.a0}
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep1()}
					/>
				</div>
			</div>

			<div class="preview-equation-box">
				<span class="preview-label">Live Equation Preview:</span>
				<MathBlock
					math={`Q(s) = ${solver.previewCharEq}`}
					compact={true}
					hideHeader={true}
				/>
			</div>
		</div>

		<div class="step-actions">
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => solver.checkStep1()}
			>
				Check Characteristic Equation →
			</button>
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
	/* ── Step body ────────────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Characteristic equation interactive box ──────────── */

	.char-eq-interactive-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.85rem 1rem;
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
	}

	.coeff-inputs-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.coeff-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 90px;
		flex: 1;
	}

	.coeff-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.coeff-input {
		width: 100%;
		text-align: center;
		font-family: var(--font-mono, monospace);
		font-weight: 600;
	}

	.plus-symbol {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--text-secondary);
		padding-bottom: 0.5rem;
	}

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

	/* ── Action buttons & inputs ──────────────────────────── */

	.text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
		box-sizing: border-box;
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
		.coeff-inputs-row {
			flex-direction: column;
			align-items: stretch;
		}

		.plus-symbol {
			display: none;
		}

		.btn {
			width: 100%;
		}
	}
</style>
