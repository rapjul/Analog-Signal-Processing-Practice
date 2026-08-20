<script lang="ts">
	/**
	 * OdeStep5Coefficients Svelte 5 Component.
	 *
	 * Step 5: Undetermined Coefficients Resolution (Multi-Part Step).
	 * Guides students sequentially through 1st derivative ($y_p'$), 2nd derivative ($y_p''$),
	 * harmonic system grouping, and algebraic solution for undetermined coefficients ($A, B$ or $K_p$).
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
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
		solver.currentStep === 5
			? "active"
			: solver.currentStep > 5
				? "completed"
				: "locked",
	);
</script>

{#snippet headerExtra()}
	{#if solver.currentStep === 5}
		<PartProgressPill progress={solver.step5Progress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={5}
	badgeText={solver.step5Badge}
	title="Undetermined Coefficients"
	{status}
	{headerExtra}
	summaryLatex={`Particular Solution: $y_p(t) = ${problem.solutions.y_p_latex}$`}
>
	<div class="step-body">
		<!-- Part 5A-1: First Derivative -->
		{#if problem.itsData.step5.firstDerivativeOptions}
			<div
				class="subpart-block"
				class:subpart-done={solver.step5.subSteps.first_deriv.isValid}
			>
				<div class="subpart-header">
					<span class="subpart-badge">Part 5A-1</span>
					<h4 class="subpart-title">
						<MathText text={"Compute First Derivative $y_p'(t)$"} />
					</h4>
					{#if solver.step5.subSteps.first_deriv.isValid}
						<span class="substep-check-badge">
							<span class="check-icon">✓</span> Verified
						</span>
					{/if}
				</div>

				{#if !solver.step5.subSteps.first_deriv.isValid}
					<p class="step-prompt">
						<MathText
							text={`Given the particular ansatz $y_p(t) = ${solver.correctAnsatz}$, select the correct first derivative $y_p'(t)$:`}
						/>
					</p>
					<div class="mcq-cards-grid">
						{#each problem.itsData.step5.firstDerivativeOptions as opt}
							<button
								type="button"
								class="mcq-card"
								class:selected={solver.step5
									.selectedFirstDeriv === opt.id}
								onclick={() => solver.checkStep5FirstDeriv(opt)}
							>
								<MathBlock
									math={opt.latex}
									compact={true}
									hideHeader={true}
								/>
							</button>
						{/each}
					</div>
				{:else}
					<div class="substep-verified-line">
						<MathText
							text={`First Derivative: $${problem.itsData.step5.firstDerivLatex}$`}
						/>
					</div>
				{/if}
			</div>

			<!-- Part 5A-2: Second Derivative (Order >= 2) -->
			{#if solver.step5.subSteps.first_deriv.isValid && problem.params.order >= 2 && problem.itsData.step5.secondDerivativeOptions}
				<div
					class="subpart-block"
					class:subpart-done={solver.step5.subSteps.second_deriv
						.isValid}
				>
					<div class="subpart-header">
						<span class="subpart-badge">Part 5A-2</span>
						<h4 class="subpart-title">
							<MathText
								text={"Compute Second Derivative $y_p''(t)$"}
							/>
						</h4>
						{#if solver.step5.subSteps.second_deriv.isValid}
							<span class="substep-check-badge">
								<span class="check-icon">✓</span> Verified
							</span>
						{/if}
					</div>

					{#if !solver.step5.subSteps.second_deriv.isValid}
						<p class="step-prompt">
							<MathText
								text={"Differentiate once more to obtain the second derivative $y_p''(t)$:"}
							/>
						</p>
						<div class="mcq-cards-grid">
							{#each problem.itsData.step5.secondDerivativeOptions as opt}
								<button
									type="button"
									class="mcq-card"
									class:selected={solver.step5
										.selectedSecondDeriv === opt.id}
									onclick={() =>
										solver.checkStep5SecondDeriv(opt)}
								>
									<MathBlock
										math={opt.latex}
										compact={true}
										hideHeader={true}
									/>
								</button>
							{/each}
						</div>
					{:else}
						<div class="substep-verified-line">
							<MathText
								text={`Second Derivative: $${problem.itsData.step5.secondDerivLatex}$`}
							/>
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Part 5B: System Setup (for sinusoidal forcing) -->
		{#if (problem.params.order === 1 ? solver.step5.subSteps.first_deriv.isValid : solver.step5.subSteps.second_deriv.isValid) && problem.forcing.type === "sinusoid"}
			<div
				class="subpart-block"
				class:subpart-done={solver.step5.subSteps.system_setup.isValid}
			>
				<div class="subpart-header">
					<span class="subpart-badge">Part 5B</span>
					<h4 class="subpart-title">
						<MathText
							text={"Substitute into ODE & Group Harmonic Terms"}
						/>
					</h4>
					{#if solver.step5.subSteps.system_setup.isValid}
						<span class="substep-check-badge">
							<span class="check-icon">✓</span> Verified
						</span>
					{/if}
				</div>

				{#if !solver.step5.subSteps.system_setup.isValid}
					<p class="step-prompt">
						<MathText
							text={problem.params.order === 1
								? `Substitute $y_p, y_p'$ into $${problem.params.a1}y' + ${problem.params.a0}y = ${problem.forcing.latex}$ and equate sine/cosine coefficients:`
								: `Substitute $y_p, y_p', y_p''$ into $${problem.params.a2}y'' + ${problem.params.a1}y' + ${problem.params.a0}y = ${problem.forcing.latex}$ and equate sine/cosine coefficients:`}
						/>
					</p>
					<div class="mcq-cards-grid">
						{#each problem.itsData.step5.systemOptions ?? [] as opt}
							<button
								type="button"
								class="mcq-card"
								class:selected={solver.step5.selectedSystem ===
									opt.id}
								onclick={() => solver.checkStep5System(opt)}
							>
								<MathBlock
									math={opt.latex}
									compact={true}
									hideHeader={true}
								/>
							</button>
						{/each}
					</div>
				{:else}
					<div class="substep-verified-line">
						<MathText
							text={`Linear System: $${problem.itsData.step5.systemLatex}$`}
						/>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Part 5C: Undetermined Coefficients Resolution -->
		{#if (problem.params.order === 1 ? solver.step5.subSteps.first_deriv.isValid : solver.step5.subSteps.second_deriv.isValid) && (problem.forcing.type !== "sinusoid" || solver.step5.subSteps.system_setup.isValid)}
			<div class="subpart-block">
				<div class="subpart-header">
					<span class="subpart-badge">
						{solver.step5CSubpartBadge}
					</span>
					<h4 class="subpart-title">
						<MathText
							text={"Solve for Undetermined Coefficient(s)"}
						/>
					</h4>
				</div>

				<p class="step-prompt">
					<MathText
						text={"Solve the algebraic equation(s) for the undetermined coefficient value(s):"}
					/>
				</p>

				{#if problem.forcing.type === "sinusoid"}
					<div class="input-row-grid">
						<div class="input-pair">
							<label
								for="ode-a-input"
								class="field-label"
							>
								<MathText
									text={String.raw`Coefficient $A$ ($\cos$ term):`}
								/>
							</label>
							<input
								id="ode-a-input"
								type="text"
								class="text-input"
								placeholder="e.g. 1/2"
								bind:value={solver.step5.a}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep5Coeffs()}
							/>
						</div>
						<div class="input-pair">
							<label
								for="ode-b-input"
								class="field-label"
							>
								<MathText
									text={String.raw`Coefficient $B$ ($\sin$ term):`}
								/>
							</label>
							<input
								id="ode-b-input"
								type="text"
								class="text-input"
								placeholder="e.g. -1/4"
								bind:value={solver.step5.b}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep5Coeffs()}
							/>
						</div>
					</div>
				{:else}
					<div
						class="input-pair"
						style="max-width: 260px;"
					>
						<label
							for="ode-kp-input"
							class="field-label"
						>
							<MathText text={"Particular Amplitude $K_p$:"} />
						</label>
						<input
							id="ode-kp-input"
							type="text"
							class="text-input"
							placeholder="e.g. 2"
							bind:value={solver.step5.kp}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep5Coeffs()}
						/>
					</div>
				{/if}

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.checkStep5Coeffs()}
					>
						Check Particular Solution →
					</button>
				</div>
			</div>
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

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.check-icon {
		color: var(--color-success, #10b981);
		font-weight: 800;
	}

	/* ── Subpart blocks ───────────────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.85rem 1rem;
		box-sizing: border-box;
		width: 100%;
	}

	.subpart-block.subpart-done {
		border-color: rgba(16, 185, 129, 0.35);
		background: rgba(16, 185, 129, 0.04);
	}

	.subpart-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.subpart-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
	}

	.subpart-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.substep-check-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-success, #10b981);
		margin-left: auto;
	}

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 600;
	}

	/* ── MCQ Cards ────────────────────────────────────────── */

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

	/* ── Inputs & Actions ─────────────────────────────────── */

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
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}

		.input-row-grid {
			grid-template-columns: 1fr;
		}

		.btn {
			width: 100%;
		}
	}
</style>
