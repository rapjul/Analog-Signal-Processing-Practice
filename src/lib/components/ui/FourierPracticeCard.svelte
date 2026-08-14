<script lang="ts">
	/**
	 * FourierPracticeCard Svelte 5 Component.
	 * Displays Fourier Series practice statement, embedded dual-panel partial sum & spectrum visualizer,
	 * guided coefficient form input (via MathInputBar), validation feedback, and step reveal breakdown.
	 */

	import {
		validateLatexAnswer,
		type ValidationResult,
	} from "$lib/math-engine/evaluator";
	import {
		computePartialSum,
		type FourierSeriesProblem,
	} from "$lib/math-engine/fourier-series";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import FourierCanvas from "../canvas/FourierCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathInputBar from "../math/MathInputBar.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import StepReveal from "./StepReveal.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Handler for generating next problem */
		onNextProblem: () => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { problem, onNextProblem }: Props = $props();

	// Interactive state
	let studentLatex = $state("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let validationResult = $state<ValidationResult | null>(null);

	// Reset state when problem changes
	$effect(() => {
		studentLatex = "";
		validationResult = null;
	});

	/**
	 * Validates student solution against partial sum evaluation function at N=10 harmonics.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleSubmit() {
		const refEval = (t: number) => computePartialSum(problem.coeffs, 10, t);
		validationResult = validateLatexAnswer(studentLatex, refEval);
	}

	// Constants for UI KaTeX markup
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const fourierTrigMath =
		"x(t) = a_0 + \\sum_{n=1}^{\\infty} \\left[ a_n \\cos(n \\omega_0 t) + b_n \\sin(n \\omega_0 t) \\right]";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const fourierExpMath =
		"x(t) = \\sum_{n=-\\infty}^{\\infty} c_n e^{j n \\omega_0 t}";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const placeholderText =
		"e.g. \\sum_{n=1}^{\\infty} \\frac{4}{\\pi n} \\sin(n \\pi t)";
</script>

<div class="fourier-practice-card">
	<div class="card-header">
		<div class="problem-meta">
			<span class="badge category">Fourier Series</span>
			<h2 class="problem-title">{problem.title}</h2>
		</div>
		<button type="button" class="btn btn-next" onclick={onNextProblem}>
			🎲 Generate Next Problem
		</button>
	</div>

	<!-- Problem Statement -->
	<div class="problem-statement">
		<p class="statement-text">
			Derive the Trigonometric <MathInline math={"(a_0, a_n, b_n)"} /> or Complex
			Exponential <MathInline math={"(c_n)"} /> Fourier series coefficients
			for the given periodic signal:
		</p>
		<MathBlock math={problem.signalLatex} />
		<div class="period-info">
			<span class="info-tag">
				Period: <MathInline math={problem.periodLatex} />
			</span>
			<span class="info-tag">
				Fundamental Freq: <MathInline math={problem.omega0Latex} />
			</span>
		</div>
		<div class="formulas-preview">
			<MathBlock math={fourierTrigMath} />
			<MathBlock math={fourierExpMath} />
		</div>
	</div>

	<!-- Embedded Fourier Partial Sum & Spectrum Visualizer -->
	<FourierCanvas
		waveformType={problem.waveformType}
		harmonicCount={5}
		title="Live Partial Sum & Harmonic Spectrum Canvas"
	/>

	<!-- Guided Input Section -->
	<div class="input-section">
		<h3 class="section-subtitle">
			Enter Fourier Coefficients / Series Expression:
		</h3>
		<MathInputBar
			bind:value={studentLatex}
			inputType="fourier"
			label="Build Fourier coefficients ($a_0$, $a_n$, $b_n$, $c_n$) or type LaTeX:"
			placeholder={placeholderText}
		/>

		<div class="action-bar">
			<button type="button" class="btn btn-submit" onclick={handleSubmit}>
				✓ Submit & Validate Fourier Coefficients
			</button>
		</div>

		<!-- Validation Alert -->
		{#if validationResult}
			<div
				class="validation-alert"
				class:correct={validationResult.isCorrect}
				class:incorrect={!validationResult.isCorrect}
			>
				<span class="alert-icon">
					{validationResult.isCorrect ? "🎉" : "❌"}
				</span>
				<div class="alert-content">
					<span class="alert-title">
						{validationResult.isCorrect
							? "Correct Solution!"
							: "Incorrect Solution"}
					</span>
					{#if validationResult.message}
						<p class="alert-message">{validationResult.message}</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Step Reveal Solution Breakdown -->
	<StepReveal steps={problem.solutionSteps} />
</div>

<style>
	.fourier-practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.problem-meta {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.badge.category {
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid rgba(245, 158, 11, 0.3);
		width: fit-content;
	}

	.problem-title {
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.btn-next {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		font-weight: 600;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s ease;
	}

	.btn-next:hover,
	.btn-next:focus-visible {
		border-color: var(--accent-primary);
		background: var(--bg-card-hover);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.problem-statement {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.statement-text {
		font-size: 0.95rem;
		color: var(--text-secondary);
	}

	.period-info {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.info-tag {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.formulas-preview {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: var(--bg-card);
		border: 1px dashed var(--border-color);
		padding: 0.5rem;
		border-radius: var(--radius-sm);
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-subtitle {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.action-bar {
		display: flex;
		gap: 1rem;
	}

	.btn-submit {
		background: var(--accent-primary);
		color: #000;
		font-weight: 700;
		border: none;
		padding: 0.6rem 1.25rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.btn-submit:hover,
	.btn-submit:focus-visible {
		box-shadow: 0 0 14px var(--accent-glow);
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}

	.validation-alert {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}

	.validation-alert.correct {
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	.validation-alert.incorrect {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.alert-icon {
		font-size: 1.25rem;
	}

	.alert-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.alert-title {
		font-weight: 700;
	}

	.alert-message {
		font-size: 0.85rem;
		opacity: 0.9;
	}
</style>
