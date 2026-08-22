<script lang="ts">
	/**
	 * FourierPracticeCard Svelte 5 Component.
	 *
	 * Houses the Fourier Series problem prompt, 7-step Intelligent Tutoring System (ITS)
	 * stepped solver, completed-solution disclosure, and deferred FourierCanvas visualizer.
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series";
	import FourierCanvas from "../canvas/FourierCanvas.svelte";
	import MathBlock from "../math/MathBlock.svelte";
	import MathText from "../math/MathText.svelte";
	import FourierConversionChallenge from "../solvers/FourierConversionChallenge.svelte";
	import FourierStepSolver from "../solvers/FourierStepSolver.svelte";
	import CompletionBanner from "./CompletionBanner.svelte";
	import ProblemHeader from "./ProblemHeader.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Handler for generating next problem */
		onNextProblem: () => void;
	}

	let { problem, onNextProblem }: Props = $props();

	let isCompleted = $state(false);
	let conversionsCompleted = $state(false);

	// Reset state when new problem loads
	$effect(() => {
		if (problem) {
			isCompleted = false;
			conversionsCompleted = false;
		}
	});

	/**
	 * Handles problem completion from stepped solver.
	 */
	function handleProblemCompleted() {
		isCompleted = true;
	}

	/**
	 * Derives the badge list to pass to ProblemHeader from the active problem.
	 * @returns {Array<{label: string; variant: "primary" | "secondary" | "accent"}>} Badge items
	 */
	const headerBadges = $derived([
		{
			label: `${problem.waveformType.replace("_", " ")} Wave`,
			variant: "secondary" as const,
		},
	]);
	const displayedSolutionSteps = $derived(
		conversionsCompleted
			? [...problem.solutionSteps, ...problem.conversionSolutionSteps]
			: problem.solutionSteps,
	);
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

			<FourierConversionChallenge
				challenge={problem.conversionChallenge}
				onComplete={() => (conversionsCompleted = true)}
			/>

			<details class="solution-breakdown">
				<summary class="solution-summary">
					<span class="solution-summary-title">
						View Complete Worked Solution
					</span>
					<span class="solution-summary-badge">
						All {displayedSolutionSteps.length} Steps
					</span>
				</summary>

				<div class="solution-steps">
					{#each displayedSolutionSteps as step, index}
						<section class="solution-step">
							<h4 class="solution-step-title">
								Step {index + 1}: {step.title}
							</h4>
							{#if step.description}
								<p class="solution-step-description">
									<MathText text={step.description} />
								</p>
							{/if}
							{#if step.latex && step.latex.trim().length > 0}
								<MathBlock
									math={step.latex}
									aligned={step.aligned}
									cases={step.cases}
									matrix={step.matrix}
									gathered={step.gathered}
									responsive={step.responsive}
									compact={true}
								/>
							{/if}
						</section>
					{/each}
				</div>
			</details>

			<!-- Live Partial Sum & Power Spectrum Canvas -->
			<div class="visualizer-wrapper">
				<FourierCanvas
					coefficients={problem.coeffs}
					waveformType={problem.waveformType}
					harmonicCount={5}
					title="Verified Harmonic Spectrum & Partial Sum Reconstruction"
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Practice card container ───────────────────────────── */

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

	/* ── Problem statement & period parameters ─────────────── */

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

	/* ── Stepped solver workspace container ────────────────── */

	.solver-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	/* ── Completion summary & visualizer ───────────────────── */

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

	/* ── Completed solution disclosure ─────────────────────── */

	.solution-breakdown {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.solution-breakdown[open] {
		border-color: var(--accent-primary);
	}

	.solution-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		cursor: pointer;
		list-style: none;
		color: var(--text-primary);
		font-weight: 700;
		transition: background 0.15s ease;
	}

	.solution-summary::-webkit-details-marker {
		display: none;
	}

	.solution-summary::before {
		content: "▶";
		color: var(--accent-primary);
		font-size: var(--text-xs);
		flex-shrink: 0;
	}

	.solution-breakdown[open] .solution-summary::before {
		content: "▼";
	}

	.solution-summary:hover {
		background: var(--bg-card-hover);
	}

	.solution-summary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: -2px;
	}

	.solution-summary-title {
		flex: 1;
	}

	.solution-summary-badge {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--accent-primary);
		background: var(--accent-bg-subtle);
		border: 1px solid rgba(6, 182, 212, 0.25);
		border-radius: var(--radius-full);
		padding: 0.2rem 0.55rem;
		white-space: nowrap;
	}

	.solution-steps {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.solution-step {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.85rem 1rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		min-width: 0;
	}

	.solution-step-title,
	.solution-step-description {
		margin: 0;
	}

	.solution-step-title {
		font-size: var(--text-sm);
		color: var(--text-primary);
	}

	.solution-step-description {
		font-size: var(--text-sm);
		line-height: var(--leading-relaxed);
		color: var(--text-secondary);
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.fourier-practice-card {
			padding: 1rem 0.85rem;
			gap: 1rem;
		}

		.solution-summary {
			align-items: flex-start;
			flex-wrap: wrap;
			padding: 0.85rem;
		}

		.solution-steps {
			padding: 0.75rem;
		}
	}
</style>
