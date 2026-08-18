<script lang="ts">
	/**
	 * FourierStepSolver Svelte 5 Component.
	 *
	 * 6-Step Intelligent Tutoring System (ITS) for Fourier Series.
	 * Guides students sequentially through period/frequency, symmetry classification,
	 * vanishing shortcuts, form selection, integral setup, and final series evaluation.
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series";
	import MathBlock from "../math/MathBlock.svelte";
	import MathText from "../math/MathText.svelte";
	import Progress from "../ui/Progress.svelte";
	import StepFeedback from "../ui/StepFeedback.svelte";
	import { FourierStepSolverState } from "./fourier-step-solver.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Callback triggered when all 6 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Reactive step solver controller
	const solver = new FourierStepSolverState(
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
	{#if solver.currentStep <= 6}
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

<div class="fourier-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<!-- Step 1: Period and Frequency -->
	<div
		class="step-card"
		class:active={solver.currentStep === 1}
		class:done={solver.currentStep > 1}
	>
		<div class="step-header">
			<div class="step-badge">Step 1</div>
			<h3 class="step-title">Fundamental Period & Frequency</h3>
		</div>

		{#if solver.currentStep === 1}
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
		{:else if solver.currentStep > 1}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>
					<MathText
						text={String.raw`$T_0 = ${problem.periodLatex}, \quad \omega_0 = ${problem.omega0Latex}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Step 2: Symmetry Analysis -->
	<div
		class="step-card"
		class:active={solver.currentStep === 2}
		class:done={solver.currentStep > 2}
		class:locked={solver.currentStep < 2}
	>
		<div class="step-header">
			<div class="step-badge">Step 2</div>
			<h3 class="step-title">Waveform Symmetry Analysis</h3>
		</div>

		{#if solver.currentStep === 2}
			<div class="step-body">
				<p class="step-prompt">
					<MathText
						text={"Classify the symmetry of $x(t)$ across the origin and axes:"}
					/>
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.selected === "even"}
						onclick={() => solver.checkStep2("even")}
					>
						<strong>Even Symmetry</strong>
						<span class="choice-sub">
							<MathText text={"$x(-t) = x(t)$"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.selected === "odd"}
						onclick={() => solver.checkStep2("odd")}
					>
						<strong>Odd Symmetry</strong>
						<span class="choice-sub">
							<MathText text={"$x(-t) = -x(t)$"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.selected === "none"}
						onclick={() => solver.checkStep2("none")}
					>
						<strong>Neither Symmetry</strong>
						<span class="choice-sub">Asymmetric / Shifted</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step2.selected === "half_wave"}
						onclick={() => solver.checkStep2("half_wave")}
					>
						<strong>Half-Wave Odd</strong>
						<span class="choice-sub">
							<MathText text={"$x(t - T_0/2) = -x(t)$"} />
						</span>
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 2}
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

	<!-- Step 3: Coefficient Shortcuts -->
	<div
		class="step-card"
		class:active={solver.currentStep === 3}
		class:done={solver.currentStep > 3}
		class:locked={solver.currentStep < 3}
	>
		<div class="step-header">
			<div class="step-badge">Step 3</div>
			<h3 class="step-title">Vanishing Coefficient Shortcuts</h3>
		</div>

		{#if solver.currentStep === 3}
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
							<MathText
								text={"Only cosine terms ($a_n$) exist"}
							/>
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step3.selected === "an_zero"}
						onclick={() => solver.checkStep3("an_zero")}
					>
						<strong>
							<MathText
								text={String.raw`$a_0 = 0, \; a_n = 0$`}
							/>
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
							<MathText
								text={"Must compute both $a_n$ and $b_n$"}
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
			</div>
		{/if}
	</div>

	<!-- Step 4: Representation Form -->
	<div
		class="step-card"
		class:active={solver.currentStep === 4}
		class:done={solver.currentStep > 4}
		class:locked={solver.currentStep < 4}
	>
		<div class="step-header">
			<div class="step-badge">Step 4</div>
			<h3 class="step-title">Optimal Representation Form</h3>
		</div>

		{#if solver.currentStep === 4}
			<div class="step-body">
				<p class="step-prompt">
					Which Fourier series representation is most efficient to
					calculate for this waveform?
				</p>
				<div class="button-grid-taxonomic">
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step4.selected === "trig"}
						onclick={() => solver.checkStep4("trig")}
					>
						<strong>Trigonometric Form</strong>
						<span class="choice-sub">
							<MathText
								text={"Ideal when symmetries eliminate $a_n$ or $b_n$"}
							/>
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step4.selected === "exp"}
						onclick={() => solver.checkStep4("exp")}
					>
						<strong>Exponential Form</strong>
						<span class="choice-sub">
							<MathText text={"Single integral for $c_n$"} />
						</span>
					</button>
					<button
						type="button"
						class="choice-btn"
						class:selected={solver.step4.selected === "compact"}
						onclick={() => solver.checkStep4("compact")}
					>
						<strong>Compact Harmonic Form</strong>
						<span class="choice-sub">
							Amplitude-Phase <MathBlock
								math={"A_n \\cos(n \\omega_0 t + \\theta_n)"}
								compact={true}
							/>
						</span>
					</button>
				</div>
			</div>
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 4}
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
		class:active={solver.currentStep === 5}
		class:done={solver.currentStep > 5}
		class:locked={solver.currentStep < 5}
	>
		<div class="step-header">
			<div class="step-badge">Step 5</div>
			<h3 class="step-title">Integral Setup Formulation</h3>
		</div>

		{#if solver.currentStep === 5}
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
							class:selected={solver.step5.selected === opt.id}
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
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 5}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>Integral Form: Validated</span>
			</div>
		{/if}
	</div>

	<!-- Step 6: Final Series Expression -->
	<div
		class="step-card"
		class:active={solver.currentStep === 6}
		class:done={solver.currentStep > 6}
		class:locked={solver.currentStep < 6}
	>
		<div class="step-header">
			<div class="step-badge">Step 6</div>
			<h3 class="step-title">Final Fourier Series Expression</h3>
		</div>

		{#if solver.currentStep === 6}
			<div class="step-body">
				<p class="step-prompt">
					<MathText
						text={String.raw`Select the evaluated closed-form Fourier Series representation for $x(t)$:`}
					/>
				</p>
				<div class="mcq-cards-grid">
					{#each problem.itsData.step6.options as opt}
						<button
							type="button"
							class="mcq-card"
							class:selected={solver.step6.selected === opt.id}
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
			{@render feedbackAndHints()}
		{:else if solver.currentStep > 6}
			<div class="step-summary">
				<span class="check-icon">✓</span>
				<span>Fourier Series Synthesized</span>
			</div>
		{/if}
	</div>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.fourier-step-solver {
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
		max-width: 100%;
		min-width: 0;
	}

	/* Active — accent primary border + subtle glow */
	.step-card.active {
		border-color: var(--accent-primary);
		box-shadow: 0 2px 12px var(--accent-glow);
	}

	/* Done — green border tint, compact padding */
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
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
	}

	.step-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.step-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
		line-height: var(--leading-tight);
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

	.step-summary {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text-secondary);
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

	/* ── Mobile media query (≤640px) ─────────────────────── */

	@media (max-width: 640px) {
		.mcq-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
