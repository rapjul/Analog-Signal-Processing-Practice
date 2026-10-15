<script lang="ts">
	/**
	 * Laplace Transform & S-Domain Module Route (/laplace).
	 *
	 * Implements Bilateral/Unilateral Laplace inverse transforms, PFD breakdown,
	 * ROC analysis, and pole-zero stability checks.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import PageLayout from "$lib/components/ui/PageLayout.svelte";
	import WorkedSolution from "$lib/components/ui/WorkedSolution.svelte";
	import {
		determineStability,
		generateLaplaceProblem,
		validateLaplacePfdAnswer,
	} from "$lib/math-engine/laplace";
	import type { TransformValidationResult } from "$lib/math-engine/transform-validation";

	let currentProblem = $state(generateLaplaceProblem("inverse_pfd"));
	let userAttempt = $state("");
	let isSubmitted = $state(false);
	let result = $state<TransformValidationResult | null>(null);
	let isCorrect = $derived(result?.status === "correct");

	let stability = $derived(
		determineStability(
			currentProblem.pfd.poles,
			currentProblem.pfd.rocDirection,
		),
	);

	/** Generates another causal inverse transform and resets verification. */
	function handleGenerateNext() {
		currentProblem = generateLaplaceProblem("inverse_pfd");
		userAttempt = "";
		isSubmitted = false;
		result = null;
	}

	/** Validates the residue sum, including its causal support. */
	function handleCheck() {
		isSubmitted = true;
		result = validateLaplacePfdAnswer(userAttempt, currentProblem);
	}

	/** Clears verification when the submitted answer is edited. */
	function handleInput() {
		result = null;
		isSubmitted = false;
	}
</script>

<PageLayout
	title="Laplace Transform & s-Domain Analysis"
	subtitleText="Practice Inverse Laplace transforms via Partial Fraction Decomposition (PFD), Region of Convergence (ROC) analysis, and BIBO stability."
	metaDescription="Practice inverse Laplace transforms with Partial Fraction Decomposition (PFD), ROC regions, and s-domain pole-zero stability checks."
	activeRoute="/laplace"
>
	<div class="practice-card">
		<div class="card-header">
			<h2 class="card-title">Inverse Laplace & PFD Practice</h2>
			<div class="stability-pill">
				<span
					><MathText
						text={currentProblem.pfd.poles.length
							? `Poles: $s = ${currentProblem.pfd.poles.join(", ")}$`
							: "No finite poles"}
					/></span
				>
				|
				<span>
					<MathText text={`ROC: $${stability.rocLatex}$`} />
				</span>
			</div>
		</div>

		<div class="problem-prompt">
			<MathBlock math={currentProblem.promptLatex} />
		</div>

		<div class="input-section">
			<label
				for="laplace-input"
				class="input-label"
			>
				<MathText text={"Enter $x(t)$ in LaTeX:"} />
			</label>
			<input
				id="laplace-input"
				type="text"
				class="math-text-input"
				bind:value={userAttempt}
				oninput={handleInput}
				placeholder="Enter LaTeX answer..."
			/>

			<div class="action-bar">
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleCheck}
				>
					Check Answer
				</button>
				<button
					type="button"
					class="btn btn-secondary"
					onclick={handleGenerateNext}
				>
					Next Problem
				</button>
			</div>
		</div>

		{#if isSubmitted}
			<div
				class="feedback-box"
				class:correct={isCorrect}
				class:incorrect={!isCorrect}
				role="status"
				data-validation={result?.status}
			>
				<p class="feedback-status">
					{result?.message}
				</p>
			</div>
		{/if}

		{#key currentProblem}
			<WorkedSolution verified={isCorrect}>
				<p>{stability.isBiboStable ? "BIBO Stable" : "Unstable"}</p>
				<strong>Reference Answer:</strong>
				<MathBlock
					math={currentProblem.referenceAnswerLatex}
					compact={true}
				/>
				<div class="solution-breakdown">
					<h3 class="solution-title">Solution Breakdown</h3>
					{#each currentProblem.solutionSteps as step}
						<div class="step-card">
							<h4 class="step-heading">{step.title}</h4>
							<MathBlock
								math={step.latex}
								compact={true}
							/>
						</div>
					{/each}
				</div>
			</WorkedSolution>
		{/key}
	</div>
</PageLayout>

<style>
	/* ── Practice card ─────────────────────────────────────── */

	.practice-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 100%;
		min-width: 0;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.card-title {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Stability pill badge ──────────────────────────────── */

	.stability-pill {
		background: rgba(6, 182, 212, 0.1);
		border: 1px solid rgba(6, 182, 212, 0.3);
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		font-size: var(--text-xs);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* ── Problem prompt ────────────────────────────────────── */

	.problem-prompt {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		overflow-x: auto;
	}

	/* ── Input section & action bar ────────────────────────── */

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.action-bar {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast, #042f2e);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary:hover,
	.btn-primary:focus-visible {
		background: var(--accent-hover);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.btn-secondary {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary:hover,
	.btn-secondary:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Feedback banner ───────────────────────────────────── */

	.feedback-box {
		padding: 1rem;
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Correct — green alert */
	.feedback-box.correct {
		background: var(--color-success-bg);
		border: 1px solid var(--color-success);
	}

	/* Incorrect — red alert */
	.feedback-box.incorrect {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error);
	}

	.feedback-status {
		font-weight: 700;
		font-size: var(--text-sm);
	}

	/* ── Solution breakdown ────────────────────────────────── */

	.solution-breakdown {
		border-top: 1px solid var(--border-color);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.solution-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.step-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.step-heading {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-primary);
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.practice-card {
			padding: 1rem 0.85rem;
		}

		.stability-pill {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
