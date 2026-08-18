<script lang="ts">
	/**
	 * OdeStepSolver Svelte 5 Component.
	 *
	 * 7-Step Intelligent Tutoring System (ITS) for Linear Constant-Coefficient ODEs.
	 * Guides students sequentially through characteristic equation formulation, characteristic roots,
	 * homogeneous form selection, particular ansatz guess, undetermined coefficients,
	 * initial conditions system, and ZI/ZS response decomposition.
	 */

	import { toFractionLatex } from "$lib/math-engine/fraction";
	import type { OdeProblem } from "$lib/math-engine/odes";
	import MathBlock from "../math/MathBlock.svelte";
	import MathText from "../math/MathText.svelte";
	import PartProgressPill from "../ui/PartProgressPill.svelte";
	import Progress from "../ui/Progress.svelte";
	import StepFeedback from "../ui/StepFeedback.svelte";
	import { OdeStepSolverState } from "./ode-step-solver.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Callback triggered when all 7 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Reactive step solver controller
	const solver = new OdeStepSolverState(
		() => problem,
		() => onComplete,
	);

	// Reset state when problem instance changes
	let lastProblemId = "";
	$effect(() => {
		if (problem.id !== lastProblemId) {
			lastProblemId = problem.id;
			solver.reset();
		}
	});
</script>

