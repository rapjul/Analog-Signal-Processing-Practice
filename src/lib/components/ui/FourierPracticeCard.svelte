<script lang="ts">
	/**
	 * FourierPracticeCard Svelte 5 Component.
	 *
	 * Houses the Fourier Series problem prompt, 6-step Intelligent Tutoring System (ITS)
	 * stepped solver, and deferred post-solve completion visualizers (FourierCanvas & StepReveal).
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import FourierCanvas from "../canvas/FourierCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathText from "../math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import FourierStepSolver from "../solvers/FourierStepSolver.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import CompletionBanner from "./CompletionBanner.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import ProblemHeader from "./ProblemHeader.svelte";

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

	// Reset state when new problem loads
	$effect(() => {
		if (problem) {
			isCompleted = false;
		}
	});

	/**
	 * Handles problem completion from stepped solver.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleProblemCompleted() {
		isCompleted = true;
	}

	/**
	 * Derives the badge list to pass to ProblemHeader from the active problem.
	 * @returns {Array<{label: string; variant: "primary" | "secondary" | "accent"}>} Badge items
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const headerBadges = $derived([
		{
			label: `${problem.waveformType.replace("_", " ")} Wave`,
			variant: "secondary" as const,
		},
		{
			label: `${problem.coeffs.symmetry} Symmetry`,
			variant: "accent" as const,
		},
	]);
</script>

<div class="fourier-practice-card">
	<!-- Problem Header (category + badges + next-problem button) -->
	<ProblemHeader
		title={problem.title}
		category="Fourier Series Problem"
		badges={headerBadges}
		{onNextProblem}
	/>

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
					<MathText
						text={`Fundamental Period: $${problem.periodLatex}$`}
					/>
				</span>
			</div>
		{/if}
	</div>

	<!-- Intelligent Tutoring Stepped Solver -->
	<div class="solver-container">
		<FourierStepSolver
			{problem}
			onComplete={handleProblemCompleted}
		/>
	</div>

	<!-- Post-Solve Verification & Visualizers (Revealed upon completing all steps) -->
	{#if isCompleted}
		<div class="completion-section">
			<CompletionBanner
				title="Problem Completed!"
				description="You have derived the complete Fourier series representation. Explore the reconstructed partial sum and harmonic power spectrum below."
			/>

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
		container-type: inline-size;
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

	.visualizer-wrapper {
		width: 100%;
	}

	@media (max-width: 480px) {
		.fourier-practice-card {
			padding: 1rem 0.85rem;
			gap: 1rem;
		}
	}
</style>
