<script lang="ts">
	/**
	 * OdeStepSolver Svelte 5 Component.
	 * 7-Step Intelligent Tutoring System (ITS) for Linear Constant-Coefficient ODEs.
	 * Guides students sequentially through characteristic equation formulation, characteristic roots,
	 * homogeneous form selection, particular ansatz guess, undetermined coefficients,
	 * initial conditions system, and ZI/ZS response decomposition.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import { toFractionLatex } from "$lib/math-engine/fraction";
	import type { OdeProblem } from "$lib/math-engine/odes";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "../math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import OdeResponseInput from "../math/OdeResponseInput.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Progress from "../ui/Progress.svelte";
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
	{#if solver.currentFeedback}
		<div class="feedback-alert error-box" role="alert">
			<span class="alert-icon">⚠️</span>
			<div class="alert-content">
				<strong>Misconception Detected:</strong>
				<p class="alert-text">
					<MathText text={solver.currentFeedback} />
				</p>
			</div>
		</div>
	{/if}

	<!-- Progressive Hints Utility -->
	{#if solver.currentStep <= 7}
		<div class="hints-box hint-container">
			<div class="hints-header">
				<button
					type="button"
					class="btn-hint hint-toggle-btn"
					onclick={() => solver.revealNextHint()}
					disabled={solver.hintTier >= 3}
				>
					💡 {solver.hintTier === 0
						? "Get Hint"
						: solver.hintTier < 3
							? `Get Next Hint (${solver.hintTier}/3)`
							: "All Hints Revealed (3/3)"}
				</button>
				{#if solver.hintTier > 0}
					<span class="tier-label">
						{solver.hintTier === 1
							? "Tier 1: Conceptual Nudge"
							: solver.hintTier === 2
								? "Tier 2: Formula Setup"
								: "Tier 3: Worked Intermediate Step"}
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
	<Progress currentStep={solver.currentStep} totalSteps={solver.totalSteps} />

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
					Map differential operators <MathInline
						math={"\\frac{d^n}{dt^n} \\to s^n"}
					/> and set the homogeneous right-hand side to <MathInline
						math={"0"}
					/>:
				</p>

				<div class="char-eq-interactive-box">
					<div class="coeff-inputs-row">
						<div class="coeff-group">
							<label for="ode-a2-input" class="coeff-label">
								<MathInline math={"s^2"} /> Coeff (<MathInline
									math={"a_2"}
								/>):
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
							<label for="ode-a1-input" class="coeff-label">
								<MathInline math={"s"} /> Coeff (<MathInline
									math={"a_1"}
								/>):
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
							<label for="ode-a0-input" class="coeff-label">
								Constant (<MathInline math={"a_0"} />):
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
					Characteristic Equation: <MathInline
						math={`Q(s) = ${problem.itsData.step1.latex}`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 2: Characteristic Roots -->
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
					Solve the characteristic polynomial <MathInline
						math={problem.itsData.step1.latex}
					/> for its roots:
				</p>

				{#if problem.params.rootType === "distinct_real"}
					<div class="input-row-grid">
						<div class="input-pair">
							<label for="ode-r1-input" class="field-label">
								Root <MathInline math={"r_1"} />:
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
							<label for="ode-r2-input" class="field-label">
								Root <MathInline math={"r_2"} />:
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
				{:else if problem.params.rootType === "repeated_real"}
					<div class="input-pair" style="max-width: 260px;">
						<label for="ode-r-rep-input" class="field-label">
							Repeated Root <MathInline math={"r = r_1 = r_2"} />:
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
				{:else if problem.params.rootType === "complex_conjugate"}
					<div class="input-row-grid">
						<div class="input-pair">
							<label for="ode-sigma-input" class="field-label">
								Real Part <MathInline math={"\\sigma"} />:
							</label>
							<input
								id="ode-sigma-input"
								type="text"
								class="text-input"
								placeholder="e.g. -1"
								bind:value={solver.step2.sigma}
								onkeydown={(e) =>
									e.key === "Enter" && solver.checkStep2()}
							/>
						</div>
						<div class="input-pair">
							<label for="ode-omega-input" class="field-label">
								Imaginary Part <MathInline
									math={"\\omega_d"}
								/>:
							</label>
							<input
								id="ode-omega-input"
								type="text"
								class="text-input"
								placeholder="e.g. 2"
								bind:value={solver.step2.omegaD}
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
						Check Roots →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 2}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Roots:
					{#if problem.params.rootType === "distinct_real"}
						<MathInline
							math={`r_1 = ${problem.solutions.r1}, \\; r_2 = ${problem.solutions.r2}`}
						/>
					{:else if problem.params.rootType === "repeated_real"}
						<MathInline math={`r = ${problem.solutions.r1}`} /> (Repeated)
					{:else}
						<MathInline
							math={`s = ${problem.solutions.r1} \\pm j${problem.solutions.r1_im}`}
						/>
					{/if}
				</span>
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
					Select the general homogeneous solution template <MathInline
						math={"y_h(t)"}
					/> matching the characteristic roots:
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
							<MathInline
								math={"C_1 e^{r_1 t} + C_2 e^{r_2 t}"}
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
							<MathInline math={"(C_1 + C_2 t) e^{r t}"} />
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
							<MathInline
								math={"e^{\\sigma t}[C_1 \\cos(\\omega_d t) + C_2 \\sin(\\omega_d t)]"}
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
					Homogeneous Form: <MathInline
						math={problem.itsData.step3.formLatex}
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
					Given forcing input <MathInline
						math={`x(t) = ${problem.forcing.latex}`}
					/>, select the trial particular solution <MathInline
						math={"y_p(t)"}
					/>:
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
					Particular Ansatz: <MathInline math={solver.correctAnsatz} />
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 5: Solve Particular Coefficients -->
	<div
		class="step-card"
		class:active={solver.currentStep === 5}
		class:done={solver.currentStep > 5}
		class:locked={solver.currentStep < 5}
	>
		<div class="step-header">
			<div class="step-badge">Step 5</div>
			<h3 class="step-title">Undetermined Coefficients</h3>
		</div>

		{#if solver.currentStep === 5}
			<div class="step-body">
				<p class="step-prompt">
					Substitute <MathInline math={"y_p(t)"} /> and its derivatives
					into the ODE to solve for the coefficient(s):
				</p>

				{#if problem.forcing.type === "sinusoid"}
					<div class="input-row-grid">
						<div class="input-pair">
							<label for="ode-a-input" class="field-label">
								Coefficient <MathInline math={"A"} /> (<MathInline
									math={"\\cos"}
								/> term):
							</label>
							<input
								id="ode-a-input"
								type="text"
								class="text-input"
								placeholder="e.g. 1/2"
								bind:value={solver.step5.a}
								onkeydown={(e) =>
									e.key === "Enter" && solver.checkStep5()}
							/>
						</div>
						<div class="input-pair">
							<label for="ode-b-input" class="field-label">
								Coefficient <MathInline math={"B"} /> (<MathInline
									math={"\\sin"}
								/> term):
							</label>
							<input
								id="ode-b-input"
								type="text"
								class="text-input"
								placeholder="e.g. -1/4"
								bind:value={solver.step5.b}
								onkeydown={(e) =>
									e.key === "Enter" && solver.checkStep5()}
							/>
						</div>
					</div>
				{:else}
					<div class="input-pair" style="max-width: 260px;">
						<label for="ode-kp-input" class="field-label">
							Particular Amplitude <MathInline math={"K_p"} />:
						</label>
						<input
							id="ode-kp-input"
							type="text"
							class="text-input"
							placeholder="e.g. 2"
							bind:value={solver.step5.kp}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep5()}
						/>
					</div>
				{/if}

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.checkStep5()}
					>
						Check Particular Solution →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 5}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Particular Solution: <MathInline
						math={`y_p(t) = ${problem.solutions.y_p_latex}`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 6: Initial Conditions System & Solved Constants -->
	<div
		class="step-card"
		class:active={solver.currentStep === 6}
		class:done={solver.currentStep > 6}
		class:locked={solver.currentStep < 6}
	>
		<div class="step-header">
			<div class="step-badge">Step 6</div>
			<h3 class="step-title">
				Initial Conditions & Constants <MathInline
					math={"(C_1, C_2)"}
				/>
			</h3>
		</div>

		{#if solver.currentStep === 6}
			<div class="step-body">
				<p class="step-prompt">
					Evaluate total response <MathInline
						math={"y(t) = y_h(t) + y_p(t)"}
					/> at <MathInline math={"t=0^+"} /> to match initial conditions:
					<MathInline
						math={`y(0^-) = ${problem.initialConditions.y0}, \\; y'(0^-) = ${problem.initialConditions.dy0}`}
					/>.
				</p>

				<div class="input-row-grid">
					<div class="input-pair">
						<label for="ode-c1-input" class="field-label">
							Constant <MathInline math={"C_1"} />:
						</label>
						<input
							id="ode-c1-input"
							type="text"
							class="text-input"
							placeholder="e.g. 1"
							bind:value={solver.step6.c1}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep6()}
						/>
					</div>
					<div class="input-pair">
						<label for="ode-c2-input" class="field-label">
							Constant <MathInline math={"C_2"} />:
						</label>
						<input
							id="ode-c2-input"
							type="text"
							class="text-input"
							placeholder="e.g. -1/2"
							bind:value={solver.step6.c2}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep6()}
						/>
					</div>
				</div>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.checkStep6()}
					>
						Check Constants →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 6}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Constants: <MathInline
						math={`C_1 = ${toFractionLatex(problem.itsData.step6.expectedC1)}, \\; C_2 = ${toFractionLatex(problem.itsData.step6.expectedC2)}`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 7: Response Separation (Zero-Input vs. Zero-State) -->
	<div
		class="step-card"
		class:active={solver.currentStep === 7}
		class:done={solver.currentStep > 7}
		class:locked={solver.currentStep < 7}
	>
		<div class="step-header">
			<div class="step-badge">Step 7</div>
			<h3 class="step-title">
				Response Decomposition: Zero-Input & Zero-State
			</h3>
		</div>

		{#if solver.currentStep === 7}
			<div class="step-body">
				<p class="step-prompt">
					Enter the final separated Zero-Input (<MathInline
						math={"y_{ZI}"}
					/>) and Zero-State (<MathInline math={"y_{ZS}"} />) response
					equations:
				</p>

				<OdeResponseInput
					onChange={(latex) => {
						solver.step7.latex = latex;
					}}
				/>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() =>
							solver.handleStep7Submit(solver.step7.latex)}
					>
						Submit Response & Complete →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 7}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Complete Solution Synthesized: <MathInline
						math={problem.solutions.y_complete_latex}
					/>
				</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.ode-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.step-card {
		container-type: inline-size;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md, 8px);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: all 0.2s ease;
	}

	.step-card.active {
		border-color: var(--accent-primary);
		box-shadow: 0 2px 12px rgba(6, 182, 212, 0.1);
	}

	.step-card.done {
		border-color: rgba(16, 185, 129, 0.35);
		background: rgba(16, 185, 129, 0.02);
		padding: 0.75rem 1.25rem;
	}

	.step-card.locked {
		opacity: 0.55;
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.step-badge {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
	}

	.step-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.step-prompt {
		font-size: 0.9rem;
		color: var(--text-primary);
		margin: 0;
	}

	.step-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.check-icon {
		color: #10b981;
		font-weight: 800;
	}

	.char-eq-interactive-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
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
		font-size: 0.78rem;
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
		font-size: 1.1rem;
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
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@container (max-width: 620px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}

	.input-pair {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: 360px;
		min-width: min(100%, 220px);
	}

	.field-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: 0.9rem;
		outline: none;
	}

	.text-input:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
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
		background: rgba(6, 182, 212, 0.12);
	}

	.choice-sub {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}

	.mcq-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.75rem 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		color: var(--text-primary);
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
		background: rgba(6, 182, 212, 0.12);
	}

	.step-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: #ffffff;
		border: none;
		border-radius: var(--radius-sm, 6px);
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 600;
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

	.feedback-alert {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm, 6px);
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.feedback-alert.error-box {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: var(--text-primary);
	}

	.alert-icon {
		font-size: 1.1rem;
	}

	.alert-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.alert-text {
		margin: 0;
		color: var(--text-secondary);
	}

	.hints-box {
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md, 8px);
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
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #f59e0b;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-hint:hover:not(:disabled) {
		background: rgba(245, 158, 11, 0.25);
	}

	.btn-hint:focus-visible {
		outline: 2px solid #f59e0b;
		outline-offset: 2px;
	}

	.btn-hint:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tier-label {
		font-size: 0.8rem;
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
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.hint-badge {
		font-weight: 700;
		color: #f59e0b;
		white-space: nowrap;
	}

	.hint-text {
		color: var(--text-secondary);
	}
</style>
