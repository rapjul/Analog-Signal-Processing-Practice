<script lang="ts">
	/**
	 * OdePracticeCard Svelte 5 Component.
	 *
	 * Houses the ODE practice prompt, 7-step Intelligent Tutoring System (ITS)
	 * stepped solver, and deferred post-solve completion visualizer (WaveformCanvas).
	 */

	import type { OdeProblem } from "$lib/math-engine/odes";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import WaveformCanvas from "../canvas/WaveformCanvas.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathBlock from "../math/MathBlock.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import MathText from "../math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in template markup.
	import OdeStepSolver from "../solvers/OdeStepSolver.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import CompletionBanner from "./CompletionBanner.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import ProblemHeader from "./ProblemHeader.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
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
			label: "Zero-Input Response",
			math: "y_{\\text{ZI}}(t)",
			color: "#10b981",
			eval: problem.evalZI,
		},
		{
			label: "Zero-State Response",
			math: "y_{\\text{ZS}}(t)",
			color: "#f59e0b",
			eval: problem.evalZS,
		},
	]);

	/**
	 * Derives the badge list to pass to ProblemHeader from the active problem.
	 * @returns {Array<{label: string; variant: "secondary" | "accent"}>} Badge items
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	const headerBadges = $derived([
		{
			label: problem.params.order === 1 ? "1st-Order" : "2nd-Order",
			variant: "secondary" as const,
		},
		{
			label: problem.params.rootType.replace("_", " "),
			variant: "accent" as const,
		},
	]);
</script>

<div class="ode-practice-card practice-card">
	<!-- Problem Header (category + badges + next-problem button) -->
	<ProblemHeader
		title={problem.title}
		category="LCC ODE Problem"
		badges={headerBadges}
		{onNextProblem}
	/>

	<!-- Clean Anti-Spoiler Problem Statement -->
	<div class="problem-statement">
		<p class="statement-text">
			<MathText
				text={String.raw`Solve the following linear constant-coefficient ordinary differential equation for $t \ge 0$:`}
			/>
		</p>
		<MathBlock
			math={problem.odeLatex}
			compact={true}
		/>
		<div class="initial-conditions">
			<MathText
				text={String.raw`<strong>Initial Conditions:</strong> $y(0^-) = ${problem.initialConditions.y0}, \quad y'(0^-) = ${problem.initialConditions.dy0}$`}
			/>
		</div>
	</div>

	<!-- Intelligent Tutoring Stepped Solver -->
	<div class="solver-container">
		<OdeStepSolver
			{problem}
			onComplete={handleProblemCompleted}
		/>
	</div>

	<!-- Post-Solve Verification & Visualizers (Revealed upon completing all steps) -->
	{#if isCompleted}
		<div class="completion-section">
			<CompletionBanner
				title="Problem Completed!"
				description={String.raw`You have derived the total response $y(t)$ and separated it into Zero-Input and Zero-State components. Explore the response waveform below.`}
			/>

			<!-- Live Multi-Curve Response Plot Canvas -->
			<div class="visualizer-wrapper">
				<WaveformCanvas
					title={"Verified System Response: Total $y(t)$, Zero-Input $y_{\\text{ZI}}(t)$, & Zero-State $y_{\\text{ZS}}(t)$"}
					tRange={[0, 5]}
					curves={plotCurves}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	.ode-practice-card {
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
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.statement-text {
		color: var(--text-primary);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0;
	}

	.initial-conditions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		flex-wrap: wrap;
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
</style>
