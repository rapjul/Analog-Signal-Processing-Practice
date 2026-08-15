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
		/** Callback triggered when all 7 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Active step index (1-based: 1 through 7)
	let currentStep = $state<number>(1);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isCompleted = $state<boolean>(false);

	// Step 1 State: Characteristic Equation Coefficients (a2 s^2 + a1 s + a0 = 0)
	let s1A2 = $state<string>("");
	let s1A1 = $state<string>("");
	let s1A0 = $state<string>("");
	let s1Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s1Valid = $state<boolean>(false);

	// Step 2 State: Characteristic Roots Inputs
	let s2R1 = $state<string>("");
	let s2R2 = $state<string>("");
	let s2Sigma = $state<string>("");
	let s2OmegaD = $state<string>("");
	let s2Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Valid = $state<boolean>(false);

	// Step 3 State: Homogeneous Form Template Selection
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Selected = $state<RootType | null>(null);
	let s3Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Valid = $state<boolean>(false);

	// Step 4 State: Particular Solution Ansatz Card Selection
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Selected = $state<string | null>(null);
	let s4Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Valid = $state<boolean>(false);

	// Step 5 State: Undetermined Particular Coefficients
	let s5Kp = $state<string>("");
	let s5A = $state<string>("");
	let s5B = $state<string>("");
	let s5Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Valid = $state<boolean>(false);

	// Step 6 State: Initial Conditions Constants C1, C2
	let s6C1 = $state<string>("");
	let s6C2 = $state<string>("");
	let s6Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Valid = $state<boolean>(false);

	// Step 7 State: Response Decomposition via OdeResponseInput
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s7Latex = $state<string>("");
	let s7Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s7Valid = $state<boolean>(false);

	// Hint Tier tracking (0 = closed, 1 = Tier 1, 2 = Tier 2, 3 = Tier 3)
	let hintTier = $state<number>(0);

	// Live rendered preview equation for Step 1 Characteristic Equation
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let previewCharEq = $derived.by(() => {
		const a2Str = s1A2.trim();
		const a1Str = s1A1.trim();
		const a0Str = s1A0.trim();

		let term2 = "s^2";
		if (a2Str !== "") {
			const n2 = Number.parseFloat(a2Str);
			if (!Number.isNaN(n2)) {
				if (n2 === 1) term2 = "s^2";
				else if (n2 === -1) term2 = "-s^2";
				else term2 = `${n2}s^2`;
			} else {
				term2 = `${a2Str}s^2`;
			}
		} else {
			term2 = "a_2 s^2";
		}

		let term1 = "+ a_1 s";
		if (a1Str !== "") {
			const n1 = Number.parseFloat(a1Str);
			if (!Number.isNaN(n1)) {
				if (n1 === 1) term1 = "+ s";
				else if (n1 === -1) term1 = "- s";
				else if (n1 >= 0) term1 = `+ ${n1}s`;
				else term1 = `- ${Math.abs(n1)}s`;
			} else {
				term1 = `+ ${a1Str}s`;
			}
		}

		let term0 = "+ a_0";
		if (a0Str !== "") {
			const n0 = Number.parseFloat(a0Str);
			if (!Number.isNaN(n0)) {
				if (n0 >= 0) term0 = `+ ${n0}`;
				else term0 = `- ${Math.abs(n0)}`;
			} else {
				term0 = `+ ${a0Str}`;
			}
		}

		return `${term2} ${term1} ${term0} = 0`;
	});

	// Step 4 correct ansatz LaTeX
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let correctAnsatz = $derived(
		problem.itsData.step4.options.find((opt) => opt.isCorrect)?.latex ?? "",
	);

	// Reset state when problem changes
	$effect(() => {
		currentStep = 1;
		isCompleted = false;

		s1A2 = "";
		s1A1 = "";
		s1A0 = "";
		s1Feedback = null;
		s1Valid = false;

		s2R1 = "";
		s2R2 = "";
		s2Sigma = "";
		s2OmegaD = "";
		s2Feedback = null;
		s2Valid = false;

		s3Selected = null;
		s3Feedback = null;
		s3Valid = false;

		s4Selected = null;
		s4Feedback = null;
		s4Valid = false;

		s5Kp = "";
		s5A = "";
		s5B = "";
		s5Feedback = null;
		s5Valid = false;

		s6C1 = "";
		s6C2 = "";
		s6Feedback = null;
		s6Valid = false;

		s7Latex = "";
		s7Feedback = null;
		s7Valid = false;

		hintTier = 0;
	});

	/**
	 * Increments the hint tier for the active step.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function revealNextHint() {
		if (hintTier < 3) {
			hintTier += 1;
		}
	}

	/**
	 * Advances to the next interactive step.
	 * @param {number} nextStep Target step index
	 */
	function advanceToStep(nextStep: number) {
		currentStep = nextStep;
		hintTier = 0;
		if (nextStep > 7) {
			isCompleted = true;
			onComplete?.();
		}
	}

	/**
	 * Validates Step 1 (Characteristic Equation Formulation).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep1() {
		const s1Data = problem.itsData.step1;
		const vA2 = Number.parseFloat(s1A2.trim());
		const vA1 = Number.parseFloat(s1A1.trim());
		const vA0 = Number.parseFloat(s1A0.trim());

		if (Number.isNaN(vA2) || Number.isNaN(vA1) || Number.isNaN(vA0)) {
			s1Valid = false;
			s1Feedback =
				"Please enter numeric values for all three coefficients: $a_2$, $a_1$, and $a_0$.";
			return;
		}

		// Misconception check: student entered RHS forcing amplitude for a0
		if (
			Math.abs(vA0 - problem.forcing.K) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) >= 0.05
		) {
			s1Valid = false;
			s1Feedback = s1Data.misconceptions.forcing_rhs;
			return;
		}

		if (
			Math.abs(vA2 - s1Data.expectedA2) < 0.05 &&
			Math.abs(vA1 - s1Data.expectedA1) < 0.05 &&
			Math.abs(vA0 - s1Data.expectedA0) < 0.05
		) {
			s1Feedback = null;
			s1Valid = true;
			advanceToStep(2);
		} else {
			s1Valid = false;
			s1Feedback = `Incorrect coefficients. Substitute $\\frac{d^2 y}{dt^2} \\to s^2$, $\\frac{dy}{dt} \\to s$, and $y(t) \\to 1$, setting the homogeneous right-hand side to $0$.`;
		}
	}

	/**
	 * Validates Step 2 (Roots).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep2() {
		const s2Data = problem.itsData.step2;
		if (s2Data.rootType === "distinct_real") {
			const v1 = Number.parseFloat(s2R1.trim());
			const v2 = Number.parseFloat(s2R2.trim());
			const r1 = s2Data.r1;
			const r2 = s2Data.r2 ?? 0;

			const matchDirect =
				Math.abs(v1 - r1) < 0.05 && Math.abs(v2 - r2) < 0.05;
			const matchSwapped =
				Math.abs(v1 - r2) < 0.05 && Math.abs(v2 - r1) < 0.05;

			if (matchDirect || matchSwapped) {
				s2Feedback = null;
				s2Valid = true;
				advanceToStep(3);
			} else {
				s2Valid = false;
				s2Feedback = `Incorrect roots. Factor the characteristic polynomial $${problem.itsData.step1.latex}$.`;
			}
		} else if (s2Data.rootType === "repeated_real") {
			const v1 = Number.parseFloat(s2R1.trim());
			const r1 = s2Data.r1;

			if (Math.abs(v1 - r1) < 0.05) {
				s2Feedback = null;
				s2Valid = true;
				advanceToStep(3);
			} else {
				s2Valid = false;
				s2Feedback = `Incorrect repeated root. Characteristic equation: $(s - r)^2 = 0$.`;
			}
		} else if (s2Data.rootType === "complex_conjugate") {
			const vSigma = Number.parseFloat(s2Sigma.trim());
			const vOmega = Number.parseFloat(s2OmegaD.trim());
			const sigma = s2Data.r1;
			const omega = s2Data.im ?? 0;

			if (
				Math.abs(vSigma - sigma) < 0.05 &&
				Math.abs(vOmega - omega) < 0.05
			) {
				s2Feedback = null;
				s2Valid = true;
				advanceToStep(3);
			} else {
				s2Valid = false;
				s2Feedback = `Incorrect complex root components. Ensure real part \\sigma and imaginary part \\omega_d match s = \\sigma \\pm j \\omega_d.`;
			}
		}
	}

	/**
	 * Validates Step 3 (Homogeneous Template Selection).
	 * @param {RootType} template Selected template
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep3(template: RootType) {
		s3Selected = template;
		const s3Data = problem.itsData.step3;

		if (template === s3Data.correctTemplate) {
			s3Feedback = null;
			s3Valid = true;
			advanceToStep(4);
		} else {
			s3Valid = false;
			s3Feedback =
				s3Data.misconceptions[template] ??
				"Incorrect homogeneous template for the characteristic root structure.";
		}
	}

	/**
	 * Validates Step 4 (Particular Solution Ansatz).
	 * @param {OdeItsOption} opt Selected option
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep4(opt: OdeItsOption) {
		s4Selected = opt.id;
		if (opt.isCorrect) {
			s4Feedback = null;
			s4Valid = true;
			advanceToStep(5);
		} else {
			s4Valid = false;
			s4Feedback =
				opt.feedback ??
				"Incorrect trial ansatz guess. Check for resonance collisions or missing trigonometric pairs.";
		}
	}

	/**
	 * Validates Step 5 (Particular Coefficients).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep5() {
		const s5Data = problem.itsData.step5;
		if (problem.forcing.type === "sinusoid") {
			const vA = Number.parseFloat(s5A.trim());
			const vB = Number.parseFloat(s5B.trim());
			const expA = s5Data.expectedA ?? 0;
			const expB = s5Data.expectedB ?? 0;

			if (Math.abs(vA - expA) < 0.05 && Math.abs(vB - expB) < 0.05) {
				s5Feedback = null;
				s5Valid = true;
				advanceToStep(6);
			} else {
				s5Feedback =
					"Incorrect coefficients $A$ and $B$. Substitute $y_p(t)$ into the ODE and equate like cosine and sine terms.";
				s5Valid = false;
			}
		} else {
			const vKp = Number.parseFloat(s5Kp.trim());
			const expKp = s5Data.expectedKp ?? 0;

			if (Math.abs(vKp - expKp) < 0.05) {
				s5Feedback = null;
				s5Valid = true;
				advanceToStep(6);
			} else {
				s5Feedback =
					"Incorrect $K_p$ coefficient. Substitute $y_p(t)$ into the ODE and solve for $K_p$.";
				s5Valid = false;
			}
		}
	}

	/**
	 * Validates Step 6 (Initial Conditions System & Constants C1, C2).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep6() {
		const s6Data = problem.itsData.step6;
		const vC1 = Number.parseFloat(s6C1.trim());
		const vC2 = Number.parseFloat(s6C2.trim());

		if (
			Math.abs(vC1 - s6Data.expectedC1) < 0.05 &&
			Math.abs(vC2 - s6Data.expectedC2) < 0.05
		) {
			s6Feedback = null;
			s6Valid = true;
			advanceToStep(7);
		} else {
			s6Valid = false;
			s6Feedback = `Incorrect constants $C_1$, $C_2$. Remember to account for the velocity offset $y_p'(0^+)$ when setting up $y'(0^+) = y_h'(0^+) + y_p'(0^+)$.`;
		}
	}

	/**
	 * Handles submission from Step 7 OdeResponseInput.
	 * @param {string} value LaTeX formatted student response
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleStep7Submit(value: string) {
		if (value && value.length > 3) {
			s7Feedback = null;
			s7Valid = true;
			advanceToStep(8);
		} else {
			s7Valid = false;
			s7Feedback =
				"Please fill in both the Zero-Input and Zero-State response fields.";
		}
	}

	/**
	 * Active hints helper.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let activeHints = $derived.by(() => {
		switch (currentStep) {
			case 1:
				return problem.itsData.step1.hints;
			case 2:
				return problem.itsData.step2.hints;
			case 3:
				return problem.itsData.step3.hints;
			case 4:
				return problem.itsData.step4.hints;
			case 5:
				return problem.itsData.step5.hints;
			case 6:
				return problem.itsData.step6.hints;
			case 7:
				return problem.itsData.step7.hints;
			default:
				return [];
		}
	});

	/**
	 * Active feedback for the current step.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let currentFeedback = $derived.by(() => {
		switch (currentStep) {
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
			case 7:
				return s7Feedback;
			default:
				return null;
		}
	});
</script>

{#snippet feedbackAndHints()}
	<!-- Feedback Alert Message -->
	{#if currentFeedback}
		<div class="feedback-alert error-box" role="alert">
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
	{#if currentStep <= 7}
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
	<div class="steps-progress-bar">
		<span class="progress-title">ITS Problem Progression:</span>
		<div class="progress-pills">
			{#each [1, 2, 3, 4, 5, 6, 7] as s}
				<div
					class="progress-pill"
					class:active={currentStep === s}
					class:completed={currentStep > s}
				>
					{s < currentStep ? "✓" : s}
				</div>
			{/each}
		</div>
	</div>

	<!-- Step 1: Characteristic Equation Setup -->
	<div
		class="step-card"
		class:active={currentStep === 1}
		class:done={currentStep > 1}
	>
		<div class="step-header">
			<div class="step-badge">Step 1</div>
			<h3 class="step-title">Characteristic Equation Formulation</h3>
		</div>

		{#if currentStep === 1}
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
								bind:value={s1A2}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep1()}
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
								bind:value={s1A1}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep1()}
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
								bind:value={s1A0}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep1()}
							/>
						</div>
					</div>

					<div class="preview-equation-box">
						<span class="preview-label">Live Equation Preview:</span
						>
						<MathBlock
							math={`Q(s) = ${previewCharEq}`}
							compact={true}
							hideHeader={true}
						/>
					</div>
				</div>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStep1}
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
		class:active={currentStep === 2}
		class:done={currentStep > 2}
		class:locked={currentStep < 2}
	>
		<div class="step-header">
			<div class="step-badge">Step 2</div>
			<h3 class="step-title">Characteristic Polynomial Roots</h3>
		</div>

		{#if currentStep === 2}
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
								bind:value={s2R1}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep2()}
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
								bind:value={s2R2}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep2()}
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
							bind:value={s2R1}
							onkeydown={(e) => e.key === "Enter" && checkStep2()}
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
								bind:value={s2Sigma}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep2()}
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
								bind:value={s2OmegaD}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep2()}
							/>
						</div>
					</div>
				{/if}

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStep2}
					>
						Check Roots →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 2}
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
		class:active={currentStep === 3}
		class:done={currentStep > 3}
		class:locked={currentStep < 3}
	>
		<div class="step-header">
			<div class="step-badge">Step 3</div>
			<h3 class="step-title">Homogeneous Form Template</h3>
		</div>

		{#if currentStep === 3}
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
						class:selected={s3Selected === "distinct_real"}
						onclick={() => checkStep3("distinct_real")}
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
						class:selected={s3Selected === "repeated_real"}
						onclick={() => checkStep3("repeated_real")}
					>
						<strong>Repeated Real Roots</strong>
						<span class="choice-sub">
							<MathInline math={"(C_1 + C_2 t) e^{r t}"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s3Selected === "complex_conjugate"}
						onclick={() => checkStep3("complex_conjugate")}
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
		{:else if currentStep > 3}
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
		class:active={currentStep === 4}
		class:done={currentStep > 4}
		class:locked={currentStep < 4}
	>
		<div class="step-header">
			<div class="step-badge">Step 4</div>
			<h3 class="step-title">Particular Solution Ansatz Form</h3>
		</div>

		{#if currentStep === 4}
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
							class:selected={s4Selected === opt.id}
							onclick={() => checkStep4(opt)}
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
		{:else if currentStep > 4}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Particular Ansatz: <MathInline math={correctAnsatz} />
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 5: Solve Particular Coefficients -->
	<div
		class="step-card"
		class:active={currentStep === 5}
		class:done={currentStep > 5}
		class:locked={currentStep < 5}
	>
		<div class="step-header">
			<div class="step-badge">Step 5</div>
			<h3 class="step-title">Undetermined Coefficients</h3>
		</div>

		{#if currentStep === 5}
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
								bind:value={s5A}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep5()}
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
								bind:value={s5B}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep5()}
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
							bind:value={s5Kp}
							onkeydown={(e) => e.key === "Enter" && checkStep5()}
						/>
					</div>
				{/if}

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStep5}
					>
						Check Particular Solution →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 5}
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
		class:active={currentStep === 6}
		class:done={currentStep > 6}
		class:locked={currentStep < 6}
	>
		<div class="step-header">
			<div class="step-badge">Step 6</div>
			<h3 class="step-title">
				Initial Conditions & Constants <MathInline
					math={"(C_1, C_2)"}
				/>
			</h3>
		</div>

		{#if currentStep === 6}
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
							bind:value={s6C1}
							onkeydown={(e) => e.key === "Enter" && checkStep6()}
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
							bind:value={s6C2}
							onkeydown={(e) => e.key === "Enter" && checkStep6()}
						/>
					</div>
				</div>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStep6}
					>
						Check Constants →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 6}
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
		class:active={currentStep === 7}
		class:done={currentStep > 7}
		class:locked={currentStep < 7}
	>
		<div class="step-header">
			<div class="step-badge">Step 7</div>
			<h3 class="step-title">
				Response Decomposition: Zero-Input & Zero-State
			</h3>
		</div>

		{#if currentStep === 7}
			<div class="step-body">
				<p class="step-prompt">
					Enter the final separated Zero-Input (<MathInline
						math={"y_{ZI}"}
					/>) and Zero-State (<MathInline math={"y_{ZS}"} />) response
					equations:
				</p>

				<OdeResponseInput
					onChange={(latex) => {
						s7Latex = latex;
					}}
				/>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => handleStep7Submit(s7Latex)}
					>
						Submit Response & Complete →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 7}
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

	.steps-progress-bar {
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
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.progress-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border-radius: 50%;
		font-size: 0.75rem;
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
