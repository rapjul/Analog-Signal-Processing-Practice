<script lang="ts">
	/**
	 * OdeStep6InitialConditions Svelte 5 Component.
	 *
	 * Step 6: Initial Conditions System & Solved Constants (Multi-Part Step).
	 * Computes effective homogeneous target values $y_h(0+) = y(0+) - y_p(0+)$ and solves the
	 * linear system for arbitrary integration constants ($C_1, C_2$).
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import { toFractionLatex } from "$lib/math-engine/fraction";
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
		solver.currentStep === 6
			? "active"
			: solver.currentStep > 6
				? "completed"
				: "locked",
	);

	const summaryLatex = $derived(
		problem.params.order === 1
			? `Constant: $C_1 = ${toFractionLatex(problem.itsData.step6.expectedC1)}$`
			: `Constants: $C_1 = ${toFractionLatex(problem.itsData.step6.expectedC1)}, \\; C_2 = ${toFractionLatex(problem.itsData.step6.expectedC2 ?? 0)}$`,
	);
</script>

{#snippet headerExtra()}
	{#if solver.currentStep === 6}
		<PartProgressPill progress={solver.step6Progress} />
	{/if}
{/snippet}

<StepCard
	stepNumber={6}
	badgeText={solver.step6Badge}
	title={problem.params.order === 1
		? "Initial Condition & Constant $C_1$"
		: "Initial Conditions & Constants $(C_1, C_2)$"}
	{status}
	{headerExtra}
	{summaryLatex}
>
	<div class="step-body">
		<!-- 1st-Order Step 6: Direct Initial Condition & Constant C_1 -->
		{#if problem.params.order === 1}
			<div class="subpart-block">
				<p class="step-prompt">
					<MathText
						text={String.raw`The complete response satisfies $y(0^+) = y_h(0^+) + y_p(0^+) = ${problem.initialConditions.y0}$. Calculate the integration constant $C_1 = y_h(0^+) = y(0^+) - y_p(0^+)$:`}
					/>
				</p>

				<div class="input-row-grid">
					<div class="input-pair">
						<label
							for="ode-c1-single-input"
							class="field-label"
						>
							<MathText text={"Constant $C_1 = y_h(0^+)$:"} />
						</label>
						<input
							id="ode-c1-single-input"
							type="text"
							class="text-input"
							placeholder="e.g. 2"
							bind:value={solver.step6.yh0}
							onkeydown={(e) =>
								e.key === "Enter" &&
								solver.checkStep6TargetValues()}
						/>
					</div>
				</div>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.checkStep6TargetValues()}
					>
						Check Constant →
					</button>
				</div>
			</div>
		{:else}
			<!-- 2nd-Order Step 6A: Target Homogeneous Initial Values -->
			<div
				class="subpart-block"
				class:subpart-done={solver.step6.subSteps.target_values.isValid}
			>
				<div class="subpart-header">
					<span class="subpart-badge">Part 6A</span>
					<h4 class="subpart-title">
						<MathText
							text={"Compute Target Homogeneous Initial Values"}
						/>
					</h4>
					{#if solver.step6.subSteps.target_values.isValid}
						<span class="substep-check-badge">
							<span class="check-icon">✓</span> Verified
						</span>
					{/if}
				</div>

				{#if !solver.step6.subSteps.target_values.isValid}
					<p class="step-prompt">
						<MathText
							text={String.raw`Subtract the particular solution values from the total initial conditions ($y(0^+) = ${problem.initialConditions.y0}, \quad y'(0^+) = ${problem.initialConditions.dy0}$):`}
						/>
					</p>

					<div class="input-row-grid">
						<div class="input-pair">
							<label
								for="ode-yh0-input"
								class="field-label"
							>
								<MathText
									text={"Target $y_h(0^+) = y(0^+) - y_p(0^+)$:"}
								/>
							</label>
							<input
								id="ode-yh0-input"
								type="text"
								class="text-input"
								placeholder="e.g. 2"
								bind:value={solver.step6.yh0}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep6TargetValues()}
							/>
						</div>
						<div class="input-pair">
							<label
								for="ode-dyh0-input"
								class="field-label"
							>
								<MathText
									text={"Target $y_h'(0^+) = y'(0^+) - y_p'(0^+)$:"}
								/>
							</label>
							<input
								id="ode-dyh0-input"
								type="text"
								class="text-input"
								placeholder="e.g. -3"
								bind:value={solver.step6.dyh0}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep6TargetValues()}
							/>
						</div>
					</div>

					<div class="step-actions">
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => solver.checkStep6TargetValues()}
						>
							Verify Target Values →
						</button>
					</div>
				{:else}
					<div class="substep-verified-line">
						<MathText
							text={`Target Values: $y_h(0^+) = ${toFractionLatex(problem.itsData.step6.targetYh0)}, \\quad y_h'(0^+) = ${toFractionLatex(problem.itsData.step6.targetDYh0 ?? 0)}$`}
						/>
					</div>
				{/if}
			</div>

			<!-- 2nd-Order Part 6B: Integration Constants Resolution -->
			{#if solver.step6.subSteps.target_values.isValid}
				<div class="subpart-block">
					<div class="subpart-header">
						<span class="subpart-badge">Part 6B</span>
						<h4 class="subpart-title">
							<MathText
								text={"Solve for Homogeneous Constants $C_1, C_2$"}
							/>
						</h4>
					</div>

					<p class="step-prompt">
						<MathText
							text={"Solve the linear system satisfying the homogeneous initial condition targets:"}
						/>
					</p>

					{#if problem.itsData.step6.icSystemLatex}
						<div class="ic-system-display">
							<MathBlock
								math={problem.itsData.step6.icSystemLatex}
								compact={true}
								hideHeader={true}
							/>
						</div>
					{/if}

					<div class="input-row-grid">
						<div class="input-pair">
							<label
								for="ode-c1-input"
								class="field-label"
							>
								<MathText text={"Constant $C_1$:"} />
							</label>
							<input
								id="ode-c1-input"
								type="text"
								class="text-input"
								placeholder="e.g. 1"
								bind:value={solver.step6.c1}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep6Constants()}
							/>
						</div>
						<div class="input-pair">
							<label
								for="ode-c2-input"
								class="field-label"
							>
								<MathText text={"Constant $C_2$:"} />
							</label>
							<input
								id="ode-c2-input"
								type="text"
								class="text-input"
								placeholder="e.g. -1/2"
								bind:value={solver.step6.c2}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.checkStep6Constants()}
							/>
						</div>
					</div>

					<div class="step-actions">
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => solver.checkStep6Constants()}
						>
							Check Constants →
						</button>
					</div>
				</div>
			{/if}
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

	.ic-system-display {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 0.75rem;
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
		.input-row-grid {
			grid-template-columns: 1fr;
		}

		.btn {
			width: 100%;
		}
	}
</style>
