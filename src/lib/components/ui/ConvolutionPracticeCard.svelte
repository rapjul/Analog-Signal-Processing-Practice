<script lang="ts">
	/**
	 * ConvolutionPracticeCard Svelte 5 Component.
	 *
	 * Displays Continuous-Time Convolution practice statement, embedded flip-and-shift canvas animator,
	 * multi-step piecewise LaTeX inputs (via MathInputBar), validation feedback, and step reveal breakdown.
	 */

	import type { ConvolutionProblem } from "$lib/math-engine/convolution";
	import { validateConvolutionResponse } from "$lib/math-engine/evaluator";
	import ConvolutionCanvas from "../canvas/ConvolutionCanvas.svelte";
	import MathBlock from "../math/MathBlock.svelte";
	import MathInputBar from "../math/MathInputBar.svelte";
	import MathText from "../math/MathText.svelte";
	import ProblemHeader from "./ProblemHeader.svelte";
	import StepReveal from "./StepReveal.svelte";

	interface Props {
		/** Active convolution problem instance */
		problem: ConvolutionProblem;
		/** Callback triggered when user requests next randomized problem */
		onNextProblem: () => void;
	}

	let { problem, onNextProblem }: Props = $props();

	// Student LaTeX response binding
	let studentLatex = $state("");
	// Diagnostic feedback state
	let feedback = $state<{
		isCorrect: boolean;
		message: string;
		details?: string;
	} | null>(null);

	// Formula drawer visibility state
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
	let placeholderText = $derived(
		problem.pairType.includes("rect")
			? String.raw`e.g. \begin{cases} t & 0 \le t < 1 \\ 2-t & 1 \le t \le 2 \end{cases}`
			: String.raw`e.g. \frac{1}{2}(1 - e^{-2t}) u(t)`,
	);

	// Formula constant for statement text
	const convExprMath =
		"y(t) = (x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau";
</script>

<div class="convolution-practice-card">
	<!-- Problem Header (category + next-problem button) -->
	<ProblemHeader
		title={problem.title}
		category="Continuous-Time Problem"
		{onNextProblem}
	/>

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
			<button
				type="button"
				class="btn-submit"
				onclick={handleSubmit}
			>
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
	/* ── Practice card container ───────────────────────────── */

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
		container-type: inline-size;
	}

	/* ── Problem statement & signal preview ────────────────── */

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

	/* ── Guided solution input section ─────────────────────── */

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

	/* ── Action bar & submit button ────────────────────────── */

	.action-bar {
		display: flex;
		gap: 1rem;
	}

	.btn-submit {
		background: var(--accent-primary);
		color: var(--accent-contrast);
		font-weight: 700;
		border: none;
		padding: 0.6rem 1.25rem;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: var(--text-sm);
		transition: all 0.2s ease;
	}

	.btn-submit:hover,
	.btn-submit:focus-visible {
		box-shadow: 0 0 14px var(--accent-glow);
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}

	/* ── Validation alert banner ───────────────────────────── */

	.validation-alert {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
	}

	/* Correct — green alert */
	.validation-alert.correct {
		background: var(--color-success-bg);
		border: 1px solid var(--color-success);
		color: var(--color-success);
	}

	/* Incorrect — red alert */
	.validation-alert.incorrect {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error);
		color: var(--color-error);
	}

	.alert-icon {
		font-size: var(--text-xl);
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
		font-size: var(--text-sm);
		opacity: 0.9;
	}

	/* ── Mobile media query (≤600px) ─────────────────────── */

	@media (max-width: 600px) {
		.signals-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
