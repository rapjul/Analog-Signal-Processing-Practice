<script lang="ts">
	/**
	 * PracticeCard Svelte 5 Component.
	 * Displays active problem statement, multi-stage root/coefficient/LaTeX inputs,
	 * validation feedback alerts, progressive step reveal, and real-time response plots.
	 */

	import {
		type ValidationResult,
		validateLatexAnswer,
	} from "$lib/math-engine/evaluator";
	import type { OdeProblem } from "$lib/math-engine/odes";
// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import WaveformCanvas from "../canvas/WaveformCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInputBar from "../math/MathInputBar.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import StepReveal from "./StepReveal.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Handler for generating next problem */
		onNextProblem: () => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { problem, onNextProblem }: Props = $props();

	// Interactive user state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let studentRoots = $state({ r1: "", r2: "" });
	let studentLatex = $state("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let validationResult = $state<ValidationResult | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let showPlot = $state(true);

	// Reset state when problem changes
	$effect(() => {
		studentRoots = { r1: "", r2: "" };
		studentLatex = "";
		validationResult = null;
	});

	/**
	 * Submits and validates the student's solution.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleSubmit() {
		validationResult = validateLatexAnswer(
			studentLatex,
			problem.evalComplete,
		);
	}

	/**
	 * Curves to plot on WaveformCanvas
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let plotCurves = $derived([
		{
			label: "Total Solution",
			math: "y(t)",
			color: "#06b6d4",
			eval: problem.evalComplete,
		},
		{
			label: "Zero-Input",
			math: "y_{\\text{ZI}}(t)",
			color: "#f59e0b",
			eval: problem.evalZI,
		},
		{
			label: "Zero-State",
			math: "y_{\\text{ZS}}(t)",
			color: "#10b981",
			eval: problem.evalZS,
		},
	]);

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const placeholderText = "e.g. 2 e^{-2t} + e^{-3t} + 2 u(t)";
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const tGe0Math = "t \\ge 0";
</script>

<div class="practice-card">
	<div class="card-header">
		<div class="problem-meta">
			<span class="badge difficulty-{problem.difficulty}"
				>{problem.difficulty.toUpperCase()}</span
			>
			<span class="badge category">2nd-Order LCC ODE</span>
			<h2 class="problem-title">{problem.title}</h2>
		</div>
		<button type="button" class="btn btn-next" onclick={onNextProblem}>
			🎲 Generate Next Problem
		</button>
	</div>

	<!-- Problem Statement -->
	<div class="problem-statement">
		<p class="statement-text">
			Solve the following linear constant-coefficient ordinary
			differential equation for <MathInline math={tGe0Math} />:
		</p>
		<MathBlock math={problem.odeLatex} />
		<div class="initial-conditions">
			<span class="ic-label">Initial Conditions:</span>
			<MathInline
				math={`y(0^-) = ${problem.initialConditions.y0}, \\quad y'(0^-) = ${problem.initialConditions.dy0}`}
			/>
		</div>
	</div>

	<!-- Multi-Stage Input Section -->
	<div class="input-section">
		<h3 class="section-subtitle">
			Stage 1: Characteristic Roots (<MathInline math={"r_1, r_2"} />)
		</h3>
		<div class="roots-grid">
			<div class="field-group">
				<label for="stage1-r1-input"
					>Root <MathInline math={"r_1"} />:</label
				>
				<input
					id="stage1-r1-input"
					type="text"
					class="text-input"
					placeholder="e.g. -1"
					bind:value={studentRoots.r1}
				/>
			</div>
			<div class="field-group">
				<label for="stage1-r2-input"
					>Root <MathInline math={"r_2"} />:</label
				>
				<input
					id="stage1-r2-input"
					type="text"
					class="text-input"
					placeholder="e.g. -2"
					bind:value={studentRoots.r2}
				/>
			</div>
		</div>

		<h3 class="section-subtitle">
			Stage 2: Total Response <MathInline math={"y(t)"} />
		</h3>
		<MathInputBar
			bind:value={studentLatex}
			bind:r1={studentRoots.r1}
			bind:r2={studentRoots.r2}
			inputType="ode"
			label="Type $y(t)$ solution or build using ODE coefficients:"
			placeholder={placeholderText}
		/>

		<div class="action-bar">
			<button type="button" class="btn btn-submit" onclick={handleSubmit}>
				✓ Submit & Validate Answer
			</button>
			<button
				type="button"
				class="btn btn-toggle-plot"
				onclick={() => (showPlot = !showPlot)}
			>
				{showPlot ? "🙈 Hide Plot" : "📈 Show Plot"}
			</button>
		</div>
	</div>

	<!-- Validation Result Feedback Alert -->
	{#if validationResult}
		<div
			class="feedback-alert"
			class:success={validationResult.isCorrect}
			class:error={!validationResult.isCorrect}
		>
			<div class="alert-icon">
				{validationResult.isCorrect ? "✅" : "❌"}
			</div>
			<div class="alert-content">
				<h4 class="alert-title">
					{validationResult.isCorrect
						? "Correct Answer!"
						: "Incorrect Solution"}
				</h4>
				<p class="alert-message">{validationResult.message}</p>
			</div>
		</div>
	{/if}

	<!-- Visualizer Plot Canvas -->
	{#if showPlot}
		<div class="plot-section">
			<WaveformCanvas
				curves={plotCurves}
				mathTitle={"\\text{Response Signals: } y(t), \\; y_{\\text{ZI}}(t), \\; y_{\\text{ZS}}(t)"}
			/>
		</div>
	{/if}

	<!-- Progressive Step Reveal -->
	<div class="solution-section">
		<h3 class="section-subtitle">Step-by-Step Solution Breakdown</h3>
		<StepReveal steps={problem.steps} />
	</div>
</div>

<style>
	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow: var(--shadow-card);
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

	.badge {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		width: fit-content;
	}

	.difficulty-easy {
		background: rgba(16, 185, 129, 0.15);
		color: var(--color-success);
	}

	.difficulty-medium {
		background: rgba(245, 158, 11, 0.15);
		color: var(--color-warning);
	}

	.difficulty-hard {
		background: rgba(244, 63, 94, 0.15);
		color: var(--color-error);
	}

	.category {
		background: rgba(6, 182, 212, 0.15);
		color: var(--accent-primary);
	}

	.problem-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.btn-next {
		background: var(--bg-card-hover);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.btn-next:hover,
	.btn-next:focus-visible {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.btn-submit {
		background: var(--accent-primary);
		color: #000;
	}

	.btn-submit:hover,
	.btn-submit:focus-visible {
		background: var(--accent-hover);
		box-shadow: 0 0 14px var(--accent-glow);
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}

	.btn-toggle-plot {
		background: var(--bg-primary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.btn-toggle-plot:hover,
	.btn-toggle-plot:focus-visible {
		color: var(--text-primary);
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.problem-statement {
		background: var(--bg-primary);
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

	.initial-conditions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--bg-secondary);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	.ic-label {
		font-weight: 600;
		color: var(--text-muted);
		font-size: 0.8rem;
		text-transform: uppercase;
	}

	.section-subtitle {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: 0.5rem;
	}

	.roots-grid {
		display: flex;
		gap: 1rem;
	}

	.field-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.35rem 0.6rem;
		width: 100px;
		color: var(--text-primary);
		font-family: var(--font-mono);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	.action-bar {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.feedback-alert {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		animation: fadeIn 0.25s ease;
	}

	.feedback-alert.success {
		background: var(--color-success-bg);
		border-color: var(--color-success);
	}

	.feedback-alert.error {
		background: var(--color-error-bg);
		border-color: var(--color-error);
	}

	.alert-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.alert-message {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(-0);
		}
	}
</style>
