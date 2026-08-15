<script lang="ts">
	/**
	 * FourierStepSolver Svelte 5 Component.
	 * 6-Stage Intelligent Tutoring System (ITS) for Fourier Series.
	 * Guides students sequentially through period/frequency, symmetry classification,
	 * vanishing shortcuts, form selection, integral setup, and final series evaluation.
	 */

	import type {
		FourierItsOption,
		FourierSeriesProblem,
	} from "$lib/math-engine/fourier-series";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathText from "../math/MathText.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Callback triggered when all 6 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Active step index (1-based: 1 through 6)
	let currentStep = $state<number>(1);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isCompleted = $state<boolean>(false);

	// Step 1 State: Period & Frequency Inputs
	let s1Period = $state<string>("");
	let s1PeriodUnit = $state<string>("s");
	let s1Freq = $state<string>("");
	let s1FreqUnit = $state<string>("rad/s");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s1Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s1Valid = $state<boolean>(false);

	// Step 2 State: Symmetry
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s2Valid = $state<boolean>(false);

	// Step 3 State: Vanishing Coefficients
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s3Valid = $state<boolean>(false);

	// Step 4 State: Representation Form
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s4Valid = $state<boolean>(false);

	// Step 5 State: Integral Setup Formula Card
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s5Valid = $state<boolean>(false);

	// Step 6 State: Final Series Expression Formula Card
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Selected = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Feedback = $state<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let s6Valid = $state<boolean>(false);

	// Hint Tier tracking (0 = closed, 1 = Tier 1, 2 = Tier 2, 3 = Tier 3)
	let hintTier = $state<number>(0);

	// Reset state when problem changes
	$effect(() => {
		currentStep = 1;
		isCompleted = false;
		s1Period = "";
		s1PeriodUnit = "s";
		s1Freq = "";
		s1FreqUnit = "rad/s";
		s1Feedback = null;
		s1Valid = false;

		s2Selected = null;
		s2Feedback = null;
		s2Valid = false;

		s3Selected = null;
		s3Feedback = null;
		s3Valid = false;

		s4Selected = null;
		s4Feedback = null;
		s4Valid = false;

		s5Selected = null;
		s5Feedback = null;
		s5Valid = false;

		s6Selected = null;
		s6Feedback = null;
		s6Valid = false;

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
	 * Advances to the next interactive step and resets hints.
	 * @param {number} nextStep Target step index
	 */
	function advanceToStep(nextStep: number) {
		currentStep = nextStep;
		hintTier = 0;
		if (nextStep > 6) {
			isCompleted = true;
			onComplete?.();
		}
	}

	/**
	 * Validates Step 1 (Period & Frequency).
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep1() {
		const s1Data = problem.itsData.step1;
		const pTrimmed = s1Period.trim().toLowerCase();
		const fTrimmed = s1Freq.trim().toLowerCase();

		const pMatch =
			s1Data.tAliases.some((alias) => pTrimmed === alias.toLowerCase()) ||
			Math.abs(Number.parseFloat(pTrimmed) - s1Data.expectedT) < 0.05;

		const fMatch =
			s1Data.w0Aliases.some(
				(alias) => fTrimmed === alias.toLowerCase(),
			) ||
			Math.abs(Number.parseFloat(fTrimmed) - s1Data.expectedW0) < 0.05;

		if (!pMatch) {
			s1Feedback =
				"Incorrect Period value: inspect the duration over which the waveform repeats itself.";
			s1Valid = false;
			return;
		}
		if (s1PeriodUnit !== "s") {
			s1Feedback =
				"Incorrect Period unit: period must be measured in seconds (s).";
			s1Valid = false;
			return;
		}
		if (!fMatch) {
			s1Feedback =
				"Incorrect Fundamental Frequency: use \\omega_0 = \\frac{2\\pi}{T_0}. (e.g. \\pi or \\pi/2).";
			s1Valid = false;
			return;
		}
		if (s1FreqUnit !== "rad/s") {
			s1Feedback =
				"Incorrect Frequency unit: radian frequency \\omega_0 must be in rad/s.";
			s1Valid = false;
			return;
		}

		s1Feedback = null;
		s1Valid = true;
		advanceToStep(2);
	}

	/**
	 * Validates Step 2 (Symmetry Selection).
	 * @param {string} symmetry Selected symmetry value
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep2(symmetry: string) {
		s2Selected = symmetry;
		const s2Data = problem.itsData.step2;

		if (symmetry === s2Data.correctSymmetry) {
			s2Feedback = null;
			s2Valid = true;
			advanceToStep(3);
		} else {
			s2Valid = false;
			s2Feedback =
				s2Data.misconceptions[symmetry] ??
				"Incorrect symmetry. Test whether x(-t) = x(t) (even) or x(-t) = -x(t) (odd).";
		}
	}

	/**
	 * Validates Step 3 (Vanishing Coefficients).
	 * @param {string} choice Selected vanishing choice
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep3(choice: string) {
		s3Selected = choice;
		const s3Data = problem.itsData.step3;

		if (choice === s3Data.correctVanishing) {
			s3Feedback = null;
			s3Valid = true;
			advanceToStep(4);
		} else {
			s3Valid = false;
			s3Feedback =
				s3Data.misconceptions[choice] ??
				"Incorrect vanishing condition for the signal's symmetry.";
		}
	}

	/**
	 * Validates Step 4 (Representation Form).
	 * @param {string} form Selected form choice
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep4(form: string) {
		s4Selected = form;
		const s4Data = problem.itsData.step4;

		if (form === s4Data.correctForm) {
			s4Feedback = null;
			s4Valid = true;
			advanceToStep(5);
		} else {
			s4Valid = false;
			s4Feedback =
				s4Data.misconceptions[form] ??
				"Consider which representation requires computing fewer non-zero integrals.";
		}
	}

	/**
	 * Validates Step 5 (Integral Setup Formula Card).
	 * @param {FourierItsOption} opt Selected option
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep5(opt: FourierItsOption) {
		s5Selected = opt.id;
		if (opt.isCorrect) {
			s5Feedback = null;
			s5Valid = true;
			advanceToStep(6);
		} else {
			s5Valid = false;
			s5Feedback =
				opt.feedback ??
				"Incorrect integral formulation. Check scaling factors (2/T0 vs 1/T0) and trigonometric kernels.";
		}
	}

	/**
	 * Validates Step 6 (Final Series Evaluation).
	 * @param {FourierItsOption} opt Selected option
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function checkStep6(opt: FourierItsOption) {
		s6Selected = opt.id;
		if (opt.isCorrect) {
			s6Feedback = null;
			s6Valid = true;
			advanceToStep(7);
		} else {
			s6Valid = false;
			s6Feedback =
				opt.feedback ??
				"Incorrect series expression. Check signs, DC offset a_0, and harmonic indices.";
		}
	}

	// Step active hints helper
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
			default:
				return "";
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
	{#if currentStep <= 6}
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

<div class="fourier-step-solver">
	<div class="steps-progress-bar">
		<span class="progress-title">Intelligent Tutoring Progress:</span>
		<div class="progress-pills">
			{#each [1, 2, 3, 4, 5, 6] as s}
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

	<!-- Step 1: Period and Frequency -->
	<div
		class="step-card"
		class:active={currentStep === 1}
		class:done={currentStep > 1}
	>
		<div class="step-header">
			<div class="step-badge">Step 1</div>
			<h3 class="step-title">Fundamental Period & Frequency</h3>
		</div>

		{#if currentStep === 1}
			<div class="step-body">
				<p class="step-prompt">
					Enter the fundamental period <MathInline math={"T_0"} /> and
					fundamental frequency <MathInline math={"\\omega_0"} /> from
					the waveform definition:
				</p>
				<div class="input-row-grid">
					<div class="input-pair">
						<label for="fourier-period-input" class="field-label">
							Period <MathInline math={"T_0"} />:
						</label>
						<div class="input-with-unit">
							<input
								id="fourier-period-input"
								type="text"
								class="text-input"
								placeholder="e.g. 2"
								bind:value={s1Period}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep1()}
							/>
							<select
								class="unit-select"
								bind:value={s1PeriodUnit}
							>
								<option value="s">s</option>
								<option value="ms">ms</option>
							</select>
						</div>
					</div>

					<div class="input-pair">
						<label for="fourier-freq-input" class="field-label">
							Frequency <MathInline
								math={"\\omega_0 = \\frac{2\\pi}{T_0}"}
							/>:
						</label>
						<div class="input-with-unit">
							<input
								id="fourier-freq-input"
								type="text"
								class="text-input"
								placeholder="e.g. \pi or 3.14"
								bind:value={s1Freq}
								onkeydown={(e) =>
									e.key === "Enter" && checkStep1()}
							/>
							<select class="unit-select" bind:value={s1FreqUnit}>
								<option value="rad/s">rad/s</option>
								<option value="Hz">Hz</option>
							</select>
						</div>
					</div>
				</div>

				<div class="step-actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={checkStep1}
					>
						Check Period & Frequency →
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Period: <MathInline math={problem.periodLatex} />,
					Frequency: <MathInline math={problem.omega0Latex} />
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 2: Symmetry Classification -->
	<div
		class="step-card"
		class:active={currentStep === 2}
		class:done={currentStep > 2}
		class:locked={currentStep < 2}
	>
		<div class="step-header">
			<div class="step-badge">Step 2</div>
			<h3 class="step-title">Signal Symmetry Classification</h3>
		</div>

		{#if currentStep === 2}
			<div class="step-body">
				<p class="step-prompt">
					Classify the symmetry of <MathInline math={"x(t)"} /> across
					the origin and axes:
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "even"}
						onclick={() => checkStep2("even")}
					>
						<strong>Even Symmetry</strong>
						<span class="choice-sub">
							<MathInline math={"x(-t) = x(t)"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "odd"}
						onclick={() => checkStep2("odd")}
					>
						<strong>Odd Symmetry</strong>
						<span class="choice-sub">
							<MathInline math={"x(-t) = -x(t)"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "none"}
						onclick={() => checkStep2("none")}
					>
						<strong>Neither Symmetry</strong>
						<span class="choice-sub">Asymmetric / Shifted</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s2Selected === "half_wave"}
						onclick={() => checkStep2("half_wave")}
					>
						<strong>Half-Wave Odd</strong>
						<span class="choice-sub">
							<MathInline math={"x(t - T_0/2) = -x(t)"} />
						</span>
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 2}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Symmetry: <strong class="capitalize">
						{problem.coeffs.symmetry}
					</strong>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 3: Vanishing Coefficients -->
	<div
		class="step-card"
		class:active={currentStep === 3}
		class:done={currentStep > 3}
		class:locked={currentStep < 3}
	>
		<div class="step-header">
			<div class="step-badge">Step 3</div>
			<h3 class="step-title">Vanishing Coefficient Shortcuts</h3>
		</div>

		{#if currentStep === 3}
			<div class="step-body">
				<p class="step-prompt">
					Based on the <strong class="capitalize">
						{problem.coeffs.symmetry}
					</strong> symmetry, which Fourier coefficients vanish to zero?
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={s3Selected === "bn_zero"}
						onclick={() => checkStep3("bn_zero")}
					>
						<strong><MathInline math={"b_n = 0"} /></strong>
						<span class="choice-sub">
							Only cosine terms (<MathInline math={"a_n"} />)
							exist
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s3Selected === "an_zero"}
						onclick={() => checkStep3("an_zero")}
					>
						<strong>
							<MathInline math={"a_0 = 0, \\; a_n = 0"} />
						</strong>
						<span class="choice-sub">
							Only sine terms (<MathInline math={"b_n"} />) exist
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s3Selected === "none"}
						onclick={() => checkStep3("none")}
					>
						<strong>No Coefficients Vanish</strong>
						<span class="choice-sub">
							Must compute both <MathInline math={"a_n"} /> and <MathInline
								math={"b_n"}
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
					Shortcut:
					{#if problem.coeffs.symmetry === "even"}
						<MathInline math={"b_n = 0 \\implies"} /> Cosine harmonics
						only
					{:else if problem.coeffs.symmetry === "odd"}
						<MathInline math={"a_0 = 0, \\; a_n = 0 \\implies"} /> Sine
						harmonics only
					{:else}
						All coefficients active
					{/if}
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 4: Representation Form -->
	<div
		class="step-card"
		class:active={currentStep === 4}
		class:done={currentStep > 4}
		class:locked={currentStep < 4}
	>
		<div class="step-header">
			<div class="step-badge">Step 4</div>
			<h3 class="step-title">Optimal Representation Form</h3>
		</div>

		{#if currentStep === 4}
			<div class="step-body">
				<p class="step-prompt">
					Which Fourier series representation is most efficient to
					calculate for this waveform?
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={s4Selected === "trig"}
						onclick={() => checkStep4("trig")}
					>
						<strong>Trigonometric Form</strong>
						<span class="choice-sub">
							Ideal when symmetries eliminate <MathInline
								math={"a_n"}
							/> or <MathInline math={"b_n"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s4Selected === "exp"}
						onclick={() => checkStep4("exp")}
					>
						<strong>Exponential Form</strong>
						<span class="choice-sub">
							Single integral for <MathInline math={"c_n"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={s4Selected === "compact"}
						onclick={() => checkStep4("compact")}
					>
						<strong>Compact Polar Form</strong>
						<span class="choice-sub">
							<MathInline
								math={"c_0 + \\sum C_n \\cos(n \\omega_0 t - \\theta_n)"}
							/>
						</span>
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if currentStep > 4}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					Optimal Form:
					<strong>
						{#if problem.coeffs.symmetry !== "none"}
							Trigonometric Form
						{:else}
							Exponential Form
						{/if}
					</strong>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 5: Integral Setup -->
	<div
		class="step-card"
		class:active={currentStep === 5}
		class:done={currentStep > 5}
		class:locked={currentStep < 5}
	>
		<div class="step-header">
			<div class="step-badge">Step 5</div>
			<h3 class="step-title">Integral Setup Formulation</h3>
		</div>

		{#if currentStep === 5}
			<div class="step-body">
				<p class="step-prompt">
					Select the correct integral formulation to compute the
					non-zero Fourier coefficients:
				</p>
				<div class="mcq-cards-grid">
					{#each problem.itsData.step5.options as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={s5Selected === opt.id}
							onclick={() => checkStep5(opt)}
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
		{:else if currentStep > 5}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>Integral Form: Validated</span>
			</div>
		{/if}
	</div>

	<!-- Step 6: Final Series Expression -->
	<div
		class="step-card"
		class:active={currentStep === 6}
		class:done={currentStep > 6}
		class:locked={currentStep < 6}
	>
		<div class="step-header">
			<div class="step-badge">Step 6</div>
			<h3 class="step-title">Final Fourier Series Expression</h3>
		</div>

		{#if currentStep === 6}
			<div class="step-body">
				<p class="step-prompt">
					Select the evaluated closed-form Fourier Series
					representation for <MathInline math={"x(t)"} />:
				</p>
				<div class="mcq-cards-grid">
					{#each problem.itsData.step6.options as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={s6Selected === opt.id}
							onclick={() => checkStep6(opt)}
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
		{:else if currentStep > 6}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>Fourier Series Synthesized</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.fourier-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.steps-progress-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 0.85rem;
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
		padding: 0.25rem 0.5rem;
	}

	.progress-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.progress-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.55rem;
		height: 1.55rem;
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
		color: #151515;
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
		max-width: 100%;
		min-width: 0;
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
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
	}

	.step-badge {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-primary);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.step-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
		line-height: 1.3;
	}

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: 0.9rem;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
	}

	.step-summary {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
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
		width: 100%;
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
		min-width: 0;
		width: 100%;
	}

	.field-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.input-with-unit {
		display: flex;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		background: var(--bg-input);
		overflow: hidden;
		max-width: 100%;
	}

	.text-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: 0.9rem;
		outline: none;
	}

	.text-input:focus-visible {
		outline: 2px solid var(--accent-primary);
	}

	.unit-select {
		flex-shrink: 0;
		background: var(--bg-secondary);
		border: none;
		border-left: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		outline: none;
		cursor: pointer;
	}

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
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
		max-width: 100%;
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
		width: 100%;
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
		max-width: 100%;
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
		white-space: normal;
		line-height: 1.35;
		text-wrap: balance;
		max-width: 100%;
	}

	.btn-primary:hover {
		background: var(--accent-hover);
	}

	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	@container (max-width: 360px) {
		.step-card {
			padding: 0.75rem 0.85rem;
		}

		.step-actions {
			width: 100%;
		}

		.btn-primary {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
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

	.capitalize {
		text-transform: capitalize;
	}
</style>
