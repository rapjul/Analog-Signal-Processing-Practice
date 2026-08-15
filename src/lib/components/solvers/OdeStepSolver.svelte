<script lang="ts">
	/**
	 * OdeStepSolver Svelte 5 Component.
	 * 6-Stage Intelligent Tutoring System (ITS) for Linear Constant-Coefficient ODEs.
	 * Guides students sequentially through characteristic roots, homogeneous form selection,
	 * particular ansatz guess, undetermined coefficients, initial conditions system, and ZI/ZS decomposition.
	 */

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import { toFractionLatex } from "$lib/math-engine/fraction";
	import type {
		OdeItsOption,
		OdeProblem,
		RootType,
	} from "$lib/math-engine/odes";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathText from "../math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import OdeResponseInput from "../math/OdeResponseInput.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Callback triggered when all 6 stages are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Active stage index (1-based: 1 through 6)
	let currentStage = $state<number>(1);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isCompleted = $state<boolean>(false);

	// Stage 1 State: Characteristic Roots Inputs
	let s1R1 = $state<string>("");
	let s1R2 = $state<string>("");
	let s1Sigma = $state<string>("");
	let s1OmegaD = $state<string>("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s1Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s1Valid = $state<boolean>(false);

	// Stage 2 State: Homogeneous Form Template Selection
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Selected = $state<RootType | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Valid = $state<boolean>(false);

	// Stage 3 State: Particular Solution Ansatz Card Selection
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Valid = $state<boolean>(false);

	// Stage 4 State: Undetermined Particular Coefficients
	let s4Kp = $state<string>("");
	let s4A = $state<string>("");
	let s4B = $state<string>("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Valid = $state<boolean>(false);

	// Stage 5 State: Initial Conditions Constants C1, C2
	let s5C1 = $state<string>("");
	let s5C2 = $state<string>("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Valid = $state<boolean>(false);

	// Stage 6 State: Response Decomposition via OdeResponseInput
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Latex = $state<string>("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Valid = $state<boolean>(false);

	// Hint Tier tracking (0 = closed, 1 = Tier 1, 2 = Tier 2, 3 = Tier 3)
	let hintTier = $state<number>(0);

	// Reset state when problem changes
	$effect(() => {
		currentStage = 1;
		isCompleted = false;

		s1R1 = "";
		s1R2 = "";
		s1Sigma = "";
		s1OmegaD = "";
		s1Feedback = null;
		s1Valid = false;

		s2Selected = null;
		s2Feedback = null;
		s2Valid = false;

		s3Selected = null;
		s3Feedback = null;
		s3Valid = false;

		s4Kp = "";
		s4A = "";
		s4B = "";
		s4Feedback = null;
		s4Valid = false;

		s5C1 = "";
		s5C2 = "";
		s5Feedback = null;
		s5Valid = false;

		s6Latex = "";
		s6Feedback = null;
		s6Valid = false;

		hintTier = 0;
	});

	/**
	 * Increments the hint tier for the active stage.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function revealNextHint() {
		if (hintTier < 3) {
			hintTier += 1;
		}
	}

	/**
	 * Advances to the next interactive stage.
	 * @param {number} nextStage Target stage index
	 */
	function advanceToStage(nextStage: number) {
		currentStage = nextStage;
		hintTier = 0;
		if (nextStage > 6) {
			isCompleted = true;
			onComplete?.();
		}
	}

	/**
	 * Validates Stage 1 (Roots).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStage1() {
		const s1Data = problem.itsData.stage1;
		if (s1Data.rootType === "distinct_real") {
			const v1 = Number.parseFloat(s1R1.trim());
			const v2 = Number.parseFloat(s1R2.trim());
			const r1 = s1Data.r1;
			const r2 = s1Data.r2 ?? 0;

			const matchDirect =
				Math.abs(v1 - r1) < 0.05 && Math.abs(v2 - r2) < 0.05;
			const matchSwapped =
				Math.abs(v1 - r2) < 0.05 && Math.abs(v2 - r1) < 0.05;

			if (matchDirect || matchSwapped) {
				s1Feedback = null;
				s1Valid = true;
				advanceToStage(2);
			} else {
				s1Valid = false;
				s1Feedback = `Incorrect roots. Factor the characteristic polynomial $s^2$ + ${problem.params.a1}s + ${problem.params.a0} = 0.`;
			}
		} else if (s1Data.rootType === "repeated_real") {
			const v1 = Number.parseFloat(s1R1.trim());
			const r1 = s1Data.r1;

			if (Math.abs(v1 - r1) < 0.05) {
				s1Feedback = null;
				s1Valid = true;
				advanceToStage(2);
			} else {
				s1Valid = false;
				s1Feedback = `Incorrect repeated root. Characteristic equation: $(s - r)^2 = 0$.`;
			}
		} else if (s1Data.rootType === "complex_conjugate") {
			const vSigma = Number.parseFloat(s1Sigma.trim());
			const vOmega = Number.parseFloat(s1OmegaD.trim());
			const sigma = s1Data.r1;
			const omega = s1Data.im ?? 0;

			if (
				Math.abs(vSigma - sigma) < 0.05 &&
				Math.abs(vOmega - omega) < 0.05
			) {
				s1Feedback = null;
				s1Valid = true;
				advanceToStage(2);
			} else {
				s1Valid = false;
				s1Feedback = `Incorrect complex root components. Ensure real part \\sigma and imaginary part \\omega_d match s = \\sigma \\pm j \\omega_d.`;
			}
		}
	}

	/**
	 * Validates Stage 2 (Homogeneous Template Selection).
	 * @param {RootType} template Selected template
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStage2(template: RootType) {
		s2Selected = template;
		const s2Data = problem.itsData.stage2;

		if (template === s2Data.correctTemplate) {
			s2Feedback = null;
			s2Valid = true;
			advanceToStage(3);
		} else {
			s2Valid = false;
			s2Feedback =
				s2Data.misconceptions[template] ??
				"Incorrect homogeneous template for the characteristic root structure.";
		}
	}

	/**
	 * Validates Stage 3 (Particular Solution Ansatz).
	 * @param {OdeItsOption} opt Selected option
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStage3(opt: OdeItsOption) {
		s3Selected = opt.id;
		if (opt.isCorrect) {
			s3Feedback = null;
			s3Valid = true;
			advanceToStage(4);
		} else {
			s3Valid = false;
			s3Feedback =
				opt.feedback ??
				"Incorrect trial ansatz guess. Check for resonance collisions or missing trigonometric pairs.";
		}
	}

	/**
	 * Validates Stage 4 (Particular Coefficients).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStage4() {
		const s4Data = problem.itsData.stage4;
		if (problem.forcing.type === "sinusoid") {
			const vA = Number.parseFloat(s4A.trim());
			const vB = Number.parseFloat(s4B.trim());
			const expA = s4Data.expectedA ?? 0;
			const expB = s4Data.expectedB ?? 0;

			if (Math.abs(vA - expA) < 0.05 && Math.abs(vB - expB) < 0.05) {
				s4Feedback = null;
				s4Valid = true;
				advanceToStage(5);
			} else {
				s4Valid = false;
				s4Feedback =
					"Incorrect coefficients $A$ and $B$. Substitute $y_p(t)$ into the ODE and equate like cosine and sine terms.";
			}
		} else {
			const vKp = Number.parseFloat(s4Kp.trim());
			const expKp = s4Data.expectedKp ?? 0;

			if (Math.abs(vKp - expKp) < 0.05) {
				s4Feedback = null;
				s4Valid = true;
				advanceToStage(5);
			} else {
				s4Valid = false;
				s4Feedback =
					"Incorrect $K_p$ coefficient. Substitute $y_p(t)$ into the ODE and solve for $K_p$.";
			}
		}
	}

	/**
	 * Validates Stage 5 (Initial Conditions System & Constants C1, C2).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStage5() {
		const s5Data = problem.itsData.stage5;
		const vC1 = Number.parseFloat(s5C1.trim());
		const vC2 = Number.parseFloat(s5C2.trim());

		if (
			Math.abs(vC1 - s5Data.expectedC1) < 0.05 &&
			Math.abs(vC2 - s5Data.expectedC2) < 0.05
		) {
			s5Feedback = null;
			s5Valid = true;
			advanceToStage(6);
		} else {
			s5Valid = false;
			s5Feedback = `Incorrect constants $C_1$, $C_2$. Remember to account for the velocity offset $y_p'(0+)$ when setting up $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.`;
		}
	}

	/**
	 * Handles submission from Stage 6 OdeResponseInput.
	 * @param {string} value LaTeX formatted student response
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleStage6Submit(value: string) {
		if (value && value.length > 3) {
			s6Feedback = null;
			s6Valid = true;
			advanceToStage(7);
		} else {
			s6Valid = false;
			s6Feedback =
				"Please fill in both the Zero-Input and Zero-State response fields.";
		}
	}

	/**
	 * Active hints helper.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let activeHints = $derived.by(() => {
		switch (currentStage) {
			case 1:
				return problem.itsData.stage1.hints;
			case 2:
				return problem.itsData.stage2.hints;
			case 3:
				return problem.itsData.stage3.hints;
			case 4:
				return problem.itsData.stage4.hints;
			case 5:
				return problem.itsData.stage5.hints;
			case 6:
				return problem.itsData.stage6.hints;
			default:
				return [];
		}
	});

	/**
	 * Active feedback for the current stage.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let currentFeedback = $derived.by(() => {
		switch (currentStage) {
			case 1:
				return s1Feedback;
			case 2:
				return s2Feedback;
			case 3:
				return s3Feedback;
			case 4:
				return s4Feedback;
			case 5:
				return s5Feedback;
			case 6:
				return s6Feedback;
			default:
				return null;
		}
	});
</script>

{#snippet feedbackAndHints()}
	<!-- Feedback Alert Message -->
	{#if currentFeedback}
		<div class="feedback-alert error-box">
			<span class="alert-icon">⚠️</span>
			<div class="alert-content">
				<strong>Misconception Detected:</strong>
				<p class="alert-text">
					<MathText text={currentFeedback} />
				</p>
			</div>
		</div>
	{/if}

	<!-- Progressive Hints Utility -->
	{#if currentStage <= 6}
		<div class="hints-box hint-container">
			<div class="hints-header">
				<button
					type="button"
					class="btn-hint hint-toggle-btn"
					onclick={revealNextHint}
					disabled={hintTier >= 3}
				>
					💡 {hintTier === 0
						? "Get Hint"
						: hintTier < 3
							? `Get Next Hint (${hintTier}/3)`
							: "All Hints Revealed (3/3)"}
				</button>
				{#if hintTier > 0}
					<span class="tier-label">
						{hintTier === 1
							? "Tier 1: Conceptual Nudge"
							: hintTier === 2
								? "Tier 2: Formula Setup"
								: "Tier 3: Worked Intermediate Step"}
					</span>
				{/if}
			</div>

			{#if hintTier > 0}
				<div class="hints-content">
					{#each activeHints.slice(0, hintTier) as hint, idx}
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
	<div class="stages-progress-bar">
		<span class="progress-title">ITS Problem Progression:</span>
		<div class="progress-pills">
			{#each [1, 2, 3, 4, 5, 6] as s}
				<div
					class="progress-pill"
					class:active={currentStage === s}
					class:completed={currentStage > s}
				>
					{s < currentStage ? "✓" : s}
				</div>
			{/each}
		</div>
	</div>

	<!-- Stage 1: Characteristic Roots -->
	<div
		class="stage-card"
		class:active={currentStage === 1}
		class:done={currentStage > 1}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 1</div>
			<h3 class="stage-title">Characteristic Polynomial Roots</h3>
		</div>

		{#if currentStage === 1}
			<div class="stage-body">
				<p class="stage-prompt">
					Form the characteristic polynomial <MathInline
						math={`s^2 + ${problem.params.a1}s + ${problem.params.a0} = 0`}
					/> and solve for its roots:
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
								bind:value={s1R1}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage1()}
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
								bind:value={s1R2}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage1()}
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
							bind:value={s1R1}
							onkeydown={(e) =>
								e.key === "Enter" && checkStage1()}
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
								bind:value={s1Sigma}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage1()}
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
								bind:value={s1OmegaD}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage1()}
							/>
						</div>
					</div>
				{/if}

				<div class="stage-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStage1}
					>
						Check Roots →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else}
			<div class="stage-summary">
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

	<!-- Stage 2: Homogeneous Form Selection -->
	<div
		class="stage-card"
		class:active={currentStage === 2}
		class:done={currentStage > 2}
		class:locked={currentStage < 2}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 2</div>
			<h3 class="stage-title">Homogeneous Form Template</h3>
		</div>

		{#if currentStage === 2}
			<div class="stage-body">
				<p class="stage-prompt">
					Select the general homogeneous solution template <MathInline
						math={"y_h(t)"}
					/> matching the characteristic roots:
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "distinct_real"}
						onclick={() => checkStage2("distinct_real")}
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
						class:selected={s2Selected === "repeated_real"}
						onclick={() => checkStage2("repeated_real")}
					>
						<strong>Repeated Real Roots</strong>
						<span class="choice-sub">
							<MathInline math={"(C_1 + C_2 t) e^{r t}"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "complex_conjugate"}
						onclick={() => checkStage2("complex_conjugate")}
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
		{:else if currentStage > 2}
			<div class="stage-summary">
				<span class="check-icon">✓</span>
				<span>
					Form Instantiation: <MathInline
						math={problem.solutions.y_h_latex}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Stage 3: Particular Solution Ansatz Guess -->
	<div
		class="stage-card"
		class:active={currentStage === 3}
		class:done={currentStage > 3}
		class:locked={currentStage < 3}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 3</div>
			<h3 class="stage-title">Particular Solution Ansatz Form</h3>
		</div>

		{#if currentStage === 3}
			<div class="stage-body">
				<p class="stage-prompt">
					Given forcing input <MathInline
						math={`x(t) = ${problem.forcing.latex}`}
					/>, select the trial particular solution <MathInline
						math={"y_p(t)"}
					/>:
				</p>
				<div class="mcq-cards-grid">
					{#each problem.itsData.stage3.options as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={s3Selected === opt.id}
							onclick={() => checkStage3(opt)}
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
		{:else if currentStage > 3}
			<div class="stage-summary">
				<span class="check-icon">✓</span>
				<span>Particular Ansatz: Validated</span>
			</div>
		{/if}
	</div>

	<!-- Stage 4: Solve Particular Coefficients -->
	<div
		class="stage-card"
		class:active={currentStage === 4}
		class:done={currentStage > 4}
		class:locked={currentStage < 4}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 4</div>
			<h3 class="stage-title">Undetermined Coefficients</h3>
		</div>

		{#if currentStage === 4}
			<div class="stage-body">
				<p class="stage-prompt">
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
								bind:value={s4A}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage4()}
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
								bind:value={s4B}
								onkeydown={(e) =>
									e.key === "Enter" && checkStage4()}
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
							bind:value={s4Kp}
							onkeydown={(e) =>
								e.key === "Enter" && checkStage4()}
						/>
					</div>
				{/if}

				<div class="stage-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStage4}
					>
						Check Particular Solution →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStage > 4}
			<div class="stage-summary">
				<span class="check-icon">✓</span>
				<span>
					Particular Solution: <MathInline
						math={`y_p(t) = ${problem.solutions.y_p_latex}`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Stage 5: Initial Conditions System & Solved Constants -->
	<div
		class="stage-card"
		class:active={currentStage === 5}
		class:done={currentStage > 5}
		class:locked={currentStage < 5}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 5</div>
			<h3 class="stage-title">
				Initial Conditions & Constants <MathInline
					math={"(C_1, C_2)"}
				/>
			</h3>
		</div>

		{#if currentStage === 5}
			<div class="stage-body">
				<p class="stage-prompt">
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
							bind:value={s5C1}
							onkeydown={(e) =>
								e.key === "Enter" && checkStage5()}
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
							bind:value={s5C2}
							onkeydown={(e) =>
								e.key === "Enter" && checkStage5()}
						/>
					</div>
				</div>

				<div class="stage-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStage5}
					>
						Check Constants →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStage > 5}
			<div class="stage-summary">
				<span class="check-icon">✓</span>
				<span>
					Constants: <MathInline
						math={`C_1 = ${toFractionLatex(problem.itsData.stage5.expectedC1)}, \\; C_2 = ${toFractionLatex(problem.itsData.stage5.expectedC2)}`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Stage 6: Response Separation (Zero-Input vs. Zero-State) -->
	<div
		class="stage-card"
		class:active={currentStage === 6}
		class:done={currentStage > 6}
		class:locked={currentStage < 6}
	>
		<div class="stage-header">
			<div class="stage-badge">Stage 6</div>
			<h3 class="stage-title">
				Response Decomposition: Zero-Input & Zero-State
			</h3>
		</div>

		{#if currentStage === 6}
			<div class="stage-body">
				<p class="stage-prompt">
					Enter the final separated Zero-Input (<MathInline
						math={"y_{ZI}"}
					/>) and Zero-State (<MathInline math={"y_{ZS}"} />) response
					equations:
				</p>

				<OdeResponseInput
					onChange={(latex) => {
						s6Latex = latex;
					}}
				/>

				<div class="stage-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => handleStage6Submit(s6Latex)}
					>
						Submit Response & Complete →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStage > 6}
			<div class="stage-summary">
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

	.stages-progress-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.progress-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.progress-pills {
		display: flex;
		gap: 0.5rem;
	}

	.progress-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		transition: all 0.2s ease;
	}

	.progress-pill.active {
		background: var(--accent-primary);
		color: #ffffff;
		border-color: var(--accent-primary);
		box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
	}

	.progress-pill.completed {
		background: rgba(16, 185, 129, 0.15);
		border-color: #10b981;
		color: #10b981;
	}

	.stage-card {
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

	.stage-card.active {
		border-color: var(--accent-primary);
		box-shadow: 0 2px 12px rgba(6, 182, 212, 0.1);
	}

	.stage-card.done {
		border-color: rgba(16, 185, 129, 0.35);
		background: rgba(16, 185, 129, 0.02);
		padding: 0.75rem 1.25rem;
	}

	.stage-card.locked {
		opacity: 0.55;
	}

	.stage-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.stage-badge {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
	}

	.stage-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.stage-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.stage-prompt {
		font-size: 0.9rem;
		color: var(--text-primary);
		margin: 0;
	}

	.stage-summary {
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
		max-width: 360px; /* Prevents inputs from stretching excessively */
		min-width: min(
			100%,
			220px
		); /* Never exceeds 100% on small screens, but maintains 220px floor */
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

	.stage-actions {
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
