<script lang="ts">
	/**
	 * OdeStep2Roots Svelte 5 Component.
	 *
	 * Step 2: Characteristic Roots & Strategy State Machine.
	 *
	 * Guides students through strategy gate (factoring vs quadratic formula),
	 * root classification, remedial discriminant calculation, and root verification.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 2
			? "active"
			: solver.currentStep > 2
				? "completed"
				: "locked",
	);
</script>

{#snippet summarySnippet()}
	<span>
		Roots:
		<MathText text={`$${problem.itsData.step2.symbolicRootsLatex}$`} />
	</span>
	{#if solver.step2.strategy === "quadratic" && "isFactorable" in problem.itsData.step2 && problem.itsData.step2.isFactorable && problem.itsData.step2.factoredFormLatex}
		<span class="shortcut-tip-note">
			<MathText
				text={`(Factoring shortcut: $${problem.itsData.step2.factoredFormLatex}$)`}
			/>
		</span>
	{/if}
{/snippet}

<StepCard
	stepNumber={2}
	title="Characteristic Polynomial Roots"
	{status}
	{summarySnippet}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={`Characteristic Polynomial: $${problem.itsData.step1.latex}$`}
			/>
		</p>

		<!-- Strategy selection only applies to quadratic equations. -->
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
					Select whether to factor the polynomial directly or apply
					the quadratic formula.
				</p>
			</div>
		{:else if solver.step2.strategy === "factoring"}
			<!-- Factoring Path -->
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
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep2()}
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
						onkeydown={(e) =>
							e.key === "Enter" && solver.checkStep2()}
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
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
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
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep2()}
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
		{:else if solver.step2.strategy === "quadratic"}
			<!-- Quadratic Formula Setup Path -->
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
							class:active={solver.step2.quadClassChoice ===
								"distinct_real"}
							disabled={solver.step2.quadNeedsDiscriminantCalc}
							onclick={() =>
								solver.selectQuadRootClassification(
									"distinct_real",
								)}
						>
							<MathText
								text={String.raw`Distinct Real ($\Delta > 0$)`}
							/>
						</button>
						<button
							type="button"
							class="quad-class-btn"
							class:active={solver.step2.quadClassChoice ===
								"repeated_real"}
							disabled={solver.step2.quadNeedsDiscriminantCalc}
							onclick={() =>
								solver.selectQuadRootClassification(
									"repeated_real",
								)}
						>
							<MathText
								text={String.raw`Repeated Real ($\Delta = 0$)`}
							/>
						</button>
						<button
							type="button"
							class="quad-class-btn"
							class:active={solver.step2.quadClassChoice ===
								"complex_conjugate"}
							disabled={solver.step2.quadNeedsDiscriminantCalc}
							onclick={() =>
								solver.selectQuadRootClassification(
									"complex_conjugate",
								)}
						>
							<MathText
								text={String.raw`Complex Conjugate ($\Delta < 0$)`}
							/>
						</button>
					</div>

					<!-- Discriminant Calculation Row (Helper or Remediation) -->
					<div
						class="disc-calc-row"
						class:disc-remediation-required={solver.step2
							.quadNeedsDiscriminantCalc}
					>
						<label
							for="ode-disc-input"
							class="disc-field-label"
						>
							<MathText
								text={String.raw`Calculate $\Delta = b^2 - 4ac$:`}
							/>
						</label>
						<div class="disc-input-with-action">
							<input
								id="ode-disc-input"
								type="text"
								class="text-input disc-input"
								placeholder="e.g. -36"
								bind:value={solver.step2.quadDiscriminantInput}
								onkeydown={(e) =>
									e.key === "Enter" &&
									solver.verifyDiscriminant()}
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
										text={solver.step2.quadClassChoice ===
										"complex_conjugate"
											? String.raw`$\Delta = ${problem.itsData.step2.discriminant} < 0$ (Complex Roots)`
											: solver.step2.quadClassChoice ===
												  "repeated_real"
												? String.raw`$\Delta = 0$ (Repeated Real Root)`
												: String.raw`$\Delta = ${problem.itsData.step2.discriminant} > 0$ (Distinct Real Roots)`}
									/>
								</span>
							{/if}
						</div>
					</div>
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
										<MathText
											text={"Real Part $\\sigma$:"}
										/>
									</label>
									<input
										id="ode-sigma-input"
										type="text"
										class="solver-input"
										placeholder="e.g. -2"
										bind:value={solver.step2.sigma}
										onkeydown={(e) =>
											e.key === "Enter" &&
											solver.checkStep2()}
									/>
								</div>
								<div class="input-pair">
									<label
										for="ode-omegad-input"
										class="field-label"
									>
										<MathText
											text={"Damped Frequency $\\omega_d$:"}
										/>
									</label>
									<input
										id="ode-omegad-input"
										type="text"
										class="solver-input"
										placeholder="e.g. 3"
										bind:value={solver.step2.omegaD}
										onkeydown={(e) =>
											e.key === "Enter" &&
											solver.checkStep2()}
									/>
								</div>
							</div>
							<div class="preview-equation-box">
								<span class="preview-label">
									Live Roots Preview:
								</span>
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
											e.key === "Enter" &&
											solver.checkStep2()}
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
											e.key === "Enter" &&
											solver.checkStep2()}
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
									<MathText
										text={"Repeated Root $r = r_1 = r_2$:"}
									/>
								</label>
								<input
									id="ode-quad-r-rep-input"
									type="text"
									class="text-input"
									placeholder="e.g. -2"
									bind:value={solver.step2.r1}
									onkeydown={(e) =>
										e.key === "Enter" &&
										solver.checkStep2()}
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

	.shortcut-tip-note {
		font-size: var(--text-xs);
		color: var(--accent-primary);
		opacity: 0.9;
	}

	.check-icon {
		color: var(--color-success, #10b981);
		font-weight: 800;
	}

	/* ── Strategy gate ────────────────────────────────────── */

	.strategy-gate-box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.75rem 1rem;
		box-sizing: border-box;
		width: 100%;
	}

	.strategy-button-group {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.strategy-pill-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.9rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: 9999px;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.strategy-pill-btn:hover {
		border-color: var(--accent-primary);
		color: var(--text-primary);
	}

	.strategy-pill-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.strategy-pill-btn.active {
		background: var(--accent-bg);
		border-color: var(--accent-primary);
		color: var(--accent-primary);
	}

	.strategy-unselected-prompt {
		padding: 0.75rem 1rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm, 6px);
		border-left: 3px solid var(--accent-primary);
	}

	.strategy-helper-text {
		margin: 0;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	/* ── Quadratic formula container ──────────────────────── */

	.quadratic-setup-container {
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

	.quad-formula-prompt {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		margin: 0;
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

	.quad-classification-box {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
	}

	.classification-step-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-primary);
	}

	.classification-button-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.quad-class-btn {
		flex: 1;
		min-width: 160px;
		padding: 0.55rem 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		color: var(--text-primary);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.quad-class-btn:hover:not(:disabled) {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.quad-class-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.quad-class-btn.active {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
		color: var(--accent-primary);
	}

	.quad-class-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Discriminant row ─────────────────────────────────── */

	.disc-calc-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
	}

	.disc-calc-row.disc-remediation-required {
		border-color: var(--color-warning, #f59e0b);
		background: rgba(245, 158, 11, 0.08);
	}

	.disc-field-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.disc-input-with-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.disc-input {
		max-width: 140px;
		text-align: center;
		font-family: var(--font-mono, monospace);
		font-weight: 600;
	}

	.btn-verify-disc {
		padding: 0.45rem 0.85rem;
		font-size: var(--text-xs);
		font-weight: 600;
		border-radius: var(--radius-sm, 6px);
		background: var(--accent-primary);
		color: var(--text-on-accent, #000);
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	.btn-verify-disc:hover {
		filter: brightness(1.1);
	}

	.btn-verify-disc:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.disc-verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-success, #10b981);
	}

	.quad-roots-entry-box {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.65rem 0.85rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
	}

	/* ── Inputs & Grid layout ─────────────────────────────── */

	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.input-row-horizontal {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
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

	.text-input,
	.solver-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
		box-sizing: border-box;
		width: 100%;
	}

	.text-input:focus-visible,
	.solver-input:focus-visible {
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

		.classification-button-group {
			flex-direction: column;
		}

		.disc-input-with-action {
			flex-direction: column;
			align-items: stretch;
		}

		.disc-input {
			max-width: 100%;
		}

		.btn,
		.btn-verify-disc {
			width: 100%;
		}
	}
</style>
