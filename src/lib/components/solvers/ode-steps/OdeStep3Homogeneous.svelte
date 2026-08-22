<script lang="ts">
	/**
	 * OdeStep3Homogeneous Svelte 5 Component.
	 *
	 * Step 3: Homogeneous Form Template Selection.
	 *
	 * Prompts the student to select the general homogeneous solution template $y_h(t)$
	 * matching the characteristic roots.
	 */

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
		solver.currentStep === 3
			? "active"
			: solver.currentStep > 3
				? "completed"
				: "locked",
	);
</script>

<StepCard
	stepNumber={3}
	title="Homogeneous Form Template"
	{status}
	summaryLatex={`Homogeneous Form: $${problem.itsData.step3.formLatex}$`}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={"Select the general homogeneous solution template $y_h(t)$ matching the characteristic roots:"}
			/>
		</p>
		<div class="button-grid-taxonomic">
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "single_real"}
				onclick={() => solver.checkStep3("single_real")}
			>
				<strong>Single Real Root</strong>
				<span class="choice-sub">
					<MathText text={String.raw`$C_1 e^{rt}$`} />
				</span>
			</button>
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "distinct_real"}
				onclick={() => solver.checkStep3("distinct_real")}
			>
				<strong>Distinct Real Roots</strong>
				<span class="choice-sub">
					<MathText
						text={String.raw`$C_1 e^{r_1 t} + C_2 e^{r_2 t}$`}
					/>
				</span>
			</button>
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "repeated_real"}
				onclick={() => solver.checkStep3("repeated_real")}
			>
				<strong>Repeated Real Roots</strong>
				<span class="choice-sub">
					<MathText text={String.raw`$(C_1 + C_2 t) e^{r t}$`} />
				</span>
			</button>
			<button
				type="button"
				class="choice-btn"
				class:selected={solver.step3.selected === "complex_conjugate"}
				onclick={() => solver.checkStep3("complex_conjugate")}
			>
				<strong>Complex Conjugate Roots</strong>
				<span class="choice-sub">
					<MathText
						text={String.raw`$e^{\sigma t}[C_1 \cos(\omega_d t) + C_2 \sin(\omega_d t)]$`}
					/>
				</span>
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

	/* ── Taxonomic multiple choice grid ───────────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.choice-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		cursor: pointer;
		color: var(--text-primary);
		text-align: left;
		transition: all 0.15s ease;
		font-family: inherit;
		box-sizing: border-box;
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

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.button-grid-taxonomic {
			grid-template-columns: 1fr;
		}
	}
</style>
