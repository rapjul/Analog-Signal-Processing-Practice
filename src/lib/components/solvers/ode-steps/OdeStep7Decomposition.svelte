<script lang="ts">
	/**
	 * OdeStep7Decomposition Svelte 5 Component.
	 *
	 * Step 7: Dual Response Decomposition & Conceptual Mastery (Multi-Part Step).
	 * Guides students sequentially through:
	 * - Zero-Input ($y_{ZI}$) & Zero-State ($y_{ZS}$) Decomposition
	 * - Transient ($y_{tr}$) & Steady-State ($y_{ss}$) Identification
	 * - Targeted Conceptual Mastery Check
	 * - Complete synthesis summary & conceptual takeaways
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
		solver.currentStep === 7
			? "active"
			: solver.currentStep > 7
				? "completed"
				: "locked",
	);
</script>

{#snippet headerExtra()}
	{#if solver.currentStep === 7}
		<PartProgressPill progress={solver.step7Progress} />
	{/if}
{/snippet}

{#snippet summarySnippet()}
	<div class="step-summary-full">
		<div class="summary-row">
			<span class="check-icon">✓</span>
			<span class="summary-heading">Complete Solution:</span>
			<MathText text={`$y(t) = ${problem.solutions.y_complete_latex}$`} />
		</div>
		<div class="summary-decomposition-grid">
			<div class="decomp-card">
				<span class="decomp-title"
					>Zero-Input / Zero-State Decomposition</span
				>
				<div class="decomp-math">
					<MathText
						text={`$y_{ZI}(t) = ${problem.solutions.y_zi_latex}$`}
					/>
				</div>
				<div class="decomp-math">
					<MathText
						text={`$y_{ZS}(t) = ${problem.solutions.y_zs_latex}$`}
					/>
				</div>
			</div>
			<div class="decomp-card">
				<span class="decomp-title"
					>Transient / Steady-State Decomposition</span
				>
				<div class="decomp-math">
					<MathText
						text={`$y_{tr}(t) = ${problem.solutions.y_tr_latex}$`}
					/>
				</div>
				<div class="decomp-math">
					<MathText
						text={`$y_{ss}(t) = ${problem.solutions.y_ss_latex}$`}
					/>
				</div>
			</div>
		</div>
		<div class="concept-takeaway-box">
			<span class="takeaway-label">💡 Key Conceptual Insight:</span>
			<div class="takeaway-text">
				<MathText
					text={problem.itsData.step7.conceptQuestion.explanation}
				/>
			</div>
		</div>
	</div>
{/snippet}

<StepCard
	stepNumber={7}
	badgeText={solver.step7Badge}
	title="Response Decomposition & Conceptual Mastery"
	{status}
	{headerExtra}
	{summarySnippet}
>
	<div class="step-body">
		<!-- Total Solution Synthesis Banner -->
		<div class="synthesis-banner">
			<span class="synthesis-badge">Total Solution Form:</span>
			<div class="synthesis-math">
				<MathBlock
					math={`y(t) = ${problem.solutions.y_complete_latex}`}
					compact={true}
					hideHeader={true}
				/>
			</div>
		</div>

		<!-- Part 7A: Zero-Input (y_ZI) vs Zero-State (y_ZS) Decomposition -->
		<div
			class="subpart-block"
			class:subpart-done={solver.step7.ziZsPassed}
		>
			<div class="subpart-header">
				<span class="subpart-badge">Part 7A</span>
				<h4 class="subpart-title">
					<MathText
						text={"Zero-Input ($y_{ZI}$) & Zero-State ($y_{ZS}$) Decomposition"}
					/>
				</h4>
				{#if solver.step7.ziZsPassed}
					<span class="substep-check-badge">
						<span class="check-icon">✓</span> Verified
					</span>
				{/if}
			</div>

			{#if !solver.step7.ziZsPassed}
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
							<MathText
								text={"Zero-Input Constant $C_{1,ZI}$:"}
							/>
						</label>
						<input
							id="ode-zic1-input"
							type="text"
							class="text-input"
							placeholder="e.g. 1"
							bind:value={solver.step7.ziC1}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep7ZI()}
						/>
					</div>
					{#if problem.params.order === 2}
						<div class="input-pair">
							<label
								for="ode-zic2-input"
								class="field-label"
							>
								<MathText
									text={"Zero-Input Constant $C_{2,ZI}$:"}
								/>
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
			{:else}
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
			{/if}
		</div>

		<!-- Part 7B: Transient (y_tr) vs Steady-State (y_ss) Identification -->
		{#if solver.step7.ziZsPassed}
			<div
				class="subpart-block"
				class:subpart-done={solver.step7.trSsPassed}
			>
				<div class="subpart-header">
					<span class="subpart-badge">Part 7B</span>
					<h4 class="subpart-title">
						<MathText
							text={"Transient ($y_{tr}$) & Steady-State ($y_{ss}$) Identification"}
						/>
					</h4>
					{#if solver.step7.trSsPassed}
						<span class="substep-check-badge">
							<span class="check-icon">✓</span> Verified
						</span>
					{/if}
				</div>

				{#if !solver.step7.trSsPassed}
					<p class="step-prompt">
						<MathText
							text={String.raw`Identify which part is the Transient Response $y_{tr}(t)$ (natural modes decaying as $t \to \infty$) and which is the Steady-State Response $y_{ss}(t)$ (forced component persisting as $t \to \infty$):`}
						/>
					</p>

					<div class="classification-group">
						<span class="classification-step-label">
							<MathText
								text={"1. Select Transient Response $y_{tr}(t)$:"}
							/>
						</span>
						<div class="mcq-cards-grid">
							{#each problem.itsData.step7.transientOptions as option}
								<button
									type="button"
									class="mcq-card"
									class:selected={solver.step7
										.selectedTransient === option.id}
									onclick={() => {
										solver.step7.selectedTransient =
											option.id;
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
								text={"2. Select Steady-State Response $y_{ss}(t)$:"}
							/>
						</span>
						<div class="mcq-cards-grid">
							{#each problem.itsData.step7.steadyStateOptions as option}
								<button
									type="button"
									class="mcq-card"
									class:selected={solver.step7
										.selectedSteadyState === option.id}
									onclick={() => {
										solver.step7.selectedSteadyState =
											option.id;
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
							Verify Transient & Steady-State →
						</button>
					</div>
				{:else}
					<div class="substep-verified-line">
						<div class="verified-item">
							<span class="verified-label">Transient:</span>
							<MathText
								text={`$y_{tr}(t) = ${problem.solutions.y_tr_latex}$`}
							/>
						</div>
						<div class="verified-item">
							<span class="verified-label">Steady-State:</span>
							<MathText
								text={`$y_{ss}(t) = ${problem.solutions.y_ss_latex}$`}
							/>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Part 7C: Targeted Conceptual Mastery Question -->
		{#if solver.step7.trSsPassed}
			<div class="subpart-block">
				<div class="subpart-header">
					<span class="subpart-badge">Part 7C</span>
					<h4 class="subpart-title">
						Targeted Conceptual Mastery Check
					</h4>
				</div>

				<p class="step-prompt">
					<MathText
						text={problem.itsData.step7.conceptQuestion.prompt}
					/>
				</p>

				<div class="concept-options-list">
					{#each problem.itsData.step7.conceptQuestion.options as option}
						<button
							type="button"
							class="concept-option-card"
							class:selected={solver.step7.selectedConcept ===
								option.id}
							onclick={() => {
								solver.step7.selectedConcept = option.id;
								solver.checkStep7Concept(option);
							}}
						>
							<span class="option-radio-indicator">
								{solver.step7.selectedConcept === option.id
									? "●"
									: "○"}
							</span>
							<div class="option-math-content">
								<MathText text={`$${option.latex}$`} />
							</div>
						</button>
					{/each}
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

	/* ── Synthesis banner ─────────────────────────────────── */

	.synthesis-banner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		background: var(--accent-bg-subtle, rgba(6, 182, 212, 0.05));
		border: 1px solid var(--accent-bg, rgba(6, 182, 212, 0.2));
		border-radius: var(--radius-sm, 6px);
	}

	.synthesis-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-primary);
	}

	.synthesis-math {
		width: 100%;
		overflow-x: auto;
	}

	/* ── Subpart blocks ───────────────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		transition: all 0.2s ease;
		box-sizing: border-box;
		width: 100%;
	}

	.subpart-block.subpart-done {
		border-color: var(--color-success, #10b981);
		background: var(--color-success-bg, rgba(16, 185, 129, 0.05));
		padding: 0.6rem 0.85rem;
	}

	.subpart-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.subpart-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		background: var(--surface-3, #223048);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
	}

	.subpart-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
		flex: 1;
	}

	.substep-check-badge {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-success, #10b981);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
	}

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.superposition-note {
		font-size: var(--text-xs);
		color: var(--accent-primary);
		background: var(--accent-bg-subtle, rgba(6, 182, 212, 0.05));
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm, 4px);
		border-left: 2px solid var(--accent-primary);
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

	/* ── Multiple choice cards ────────────────────────────── */

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

	.concept-options-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.concept-option-card {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.9rem 1.2rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
		color: var(--text-primary);
		font-size: var(--text-base, 1rem);
		width: 100%;
		font-family: inherit;
		box-sizing: border-box;
	}

	.concept-option-card:hover {
		border-color: var(--accent-primary);
		background: var(--bg-card-hover);
	}

	.concept-option-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.concept-option-card.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	.option-radio-indicator {
		font-size: 1.25rem;
		color: var(--accent-primary);
		flex-shrink: 0;
	}

	.option-math-content {
		flex: 1;
		font-size: 1.05rem;
		line-height: 1.5;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.option-math-content::-webkit-scrollbar {
		display: none;
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

	/* ── Summary full ─────────────────────────────────────── */

	.step-summary-full {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.summary-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: var(--text-sm);
	}

	.summary-heading {
		font-weight: 700;
		color: var(--text-primary);
	}

	.summary-decomposition-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
	}

	.decomp-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
	}

	.decomp-title {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.2rem;
	}

	.decomp-math {
		font-size: var(--text-sm);
	}

	.concept-takeaway-box {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.75rem;
		background: var(--color-warning-bg, rgba(245, 158, 11, 0.1));
		border: 1px solid var(--color-warning, #f59e0b);
		border-radius: var(--radius-sm, 6px);
	}

	.takeaway-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-warning, #f59e0b);
	}

	.takeaway-text {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		line-height: var(--leading-normal);
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}

		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}

		.summary-decomposition-grid {
			grid-template-columns: 1fr;
		}

		.btn {
			width: 100%;
		}
	}
</style>
