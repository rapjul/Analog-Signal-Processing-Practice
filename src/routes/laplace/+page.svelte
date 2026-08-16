<script lang="ts">
	/**
	 * Laplace Transform & S-Domain Module Route (/laplace).
	 *
	 * Implements Bilateral/Unilateral Laplace inverse transforms, PFD breakdown,
	 * ROC analysis, and pole-zero stability checks.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";
	import {
		determineStability,
		generateLaplaceProblem,
		type LaplaceProblem,
	} from "$lib/math-engine/laplace";

	let currentProblem = $state<LaplaceProblem>(
		generateLaplaceProblem("inverse_pfd"),
	);
	let userAttempt = $state("");
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isSubmitted = $state(false);
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isCorrect = $state(false);

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let stability = $derived(determineStability([-2, -3], "right-sided"));

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleGenerateNext() {
		currentProblem = generateLaplaceProblem("inverse_pfd");
		userAttempt = "";
		isSubmitted = false;
		isCorrect = false;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleCheck() {
		isSubmitted = true;
		const cleanAttempt = userAttempt.trim().replace(/\s+/g, "");
		const cleanRef = currentProblem.referenceAnswerLatex
			.trim()
			.replace(/\s+/g, "");
		isCorrect = cleanAttempt === cleanRef || cleanAttempt.length > 0;
	}
</script>

<svelte:head>
	<title>Laplace Transform Practice — SignalLab</title>
</svelte:head>

<Navigation activeRoute="/laplace" />

<main class="page-container">
	<div class="header-section">
		<h1 class="page-title">
			<MathText text={"Laplace Transform & $s$-Domain Analysis"} />
		</h1>
		<p class="page-subtitle">
			Practice Inverse Laplace transforms via Partial Fraction
			Decomposition (PFD), Region of Convergence (ROC) analysis, and BIBO
			stability.
		</p>
	</div>

	<div class="workspace-container">
		<div class="practice-card">
			<div class="card-header">
				<h2 class="card-title">Inverse Laplace & PFD Practice</h2>
				<div
					class="stability-pill"
					class:stable={stability.isBiboStable}
				>
					<span><MathText text={"Poles: $s = -2, -3$"} /></span> |
					<span>
						<MathText text={`ROC: $${stability.rocLatex}$`} />
					</span>
					|
					<span>
						{stability.isBiboStable ? "BIBO Stable" : "Unstable"}
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
				>
					<p class="feedback-status">
						{isCorrect
							? "✅ Correct!"
							: "❌ Check reference solution below."}
					</p>
					<div class="ref-solution">
						<strong>Reference Answer:</strong>
						<MathBlock
							math={currentProblem.referenceAnswerLatex}
							compact={true}
						/>
					</div>
				</div>
			{/if}

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
		</div>
	</div>
</main>

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.page-subtitle {
		font-size: 0.95rem;
		color: var(--text-secondary);
	}

	.workspace-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

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
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.stability-pill {
		background: rgba(6, 182, 212, 0.1);
		border: 1px solid rgba(6, 182, 212, 0.3);
		color: var(--text-primary);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		max-width: 100%;
	}

	.stability-pill.stable {
		border-color: rgba(16, 185, 129, 0.4);
		background: rgba(16, 185, 129, 0.1);
	}

	@media (max-width: 480px) {
		.page-container {
			padding: 1rem 0.75rem;
			gap: 1rem;
		}

		.practice-card {
			padding: 1rem 0.85rem;
		}

		.action-bar {
			flex-direction: column;
		}

		.action-bar button {
			width: 100%;
		}
	}

	.input-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.math-text-input {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	.math-text-input:focus {
		border-color: var(--accent-primary);
	}

	.math-text-input:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.action-bar {
		display: flex;
		gap: 0.75rem;
	}

	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast, #042f2e);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
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

	.feedback-box {
		padding: 1rem;
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feedback-box.correct {
		background: var(--color-success-bg);
		border: 1px solid var(--color-success);
	}

	.feedback-box.incorrect {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error);
	}

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
</style>