{#snippet feedbackAndHints()}
	<!-- Feedback Alert Message -->
	<StepFeedback {solver} />

	<!-- Progressive Hints Utility -->
	{#if solver.currentStep <= 7}
		<div class="hints-box hint-container">
			<div class="hints-header">
				<button
					type="button"
					class="btn-hint hint-toggle-btn"
					onclick={() => solver.revealNextHint()}
					disabled={solver.hintTier >= solver.activeHints.length}
				>
					💡 {solver.hintTier === 0
						? "Get Hint"
						: solver.hintTier < solver.activeHints.length
							? `Get Next Hint (${solver.hintTier}/${solver.activeHints.length})`
							: `All Hints Revealed (${solver.activeHints.length}/${solver.activeHints.length})`}
				</button>
				{#if solver.hintTier > 0}
					<span class="tier-label">
						{solver.hintTier === 1
							? "Tier 1: Conceptual Nudge"
							: solver.hintTier === 2
								? "Tier 2: Formula Setup"
								: solver.hintTier === 3
									? "Tier 3: Worked Intermediate Step"
									: `Tier ${solver.hintTier}`}
					</span>
				{/if}
			</div>

			{#if solver.hintTier > 0}
				<div class="hints-content">
					{#each solver.activeHints.slice(0, solver.hintTier) as hint, idx}
						<div class="hint-line">
							<span class="hint-badge">Hint {idx + 1}:</span>
							<span class="hint-text">
								<MathText text={hint} />
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="ode-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<!-- Step 1: Characteristic Equation Setup -->
	<div
		class="step-card"
		class:active={solver.currentStep === 1}
		class:done={solver.currentStep > 1}
	>
		<div class="step-header">
			<div class="step-badge">Step 1</div>
			<h3 class="step-title">Characteristic Equation Formulation</h3>
		</div>

		{#if solver.currentStep === 1}
			<div class="step-body">
				<p class="step-prompt">
					<MathText
						text={String.raw`Map differential operators $\frac{d^n}{dt^n} \to s^n$ and set the homogeneous right-hand side to $0$:`}
					/>
				</p>

				<div class="char-eq-interactive-box">
					<div class="coeff-inputs-row">
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
						<span class="preview-label">Live Equation Preview:</span
						>
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
			</div>
			{@render feedbackAndHints()}
		{:else}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={`Characteristic Equation: $Q(s) = ${problem.itsData.step1.latex}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 2: Characteristic Roots & Strategy -->
	<div
		class="step-card"
		class:active={solver.currentStep === 2}
		class:done={solver.currentStep > 2}
		class:locked={solver.currentStep < 2}
	>
		<div class="step-header">
			<div class="step-badge">Step 2</div>
			<h3 class="step-title">Characteristic Polynomial Roots</h3>
		</div>

		{#if solver.currentStep === 2}
			<div class="step-body">
				<p class="step-prompt">
					<MathText
						text={`Characteristic Polynomial: $${problem.itsData.step1.latex}$`}
					/>
				</p>

				<!-- Strategy Gate Selection -->
				<div class="strategy-gate-box">
					<span class="field-label"> Select solving strategy: </span>
					<div class="strategy-button-group">
						<button
							type="button"
							class="strategy-pill-btn"
							class:active={solver.step2.strategy === "factoring"}
							onclick={() => {
								solver.step2.strategy = "factoring";
								solver.clearFeedback();
							}}
						>
							<span class="strategy-icon">🔍</span>
							<span>Factoring by inspection</span>
						</button>
						<button
							type="button"
							class="strategy-pill-btn"
							class:active={solver.step2.strategy === "quadratic"}
							onclick={() => {
								solver.step2.strategy = "quadratic";
								solver.clearFeedback();
							}}
						>
							<span class="strategy-icon">📐</span>
							<span>Quadratic formula / Square root</span>
						</button>
					</div>
				</div>

				{#if solver.step2.strategy === null}
					<div class="strategy-unselected-prompt">
						<p class="strategy-helper-text">
							Select whether to factor the polynomial directly or
							apply the quadratic formula.
						</p>
					</div>
				{:else if solver.step2.strategy === "factoring"}
					<!-- Factoring Path -->
					{#if problem.itsData.step2.rootType === "repeated_real"}
						<div
							class="input-pair"
							style="max-width: 260px;"
						>
							<label
								for="ode-r-rep-input"
								class="field-label"
							>
								<MathText
									text={"Repeated Root $r = r_1 = r_2$:"}
								/>
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
										e.key === "Enter" &&
										solver.checkStep2()}
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
										e.key === "Enter" &&
										solver.checkStep2()}
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
									class:active={solver.step2
										.quadClassChoice === "distinct_real"}
									disabled={solver.step2
										.quadNeedsDiscriminantCalc}
									onclick={() =>
										solver.selectQuadRootClassification(
											"distinct_real",
										)}
								>
									<MathText
										text={"Distinct Real ($Delta > 0$)"}
									/>
								</button>
								<button
									type="button"
									class="quad-class-btn"
									class:active={solver.step2
										.quadClassChoice === "repeated_real"}
									disabled={solver.step2
										.quadNeedsDiscriminantCalc}
									onclick={() =>
										solver.selectQuadRootClassification(
											"repeated_real",
										)}
								>
									<MathText
										text={"Repeated Real ($Delta = 0$)"}
									/>
								</button>
								<button
									type="button"
									class="quad-class-btn"
									class:active={solver.step2
										.quadClassChoice ===
										"complex_conjugate"}
									disabled={solver.step2
										.quadNeedsDiscriminantCalc}
									onclick={() =>
										solver.selectQuadRootClassification(
											"complex_conjugate",
										)}
								>
									<MathText
										text={"Complex Conjugate ($Delta < 0$)"}
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
										bind:value={
											solver.step2.quadDiscriminantInput
										}
										onkeydown={(e) =>
											e.key === "Enter" &&
											solver.verifyDiscriminant()}
									/>
									<button
										type="button"
										class="btn btn-secondary btn-verify-disc"
										onclick={() =>
											solver.verifyDiscriminant()}
									>
										<MathText text={"Verify $Delta$"} />
									</button>
								</div>

								{#if solver.step2.quadDiscriminantVerified}
									<span class="disc-verified-badge">
										<span class="check-icon">✓</span>
										<MathText
											text={solver.step2
												.quadClassChoice ===
											"complex_conjugate"
												? String.raw`$\Delta = ${problem.itsData.step2.discriminant} < 0$ (Complex Roots)`
												: solver.step2
															.quadClassChoice ===
													  "repeated_real"
													? String.raw`$\Delta = 0$ (Repeated Real Root)`
													: String.raw`$\Delta = ${problem.itsData.step2.discriminant} > 0$ (Distinct Real Roots)`}
										/>
									</span>
								{/if}
							</div>
						</div>

						<!-- Dynamic Roots Input Form (revealed when classification is resolved) -->
						{#if solver.step2.quadClassChoice !== null}
							<div class="quad-roots-entry-box">
								<span class="classification-step-label">
									2. Evaluate the characteristic roots:
								</span>

								{#if solver.step2.quadClassChoice === "complex_conjugate"}
									<div class="input-row-grid">
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
												class="text-input"
												placeholder="e.g. -1"
												bind:value={solver.step2.sigma}
												onkeydown={(e) =>
													e.key === "Enter" &&
													solver.checkStep2()}
											/>
										</div>
										<div class="input-pair">
											<label
												for="ode-omega-input"
												class="field-label"
											>
												<MathText
													text={"Imaginary Part $\\omega_d$:"}
												/>
											</label>
											<input
												id="ode-omega-input"
												type="text"
												class="text-input"
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
												<MathText
													text={"Root $r_1$:"}
												/>
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
												<MathText
													text={"Root $r_2$:"}
												/>
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
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 2}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Roots:
					<MathText
						text={`$${problem.itsData.step2.symbolicRootsLatex}$`}
					/>
				</span>
				{#if solver.step2.strategy === "quadratic" && problem.itsData.step2.isFactorable && problem.itsData.step2.factoredFormLatex}
					<span class="shortcut-tip-note">
						<MathText
							text={`(Factoring shortcut: $${problem.itsData.step2.factoredFormLatex}$)`}
						/>
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Step 3: Homogeneous Form Selection -->
	<div
		class="step-card"
		class:active={solver.currentStep === 3}
		class:done={solver.currentStep > 3}
		class:locked={solver.currentStep < 3}
	>
		<div class="step-header">
			<div class="step-badge">Step 3</div>
			<h3 class="step-title">Homogeneous Form Template</h3>
		</div>

		{#if solver.currentStep === 3}
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
						class:selected={solver.step3.selected ===
							"distinct_real"}
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
						class:selected={solver.step3.selected ===
							"repeated_real"}
						onclick={() => solver.checkStep3("repeated_real")}
					>
						<strong>Repeated Real Roots</strong>
						<span class="choice-sub">
							<MathText
								text={String.raw`$(C_1 + C_2 t) e^{r t}$`}
							/>
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step3.selected ===
							"complex_conjugate"}
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
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 3}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={`Homogeneous Form: $${problem.itsData.step3.formLatex}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 4: Particular Solution Ansatz Guess -->
	<div
		class="step-card"
		class:active={solver.currentStep === 4}
		class:done={solver.currentStep > 4}
		class:locked={solver.currentStep < 4}
	>
		<div class="step-header">
			<div class="step-badge">Step 4</div>
			<h3 class="step-title">Particular Solution Ansatz Form</h3>
		</div>

		{#if solver.currentStep === 4}
			<div class="step-body">
				<p class="step-prompt">
					<MathText
						text={`Given forcing input $x(t) = ${problem.forcing.latex}$, select the trial particular solution $y_p(t)$:`}
					/>
				</p>
				<div class="mcq-cards-grid">
					{#each problem.itsData.step4.options as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={solver.step4.selected === opt.id}
							onclick={() => solver.checkStep4(opt)}
						>
							<MathBlock
								math={opt.latex}
								compact={true}
								hideHeader={true}
							/>
						</button>
					{/each}
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 4}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={`Particular Ansatz: $${solver.correctAnsatz}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 5: Solve Particular Coefficients (Multi-Part Step) -->
	<div
		class="step-card"
		class:active={solver.currentStep === 5}
		class:done={solver.currentStep > 5}
		class:locked={solver.currentStep < 5}
	>
		<div class="step-header">
			<div class="step-badge">
				{solver.step5Badge}
			</div>
			<h3 class="step-title">Undetermined Coefficients</h3>
			{#if solver.currentStep === 5}
				<PartProgressPill progress={solver.step5Progress} />
			{/if}
		</div>

		{#if solver.currentStep === 5}
			<div class="step-body">
				<!-- Part 5A-1: First Derivative -->
				{#if problem.itsData.step5.firstDerivativeOptions}
					<div
						class="subpart-block"
						class:subpart-done={solver.step5.subSteps.first_deriv
							.isValid}
					>
						<div class="subpart-header">
							<span class="subpart-badge">Part 5A-1</span>
							<h4 class="subpart-title">
								<MathText
									text={"Compute First Derivative $y_p'(t)$"}
								/>
							</h4>
							{#if solver.step5.subSteps.first_deriv.isValid}
								<span class="substep-check-badge"
									><span class="check-icon">✓</span> Verified</span
								>
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
										onclick={() =>
											solver.checkStep5FirstDeriv(opt)}
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
							class:subpart-done={solver.step5.subSteps
								.second_deriv.isValid}
						>
							<div class="subpart-header">
								<span class="subpart-badge">Part 5A-2</span>
								<h4 class="subpart-title">
									<MathText
										text={"Compute Second Derivative $y_p''(t)$"}
									/>
								</h4>
								{#if solver.step5.subSteps.second_deriv.isValid}
									<span class="substep-check-badge"
										><span class="check-icon">✓</span>
										Verified</span
									>
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
												solver.checkStep5SecondDeriv(
													opt,
												)}
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
				{#if solver.step5.subSteps.second_deriv.isValid && problem.forcing.type === "sinusoid"}
					<div
						class="subpart-block"
						class:subpart-done={solver.step5.subSteps.system_setup
							.isValid}
					>
						<div class="subpart-header">
							<span class="subpart-badge">Part 5B</span>
							<h4 class="subpart-title">
								<MathText
									text={"Substitute into ODE & Group Harmonic Terms"}
								/>
							</h4>
							{#if solver.step5.subSteps.system_setup.isValid}
								<span class="substep-check-badge"
									><span class="check-icon">✓</span>
									Verified</span
								>
							{/if}
						</div>

						{#if !solver.step5.subSteps.system_setup.isValid}
							<p class="step-prompt">
								<MathText
									text={`Substitute $y_p, y_p', y_p''$ into $y'' + ${problem.params.a1}y' + ${problem.params.a0}y = ${problem.forcing.latex}$ and equate sine/cosine coefficients:`}
								/>
							</p>
							<div class="mcq-cards-grid">
								{#each problem.itsData.step5.systemOptions ?? [] as opt}
									<button
										type="button"
										class="mcq-card"
										class:selected={solver.step5
											.selectedSystem === opt.id}
										onclick={() =>
											solver.checkStep5System(opt)}
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
				{#if solver.step5.subSteps.second_deriv.isValid && (problem.forcing.type !== "sinusoid" || solver.step5.subSteps.system_setup.isValid)}
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
									<MathText
										text={"Particular Amplitude $K_p$:"}
									/>
								</label>
								<input
									id="ode-kp-input"
									type="text"
									class="text-input"
									placeholder="e.g. 2"
									bind:value={solver.step5.kp}
									onkeydown={(e) =>
										e.key === "Enter" &&
										solver.checkStep5Coeffs()}
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
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 5}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={`Particular Solution: $y_p(t) = ${problem.solutions.y_p_latex}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 6: Initial Conditions System & Solved Constants (Multi-Part Step) -->
	<div
		class="step-card"
		class:active={solver.currentStep === 6}
		class:done={solver.currentStep > 6}
		class:locked={solver.currentStep < 6}
	>
		<div class="step-header">
			<div class="step-badge">
				{solver.step6Badge}
			</div>
			<h3 class="step-title">
				<MathText
					text={"Initial Conditions & Constants $(C_1, C_2)$"}
				/>
			</h3>
			{#if solver.currentStep === 6}
				<PartProgressPill progress={solver.step6Progress} />
			{/if}
		</div>

		{#if solver.currentStep === 6}
			<div class="step-body">
				<!-- Part 6A: Target Initial Values -->
				<div
					class="subpart-block"
					class:subpart-done={solver.step6.subSteps.target_values
						.isValid}
				>
					<div class="subpart-header">
						<span class="subpart-badge">Part 6A</span>
						<h4 class="subpart-title">
							<MathText
								text={"Compute Target Homogeneous Values $y_h(0^+)$ & $y_h'(0^+)$"}
							/>
						</h4>
						{#if solver.step6.subSteps.target_values.isValid}
							<span class="substep-check-badge"
								><span class="check-icon">✓</span> Verified</span
							>
						{/if}
					</div>

					{#if !solver.step6.subSteps.target_values.isValid}
						<p class="step-prompt">
							<MathText
								text={String.raw`Subtract the particular solution offsets $y_p(0^+) = ${toFractionLatex(problem.itsData.step6.yp0)}$ and $y_p'(0^+) = ${toFractionLatex(problem.itsData.step6.dyp0)}$ from initial conditions $y(0^-) = ${problem.initialConditions.y0}, \; y'(0^-) = ${problem.initialConditions.dy0}$:`}
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
								text={`Target Values: $y_h(0^+) = ${toFractionLatex(problem.itsData.step6.targetYh0)}, \\quad y_h'(0^+) = ${toFractionLatex(problem.itsData.step6.targetDYh0)}$`}
							/>
						</div>
					{/if}
				</div>

				<!-- Part 6B: Integration Constants Resolution -->
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
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 6}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={`Constants: $C_1 = ${toFractionLatex(problem.itsData.step6.expectedC1)}, \\; C_2 = ${toFractionLatex(problem.itsData.step6.expectedC2)}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 7: Dual Response Decomposition & Conceptual Mastery (Multi-Part Step) -->
	<div
		class="step-card"
		class:active={solver.currentStep === 7}
		class:done={solver.currentStep > 7}
		class:locked={solver.currentStep < 7}
	>
		<div class="step-header">
			<div class="step-badge">
				{solver.step7Badge}
			</div>
			<h3 class="step-title">
				Response Decomposition & Conceptual Mastery
			</h3>
			{#if solver.currentStep === 7}
				<PartProgressPill progress={solver.step7Progress} />
			{/if}
		</div>

		{#if solver.currentStep === 7}
			<div class="step-body">
				<!-- Total Solution Synthesis Card -->
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
							<span class="substep-check-badge"
								><span class="check-icon">✓</span> Verified</span
							>
						{/if}
					</div>

					{#if !solver.step7.ziZsPassed}
						<p class="step-prompt">
							<MathText
								text={String.raw`Find the Zero-Input response $y_{ZI}(t)$ by setting forcing $x(t) = 0$ and solving for constants matching the original initial conditions $y(0^-) = ${problem.initialConditions.y0}, \quad y'(0^-) = ${problem.initialConditions.dy0}$:`}
							/>
						</p>

						<!-- Zero-Input Initial Conditions System Display -->
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
										e.key === "Enter" &&
										solver.checkStep7ZI()}
								/>
							</div>
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
										e.key === "Enter" &&
										solver.checkStep7ZI()}
								/>
							</div>
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
									text={`Superposition Identity: $C_{1,ZS} = C_1 - C_{1,ZI} = ${solver.derivedZSC1}, \\quad C_{2,ZS} = C_2 - C_{2,ZI} = ${solver.derivedZSC2}$`}
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
								<span class="substep-check-badge"
									><span class="check-icon">✓</span>
									Verified</span
								>
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
												.selectedTransient ===
												option.id}
											onclick={() => {
												solver.step7.selectedTransient =
													option.id;
												solver.clearFeedback();
											}}
										>
											<MathText
												text={`$${option.latex}$`}
											/>
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
												.selectedSteadyState ===
												option.id}
											onclick={() => {
												solver.step7.selectedSteadyState =
													option.id;
												solver.clearFeedback();
											}}
										>
											<MathText
												text={`$${option.latex}$`}
											/>
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
									<span class="verified-label"
										>Transient:</span
									>
									<MathText
										text={`$y_{tr}(t) = ${problem.solutions.y_tr_latex}$`}
									/>
								</div>
								<div class="verified-item">
									<span class="verified-label"
										>Steady-State:</span
									>
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
								text={problem.itsData.step7.conceptQuestion
									.prompt}
							/>
						</p>

						<div class="concept-options-list">
							{#each problem.itsData.step7.conceptQuestion.options as option}
								<button
									type="button"
									class="concept-option-card"
									class:selected={solver.step7
										.selectedConcept === option.id}
									onclick={() => {
										solver.step7.selectedConcept =
											option.id;
										solver.checkStep7Concept(option);
									}}
								>
									<span class="option-radio-indicator">
										{solver.step7.selectedConcept ===
										option.id
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
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 7}
			<div class="step-summary-full">
				<div class="summary-row">
					<span class="check-icon">✓</span>
					<span class="summary-heading">Complete Solution:</span>
					<MathText
						text={`$y(t) = ${problem.solutions.y_complete_latex}$`}
					/>
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
					<span class="takeaway-label"
						>💡 Key Conceptual Insight:</span
					>
					<div class="takeaway-text">
						<MathText
							text={problem.itsData.step7.conceptQuestion
								.explanation}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.ode-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	/* ── Step card ─────────────────────────────────────────── */

	.step-card {
		container-type: inline-size;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: all 0.2s ease;
	}

	/* Active — accent primary border + glow */
	.step-card.active {
		border-color: var(--accent-primary);
		box-shadow: 0 2px 12px var(--accent-glow);
	}

	/* Done — subtle emerald border and background */
	.step-card.done {
		border-color: var(--color-success);
		background: var(--color-success-bg);
		padding: 0.75rem 1.25rem;
	}

	/* Locked — dimmed opacity */
	.step-card.locked {
		opacity: 0.65;
	}

	.step-card.locked .step-badge {
		background: var(--white-10);
		color: var(--text-secondary);
	}

	/* ── Step card header ──────────────────────────────────── */

	.step-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.step-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}

	.step-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Step body & prompt ────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.step-summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.shortcut-tip-note {
		font-size: var(--text-xs);
		color: var(--accent-primary);
		opacity: 0.9;
	}

	.check-icon {
		color: var(--color-success);
		font-weight: 800;
	}

	/* ── Step 1: Characteristic equation interactive box ────── */

	.char-eq-interactive-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.85rem 1rem;
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

	/* ── Input pairs & grid layout ─────────────────────────── */

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
	}

	.field-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
	}

	.text-input:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Multiple choice button grid ───────────────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.choice-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		cursor: pointer;
		color: var(--text-primary);
		text-align: left;
		transition: all 0.15s ease;
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

	/* ── Multiple choice math cards ────────────────────────── */

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.mcq-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.9rem 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		color: var(--text-primary);
		font-size: var(--text-lg, 1.125rem);
		width: 100%;
	}

	.mcq-card :global(.math-block) {
		margin: 0;
		background: transparent;
		border: none;
		box-shadow: none;
		width: 100%;
	}

	.mcq-card :global(.math-block-content) {
		padding: 0.25rem 0.5rem;
	}

	.mcq-card :global(.katex) {
		font-size: 1.15em;
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

	/* ── Step actions & buttons ────────────────────────────── */

	.step-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast);
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.5rem 1rem;
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary:hover {
		background: var(--accent-hover);
	}

	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Tiered hints disclosure ───────────────────────────── */

	.hints-box {
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.hints-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-hint {
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning);
		color: var(--color-warning);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-hint:hover:not(:disabled) {
		background: var(--color-warning-bg);
		filter: brightness(1.15);
	}

	.btn-hint:focus-visible {
		outline: 2px solid var(--color-warning);
		outline-offset: 2px;
	}

	.btn-hint:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tier-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.hints-content {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--border-color);
	}

	.hint-line {
		display: flex;
		gap: 0.5rem;
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
	}

	.hint-badge {
		font-weight: 700;
		color: var(--color-warning);
		white-space: nowrap;
	}

	.hint-text {
		color: var(--text-secondary);
	}

	/* ── Step 2: Root strategy & quadratic setup ───────────── */

	.strategy-gate-box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
	}

	.strategy-button-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.strategy-pill-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.85rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.strategy-pill-btn:hover {
		border-color: var(--accent-primary);
		color: var(--text-primary);
	}

	.strategy-pill-btn.active {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
		color: var(--accent-primary);
		font-weight: 700;
	}

	.strategy-pill-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.strategy-icon {
		font-size: var(--text-sm);
	}

	.strategy-unselected-prompt {
		padding: 0.5rem 0.25rem;
	}

	.strategy-helper-text {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
		font-style: italic;
	}

	.quadratic-setup-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.quad-formula-prompt {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
	}

	.quad-classification-box {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
	}

	.classification-step-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
	}

	.classification-button-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.quad-class-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.8rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quad-class-btn:hover:not(:disabled) {
		border-color: var(--accent-primary);
		color: var(--text-primary);
	}

	.quad-class-btn.active {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
		color: var(--accent-primary);
		font-weight: 700;
	}

	.quad-class-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quad-class-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.disc-calc-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border-color);
		transition: all 0.2s ease;
	}

	.disc-calc-row.disc-remediation-required {
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-warning);
		background: var(--color-warning-bg);
	}

	.disc-field-label {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.disc-input-with-action {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.disc-input {
		max-width: 100px;
	}

	.btn-verify-disc {
		padding: 0.35rem 0.65rem;
		font-size: var(--text-xs);
		white-space: nowrap;
	}

	.btn-verify-disc:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.disc-verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-success);
	}

	.quad-roots-entry-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-card);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
	}

	/* ── Step 7: Subphase decomposition & classification ───── */

	.synthesis-banner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		background: var(--accent-bg-subtle);
		border: 1px solid var(--accent-bg);
		border-radius: var(--radius-sm);
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

	/* ── Subpart block styles ────────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.subpart-block.subpart-done {
		border-color: var(--color-success);
		background: var(--color-success-bg);
		padding: 0.6rem 0.85rem;
	}

	.subpart-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.subpart-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		background: var(--surface-3, #223048);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
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
		color: var(--color-success);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
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
		background: var(--accent-bg-subtle);
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm);
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

	.classification-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
		color: var(--text-primary);
		font-size: var(--text-base, 1rem);
		width: 100%;
	}

	.concept-option-card :global(.katex) {
		font-size: 1.15em;
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

	.ic-system-display {
		margin: 0.5rem 0;
		padding: 0.5rem;
		background: var(--bg-card);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
	}

	/* ── Complete solution summary & conceptual takeaway ───── */

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
		border-radius: var(--radius-sm);
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
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-sm);
	}

	.takeaway-label {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-warning);
	}

	.takeaway-text {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		line-height: var(--leading-normal);
	}

	/* ── Container queries (≤620px) ────────────────────────── */

	@container (max-width: 620px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.summary-decomposition-grid {
			grid-template-columns: 1fr;
		}

		.subpart-block {
			padding: 0.65rem;
		}

		.concept-option-card {
			padding: 0.5rem 0.65rem;
		}
	}

	/* ── Mobile media query (≤640px) ─────────────────────── */

	@media (max-width: 640px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
