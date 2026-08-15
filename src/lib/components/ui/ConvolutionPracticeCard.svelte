<script lang="ts">
	/**
	 * ConvolutionPracticeCard Svelte 5 Component.
	 *
	 * Displays Continuous-Time Convolution practice statement, embedded flip-and-shift canvas animator,
	 * multi-step piecewise LaTeX inputs (via MathInputBar), validation feedback, and step reveal breakdown.
	 */

	import type { ConvolutionProblem } from "$lib/math-engine/convolution";
	import { validateConvolutionResponse } from "$lib/math-engine/evaluator";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import ConvolutionCanvas from "../canvas/ConvolutionCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathInputBar from "../math/MathInputBar.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import MathText from "../math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template
	import StepReveal from "./StepReveal.svelte";

	interface Props {
		/** Active convolution problem instance */
		problem: ConvolutionProblem;
		/** Callback triggered when user requests next randomized problem */
		onNextProblem: () => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { problem, onNextProblem }: Props = $props();

	// Student LaTeX response binding
	let studentLatex = $state("");
	// Diagnostic feedback state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let feedback = $state<{
		isCorrect: boolean;
		message: string;
		details?: string;
	} | null>(null);

	// Formula drawer visibility state
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let showFormulaDrawer = $state(false);

	// Reset response and feedback when problem instance changes
	$effect(() => {
		if (problem) {
			studentLatex = "";
			feedback = null;
		}
	});

	/**
	 * Submits and validates student response against computed piecewise solution.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleSubmit() {
		if (!studentLatex.trim()) {
			feedback = {
				isCorrect: false,
				message:
					"Please enter your solution expression before submitting.",
			};
			return;
		}

		const isAccurate = validateConvolutionResponse(
			studentLatex,
			problem.eval,
			problem.timeRange ?? [-2, 6],
		);

		if (isAccurate) {
			feedback = {
				isCorrect: true,
				message:
					"Correct! Your convolution solution is numerically verified.",
			};
		} else {
			feedback = {
				isCorrect: false,
				message:
					"Not quite equivalent yet. Check your integration bounds and piecewise intervals.",
			};
		}
	}

	// Dynamic placeholder text
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let placeholderText = $derived(
		problem.pairType.includes("rect")
			? String.raw`e.g. \begin{cases} t & 0 \le t < 1 \\ 2-t & 1 \le t \le 2 \end{cases}`
			: String.raw`e.g. \frac{1}{2}(1 - e^{-2t}) u(t)`,
	);

	// Formula constant for statement text
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const convExprMath =
		"y(t) = (x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau";
</script>

<div class="convolution-practice-card">
	<div class="card-header">
		<div class="header-left">
			<span class="badge">Continuous-Time Problem</span>
			<h2 class="problem-title">{problem.title}</h2>
		</div>
		<button type="button" class="btn btn-next" onclick={onNextProblem}>
			🎲 Generate Next Problem
		</button>
	</div>

	<!-- Problem Statement -->
	<div class="problem-statement">
		<p class="statement-text">
			<MathText
				text={String.raw`Calculate the analytical continuous-time convolution integral $y(t) = (x * h)(t)$ for the given signals:`}
			/>
		</p>
		<div class="signals-grid">
			<div class="signal-box">
				<span class="signal-label">
					<MathText text={String.raw`Input Signal $x(t)$:`} />
				</span>
				<MathBlock math={`x(t) = ${problem.xLatex}`} />
			</div>
			<div class="signal-box">
				<span class="signal-label">
					<MathText text={String.raw`Impulse Response $h(t)$:`} />
				</span>
				<MathBlock math={`h(t) = ${problem.hLatex}`} />
			</div>
		</div>
		<MathBlock math={convExprMath} />
	</div>

	<!-- Embedded Graphical Convolution Canvas Animator -->
	<ConvolutionCanvas
		evalX={problem.evalX}
		evalH={problem.evalH}
		evalY={problem.eval}
		timeRange={problem.timeRange ?? [-2, 6]}
		title="Live Overlap Integrator Visualizer"
	/>

	<!-- Guided Input Section -->
	<div class="input-section">
		<h3 class="section-subtitle">
			<MathText text={String.raw`Enter Solution Expression $y(t)$:`} />
		</h3>
		<MathInputBar
			bind:value={studentLatex}
			inputType="piecewise"
			label="Build piecewise interval expression or type LaTeX:"
			placeholder={placeholderText}
		/>

		<div class="action-bar">
			<button type="button" class="btn btn-submit" onclick={handleSubmit}>
				✓ Submit & Validate Convolution
			</button>
		</div>

		<!-- Validation Alert -->
		{#if feedback}
			<div
				class="validation-alert"
				class:correct={feedback.isCorrect}
				class:incorrect={!feedback.isCorrect}
			>
				<span class="alert-icon">
					{feedback.isCorrect ? "🎉" : "❌"}
				</span>
				<div class="alert-content">
					<span class="alert-title">
						{feedback.isCorrect
							? "Correct Solution!"
							: "Incorrect Solution"}
					</span>
					{#if feedback.message}
						<p class="alert-message">{feedback.message}</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Step Reveal Solution Breakdown -->
	<StepReveal steps={problem.solutionSteps} />
</div>

<style>
	.convolution-practice-card {
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

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.badge {
		background: rgba(6, 182, 212, 0.12);
		color: var(--accent-primary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid rgba(6, 182, 212, 0.3);
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

	.signals-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 600px) {
		.signals-grid {
			grid-template-columns: 1fr;
		}
	}

	.signal-box {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.signal-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
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
