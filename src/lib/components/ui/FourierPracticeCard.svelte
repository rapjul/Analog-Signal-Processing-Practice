<script lang="ts">
	/**
	 * FourierPracticeCard Svelte 5 Component.
	 *
	 * Houses the Fourier Series problem prompt, 6-stage Intelligent Tutoring System (ITS)
	 * stepped solver, and deferred post-solve completion visualizers (FourierCanvas & StepReveal).
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import FourierCanvas from "../canvas/FourierCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathInline from "../math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import FourierStepSolver from "../solvers/FourierStepSolver.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Handler for generating next problem */
		onNextProblem: () => void;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { problem, onNextProblem }: Props = $props();

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isCompleted = $state(false);

	// Reset state when problem changes
	$effect(() => {
		isCompleted = false;
	});

	/**
	 * Handles problem completion from stepped solver.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleProblemCompleted() {
		isCompleted = true;
	}
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

	<!-- Clean Anti-Spoiler Problem Statement -->
	<div class="problem-statement">
		<p class="statement-text">
			Analyze the given periodic signal and derive its Fourier series
			representation:
		</p>
		<MathBlock math={problem.signalLatex} />
		{#if isCompleted}
			<div class="period-info">
				<span class="info-tag">
					Fundamental Period: <MathInline
						math={problem.periodLatex}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Intelligent Tutoring Stepped Solver -->
	<div class="solver-container">
		<FourierStepSolver {problem} onComplete={handleProblemCompleted} />
	</div>

	<!-- Post-Solve Verification & Visualizers (Revealed upon completing all stages) -->
	{#if isCompleted}
		<div class="completion-section">
			<div class="completion-banner">
				<span class="banner-icon">🎉</span>
				<div class="banner-text">
					<h3 class="banner-title">Problem Completed!</h3>
					<p class="banner-sub">
						You have derived the complete Fourier series
						representation. Explore the reconstructed partial sum
						and harmonic power spectrum below.
					</p>
				</div>
			</div>

			<!-- Live Partial Sum & Power Spectrum Canvas -->
			<div class="visualizer-wrapper">
				<FourierCanvas
					waveformType={problem.waveformType}
					harmonicCount={5}
					title="Verified Harmonic Spectrum & Partial Sum Reconstruction"
				/>
			</div>
		</div>
	{/if}
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
		margin: 0;
	}

	.btn-next {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-next:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	@media (max-width: 480px) {
		.fourier-practice-card {
			padding: 1rem 0.85rem;
			gap: 1rem;
		}

		.btn-next {
			width: 100%;
			text-align: center;
		}
	}

	.btn-next:focus-visible {
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
		color: var(--text-primary);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0;
	}

	.period-info {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.info-tag {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.solver-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.completion-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 1rem;
		border-top: 2px dashed var(--border-color);
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.completion-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.35);
		border-radius: var(--radius-md);
		padding: 1rem 1.25rem;
	}

	.banner-icon {
		font-size: 2rem;
	}

	.banner-title {
		font-size: 1.15rem;
		font-weight: 800;
		color: #10b981;
		margin: 0 0 0.25rem 0;
	}

	.banner-sub {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.visualizer-wrapper {
		width: 100%;
	}
</style>
