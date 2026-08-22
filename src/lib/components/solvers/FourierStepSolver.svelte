<script lang="ts">
	/**
	 * FourierStepSolver Svelte 5 Component.
	 *
	 * 7-Step Intelligent Tutoring System (ITS) for Fourier Series.
	 *
	 * Guides students sequentially through period/frequency, symmetry classification,
	 * vanishing shortcuts, form selection, integral setup, coefficient evaluation,
	 * and final series synthesis using standardized StepCard and PartProgressPill
	 * architecture (ADR-0034).
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series";
	import MathBlock from "../math/MathBlock.svelte";
	import MathText from "../math/MathText.svelte";
	import PartProgressPill from "../ui/PartProgressPill.svelte";
	import Progress from "../ui/Progress.svelte";
	import StepCard from "../ui/StepCard.svelte";
	import StepFeedback from "../ui/StepFeedback.svelte";
	import { FourierStepSolverState } from "./fourier-step-solver.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Callback triggered when all 7 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Reactive step solver controller
	const solver = new FourierStepSolverState(
		() => problem,
		() => onComplete,
	);

	const activeStep5Index = $derived(
		problem.itsData.step5.parts.findIndex(
			({ id }) => id === solver.step5.activeSubStepId,
		),
	);
	const activeStep5Part = $derived(
		problem.itsData.step5.parts.find(
			({ id }) => id === solver.step5.activeSubStepId,
		),
	);

	const activeStep6Index = $derived(
		problem.itsData.step6.parts.findIndex(
			({ id }) => id === solver.step6.activeSubStepId,
		),
	);
	const activeStep6Part = $derived(
		problem.itsData.step6.parts.find(
			({ id }) => id === solver.step6.activeSubStepId,
		),
	);

	// Reset state when problem instance changes
	let lastProblemId = "";
	$effect(() => {
		if (problem.id !== lastProblemId) {
			lastProblemId = problem.id;
			solver.reset();
		}
	});

	/** Step status derivations */
	const step1Status = $derived(
		solver.currentStep === 1
			? "active"
			: solver.currentStep > 1
				? "completed"
				: "locked",
	);
	const step2Status = $derived(
		solver.currentStep === 2
			? "active"
			: solver.currentStep > 2
				? "completed"
				: "locked",
	);
	const step3Status = $derived(
		solver.currentStep === 3
			? "active"
			: solver.currentStep > 3
				? "completed"
				: "locked",
	);
	const step4Status = $derived(
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
	const step5Status = $derived(
		solver.currentStep === 5
			? "active"
			: solver.currentStep > 5
				? "completed"
				: "locked",
	);
	const step6Status = $derived(
		solver.currentStep === 6
			? "active"
			: solver.currentStep > 6
				? "completed"
				: "locked",
	);
	const step7Status = $derived(
		solver.currentStep === 7
			? "active"
			: solver.currentStep > 7
				? "completed"
				: "locked",
	);
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

<!-- Header Extras for Multi-Part Steps -->
{#snippet step2HeaderExtra()}
	{#if step2Status === "active"}
		<PartProgressPill progress={solver.step2Progress} />
	{/if}
{/snippet}

{#snippet step5HeaderExtra()}
	{#if step5Status === "active"}
		<PartProgressPill progress={solver.step5Progress} />
	{/if}
{/snippet}

{#snippet step6HeaderExtra()}
	{#if step6Status === "active"}
		<PartProgressPill progress={solver.step6Progress} />
	{/if}
{/snippet}

<!-- Summaries for Completed Steps -->
{#snippet step2Summary()}
	<span>
		Origin parity: <strong class="capitalize"
			>{problem.coeffs.originParity}</strong
		>; half-wave symmetry:
		<strong>
			{problem.coeffs.hasHalfWaveSymmetry ? "yes" : "no"}
		</strong>
	</span>
{/snippet}

{#snippet step3Summary()}
	<span>
		Shortcut:
		{#if problem.coeffs.symmetry === "even"}
			<MathText
				text={String.raw`$b_n = 0 \implies$ Cosine harmonics only`}
			/>
		{:else if problem.coeffs.symmetry === "odd"}
			<MathText
				text={String.raw`$a_0 = 0, \; a_n = 0 \implies$ Sine harmonics only`}
			/>
		{:else}
			All coefficients active
		{/if}
	</span>
{/snippet}

{#snippet step4Summary()}
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
{/snippet}

<div class="fourier-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<!-- Step 1: Period and Frequency -->
	<StepCard
		stepNumber={1}
		title="Fundamental Period & Frequency"
		status={step1Status}
		summaryLatex={String.raw`T_0 = ${problem.periodLatex}, \quad \omega_0 = ${problem.omega0Latex}`}
	>
		<div class="step-body">
			<p class="step-prompt">
				<MathText
					text={String.raw`Enter the fundamental period $T_0$ and fundamental frequency $\omega_0$ from the waveform definition:`}
				/>
			</p>
			<div class="input-row-grid">
				<div class="input-pair">
					<label
						for="fourier-period-input"
						class="field-label"
					>
						<MathText text={"Period $T_0$:"} />
					</label>
					<div class="input-with-unit">
						<input
							id="fourier-period-input"
							type="text"
							class="text-input"
							placeholder="e.g. 2 or 1/4"
							bind:value={solver.step1.period}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep1()}
						/>
						<select
							class="unit-select"
							bind:value={solver.step1.periodUnit}
							aria-label="Period time unit"
						>
							<option value="s">s</option>
							<option value="ms">ms</option>
						</select>
					</div>
				</div>

				<div class="input-pair">
					<label
						for="fourier-freq-input"
						class="field-label"
					>
						<MathText
							text={String.raw`Fundamental Freq $\omega_0$:`}
						/>
					</label>
					<div class="input-with-unit">
						<input
							id="fourier-freq-input"
							type="text"
							class="text-input"
							placeholder="e.g. pi or pi/2"
							bind:value={solver.step1.freq}
							onkeydown={(e) =>
								e.key === "Enter" && solver.checkStep1()}
						/>
						<select
							class="unit-select"
							bind:value={solver.step1.freqUnit}
							aria-label="Frequency unit"
						>
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
					onclick={() => solver.checkStep1()}
				>
					Check Period & Frequency →
				</button>
			</div>
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 2: Symmetry Analysis (Multi-Part Step) -->
	<StepCard
		stepNumber={2}
		title="Waveform Symmetry Analysis"
		status={step2Status}
		headerExtra={step2HeaderExtra}
		summarySnippet={step2Summary}
	>
		<div class="step-body">
			{#if solver.step2.activeSubStepId === "origin-parity"}
				<!-- Part 2A: Origin Parity -->
				<div class="subpart-block">
					<div class="subpart-header">
						<span class="subpart-badge">Part 2A</span>
						<h4 class="subpart-title">
							<MathText text="Classify Origin Parity" />
						</h4>
					</div>
					<p class="step-prompt">
						<MathText
							text={"Classify the parity of $x(t)$ about the time origin:"}
						/>
					</p>
					<div
						class="button-grid-taxonomic"
						data-testid="fourier-step2-origin-options"
					>
						<button
							type="button"
							class="choice-btn"
							class:selected={solver.step2.subSteps[
								"origin-parity"
							].selected === "even"}
							onclick={() =>
								(solver.step2.subSteps[
									"origin-parity"
								].selected = "even")}
						>
							<strong>Even Symmetry</strong>
							<span class="choice-sub"
								><MathText text={"$x(-t) = x(t)$"} /></span
							>
						</button>
						<button
							type="button"
							class="choice-btn"
							class:selected={solver.step2.subSteps[
								"origin-parity"
							].selected === "odd"}
							onclick={() =>
								(solver.step2.subSteps[
									"origin-parity"
								].selected = "odd")}
						>
							<strong>Odd Symmetry</strong>
							<span class="choice-sub"
								><MathText text={"$x(-t) = -x(t)$"} /></span
							>
						</button>
						<button
							type="button"
							class="choice-btn"
							class:selected={solver.step2.subSteps[
								"origin-parity"
							].selected === "none"}
							onclick={() =>
								(solver.step2.subSteps[
									"origin-parity"
								].selected = "none")}
						>
							<strong>Neither Symmetry</strong>
							<span class="choice-sub">Asymmetric / Shifted</span>
						</button>
					</div>
					<div class="step-actions">
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => solver.checkStep2OriginParity()}
						>
							Check Origin Parity →
						</button>
					</div>
				</div>
			{:else}
				<!-- Verified Part 2A Summary -->
				<div class="subpart-block subpart-done">
					<div class="subpart-header">
						<span class="subpart-badge">Part 2A</span>
						<h4 class="subpart-title">
							<MathText text="Classify Origin Parity" />
						</h4>
						<span class="substep-check-badge">
							<span class="check-icon">✓</span> Verified
						</span>
					</div>
					<div class="substep-verified-line">
						Origin parity validated: <strong class="capitalize"
							>{problem.coeffs.originParity}</strong
						>
					</div>
				</div>

				<!-- Part 2B: Half-Wave Symmetry -->
				<div class="subpart-block">
					<div class="subpart-header">
						<span class="subpart-badge">Part 2B</span>
						<h4 class="subpart-title">
							<MathText text="Test Half-Wave Symmetry" />
						</h4>
					</div>
					<p class="step-prompt">
						<MathText
							text={"Half-wave symmetry means the second half of each period is an upside-down copy of the first half. Equivalently, shifting the signal by half a period reverses its sign: $x(t+T_0/2)=-x(t)$."}
						/>
					</p>
					<div
						class="button-grid-taxonomic"
						data-testid="fourier-step2-half-wave-options"
					>
						<button
							type="button"
							class="choice-btn"
							class:selected={solver.step2.subSteps["half-wave"]
								.selected === true}
							onclick={() =>
								(solver.step2.subSteps["half-wave"].selected =
									true)}
						>
							<strong>Has Half-Wave Symmetry</strong>
						</button>
						<button
							type="button"
							class="choice-btn"
							class:selected={solver.step2.subSteps["half-wave"]
								.selected === false}
							onclick={() =>
								(solver.step2.subSteps["half-wave"].selected =
									false)}
						>
							<strong>No Half-Wave Symmetry</strong>
						</button>
					</div>
					<div class="step-actions">
						<button
							type="button"
							class="btn btn-primary"
							onclick={() => solver.checkStep2HalfWave()}
						>
							Check Half-Wave Symmetry →
						</button>
					</div>
				</div>
			{/if}
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 3: Coefficient Shortcuts -->
	<StepCard
		stepNumber={3}
		title="Vanishing Coefficient Shortcuts"
		status={step3Status}
		summarySnippet={step3Summary}
	>
		<div class="step-body">
			<p class="step-prompt">
				Based on the identified symmetry, which coefficients vanish:
			</p>
			<div class="button-grid-taxonomic">
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step3.selected === "bn_zero"}
					onclick={() => solver.checkStep3("bn_zero")}
				>
					<strong><MathText text={"$b_n = 0$"} /></strong>
					<span class="choice-sub">
						<MathText text={"Only cosine terms ($a_n$) exist"} />
					</span>
				</button>
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step3.selected === "an_zero"}
					onclick={() => solver.checkStep3("an_zero")}
				>
					<strong>
						<MathText text={String.raw`$a_0 = 0, \; a_n = 0$`} />
					</strong>
					<span class="choice-sub">
						<MathText text={"Only sine terms ($b_n$) exist"} />
					</span>
				</button>
				<button
					type="button"
					class="choice-btn"
					class:selected={solver.step3.selected === "none"}
					onclick={() => solver.checkStep3("none")}
				>
					<strong>No Coefficients Vanish</strong>
					<span class="choice-sub">
						<MathText text={"Must compute both $a_n$ and $b_n$"} />
					</span>
				</button>
			</div>
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 4: Representation Form -->
	<StepCard
		stepNumber={4}
		title="Optimal Representation Form"
		status={step4Status}
		summarySnippet={step4Summary}
	>
		<div class="step-body">
			<p class="step-prompt">
				Which Fourier series representation is most efficient to
				calculate for this waveform?
			</p>
			<div class="button-grid-taxonomic">
				<button
					type="button"
					class="choice-btn representation-choice"
					class:selected={solver.step4.selected === "trig"}
					onclick={() => solver.checkStep4("trig")}
				>
					<strong>Trigonometric Form</strong>
					<div class="choice-sub representation-content">
						<MathText
							text={"Ideal when symmetries eliminate $a_n$ or $b_n$"}
						/>
						<MathBlock
							math={"a_n \\cos(n \\omega_0 t) + b_n \\sin(n \\omega_0 t)"}
							compact={true}
							hideHeader={true}
						/>
					</div>
				</button>
				<button
					type="button"
					class="choice-btn representation-choice"
					class:selected={solver.step4.selected === "exp"}
					onclick={() => solver.checkStep4("exp")}
				>
					<strong>Exponential Form</strong>
					<div class="choice-sub representation-content">
						<MathText text={"Single integral for $F_n$"} />
						<MathBlock
							math={"F_n e^{j n \\omega_0 t}"}
							compact={true}
							hideHeader={true}
						/>
					</div>
				</button>
				<button
					type="button"
					class="choice-btn representation-choice"
					class:selected={solver.step4.selected === "compact"}
					onclick={() => solver.checkStep4("compact")}
				>
					<strong>Compact Harmonic Form</strong>
					<div class="choice-sub representation-content">
						<span>Amplitude-Phase</span>
						<MathBlock
							math={"c_n \\cos(n \\omega_0 t + \\theta_n)"}
							compact={true}
							hideHeader={true}
						/>
					</div>
				</button>
			</div>
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 5: Integral Setup (Multi-Part Step) -->
	<StepCard
		stepNumber={5}
		title="Integral Setup Formulation"
		status={step5Status}
		headerExtra={step5HeaderExtra}
		summaryLatex={"\\text{Integral Form: Validated}"}
	>
		<div class="step-body">
			<div class="subpart-block">
				<div class="subpart-header">
					<span class="subpart-badge"
						>Part 5{String.fromCharCode(
							65 + Math.max(0, activeStep5Index),
						)}</span
					>
					<h4 class="subpart-title">
						<MathText text={activeStep5Part?.title ?? ""} />
					</h4>
				</div>

				{#if problem.itsData.step5.carriedCoefficients.length > 0}
					<div class="carried-coefficients">
						{#each problem.itsData.step5.carriedCoefficients as carried}
							<div>
								<MathText
									text={`$${carried.latex}$ — ${carried.reason}`}
								/>
							</div>
						{/each}
					</div>
				{/if}

				<p class="step-prompt">
					<MathText text={activeStep5Part?.prompt ?? ""} />
				</p>
				<div
					class="mcq-cards-grid"
					data-testid="fourier-step5-options"
				>
					{#each activeStep5Part?.options ?? [] as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={solver.step5.subSteps[
								solver.step5.activeSubStepId
							]?.selected === opt.id}
							onclick={() => solver.checkStep5(opt)}
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
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 6: Harmonic Coefficient Evaluation (Multi-Part Step) -->
	<StepCard
		stepNumber={6}
		title="Harmonic Coefficient Evaluation"
		status={step6Status}
		headerExtra={step6HeaderExtra}
		summaryLatex={"\\text{Harmonic Coefficients Evaluated}"}
	>
		<div class="step-body">
			<div class="subpart-block">
				<div class="subpart-header">
					<span class="subpart-badge"
						>Part 6{String.fromCharCode(
							65 + Math.max(0, activeStep6Index),
						)}</span
					>
					<h4 class="subpart-title">
						<MathText text={activeStep6Part?.title ?? ""} />
					</h4>
				</div>

				{#if problem.itsData.step6.carriedCoefficients.length > 0}
					<div class="carried-coefficients">
						{#each problem.itsData.step6.carriedCoefficients as carried}
							<div>
								<MathText
									text={`$${carried.latex}$ — ${carried.reason}`}
								/>
							</div>
						{/each}
					</div>
				{/if}

				<p class="step-prompt">
					<MathText text={activeStep6Part?.prompt ?? ""} />
				</p>
				<div
					class="mcq-cards-grid"
					data-testid="fourier-step6-options"
				>
					{#each activeStep6Part?.options ?? [] as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={solver.step6.subSteps[
								solver.step6.activeSubStepId
							]?.selected === opt.id}
							onclick={() => solver.checkStep6(opt)}
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
		</div>
		{@render feedbackAndHints()}
	</StepCard>

	<!-- Step 7: Final Series Expression -->
	<StepCard
		stepNumber={7}
		title="Final Fourier Series Expression"
		status={step7Status}
		summaryLatex={"\\text{Fourier Series Synthesized}"}
	>
		<div class="step-body">
			<p class="step-prompt">
				<MathText
					text={`Select the final ${problem.itsData.step7.form === "trig" ? "trigonometric" : "exponential"} Fourier series for $x(t)$:`}
				/>
			</p>
			<div class="mcq-cards-grid">
				{#each problem.itsData.step7.options as opt}
					<button
						type="button"
						class="mcq-card"
						class:selected={solver.step7.selected === opt.id}
						onclick={() => solver.checkStep7(opt)}
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
	</StepCard>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.fourier-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	/* ── Step body & prompt ────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* ── Subpart blocks & headers ──────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
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
		text-transform: uppercase;
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	.subpart-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.substep-check-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-success, #10b981);
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	.substep-verified-line {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 600;
		padding: 0.25rem 0;
	}

	.carried-coefficients {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: var(--text-xs);
	}

	.check-icon {
		color: var(--color-success);
		font-weight: 800;
	}

	/* ── Input pairs & row grid ────────────────────────────── */

	.input-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
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
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* ── Composite input with unit selector ────────────────── */

	.input-with-unit {
		display: flex;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		max-width: 100%;
		transition: border-color 0.2s ease;
	}

	.input-with-unit:focus-within {
		border-color: var(--accent-primary);
	}

	.text-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		padding: 0.5rem 0.75rem;
		color: var(--text-primary);
		font-size: var(--text-sm);
		border-top-left-radius: var(--radius-sm);
		border-bottom-left-radius: var(--radius-sm);
	}

	.text-input:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--accent-primary);
		outline-offset: 0;
	}

	.unit-select {
		flex-shrink: 0;
		background: var(--bg-secondary);
		border: none;
		border-left: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0 0.5rem;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		border-top-right-radius: var(--radius-sm);
		border-bottom-right-radius: var(--radius-sm);
	}

	.unit-select:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--accent-primary);
		outline-offset: 0;
	}

	/* ── Multiple choice button grid ───────────────────────── */

	.button-grid-taxonomic {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
		gap: 0.75rem;
		width: 100%;
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
		background: var(--accent-bg);
	}

	.choice-sub {
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.representation-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		width: 100%;
		text-align: left;
	}

	.representation-content :global(.math-block) {
		width: 100%;
		margin: 0;
		background: transparent;
		border: none;
	}

	.representation-content :global(.katex-display),
	.representation-content :global(.katex-display > .katex) {
		text-align: left;
	}

	/* ── Multiple choice math cards ────────────────────────── */

	.mcq-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		width: 100%;
	}

	.mcq-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
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
		white-space: normal;
		line-height: var(--leading-snug);
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

	/* ── Tiered hints disclosure ───────────────────────────── */

	.hints-box {
		background: var(--bg-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-top: 0.75rem;
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

	.capitalize {
		text-transform: capitalize;
	}

	/* ── Container queries (≤620px) ────────────────────────── */

	@container (max-width: 620px) {
		.input-row-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.step-actions {
			width: 100%;
		}

		.btn-primary {
			width: 100%;
			text-align: center;
			justify-content: center;
		}

		.subpart-header {
			gap: 0.35rem;
		}
	}

	/* ── Mobile media query (≤640px) ─────────────────────── */

	@media (max-width: 640px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
