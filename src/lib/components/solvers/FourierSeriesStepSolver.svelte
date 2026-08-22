<script lang="ts">
	/**
	 * FourierStepSolver Svelte 5 Orchestrator Component.
	 *
	 * 7-Step Intelligent Tutoring System (ITS) for Fourier Series.
	 *
	 * Orchestrates step progression through:
	 * - Step 1: Fundamental Period & Frequency (FourierStep1PeriodFreq)
	 * - Step 2: Waveform Symmetry Analysis (FourierStep2Symmetry)
	 * - Step 3: Vanishing Coefficient Shortcuts (FourierStep3Shortcuts)
	 * - Step 4: Optimal Representation Form (FourierStep4Form)
	 * - Step 5: Integral Setup Formulation (FourierStep5Integrals)
	 * - Step 6: Harmonic Coefficient Evaluation (FourierStep6Evaluation)
	 * - Step 7: Final Fourier Series Expression (FourierStep7Series)
	 */

	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";
	import Progress from "../ui/Progress.svelte";
	import { FourierSeriesStepSolverState } from "./fourier-series-step-solver.svelte";
	import FourierSeriesStep1PeriodFreq from "./fourier-series-steps/FourierSeriesStep1PeriodFreq.svelte";
	import FourierSeriesStep2Symmetry from "./fourier-series-steps/FourierSeriesStep2Symmetry.svelte";
	import FourierSeriesStep3Shortcuts from "./fourier-series-steps/FourierSeriesStep3Shortcuts.svelte";
	import FourierSeriesStep4Form from "./fourier-series-steps/FourierSeriesStep4Form.svelte";
	import FourierSeriesStep5Integrals from "./fourier-series-steps/FourierSeriesStep5Integrals.svelte";
	import FourierSeriesStep6Evaluation from "./fourier-series-steps/FourierSeriesStep6Evaluation.svelte";
	import FourierSeriesStep7Series from "./fourier-series-steps/FourierSeriesStep7Series.svelte";

	interface Props {
		/** Active Fourier series problem instance */
		problem: FourierSeriesProblem;
		/** Callback triggered when all 7 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Reactive step solver controller
	const solver = new FourierSeriesStepSolverState(
		() => problem,
		() => onComplete,
	);

	// Reset state when problem instance changes
	let lastProblemId = "";
	$effect(() => {
		if (problem.id !== lastProblemId) {
			lastProblemId = problem.id;
			solver.reset();
		}
	});
</script>

<div class="fourier-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<!-- Step 1: Fundamental Period & Frequency -->
	<FourierSeriesStep1PeriodFreq
		{problem}
		{solver}
	/>

	<!-- Step 2: Waveform Symmetry Analysis -->
	<FourierSeriesStep2Symmetry
		{problem}
		{solver}
	/>

	<!-- Step 3: Vanishing Coefficient Shortcuts -->
	<FourierSeriesStep3Shortcuts
		{problem}
		{solver}
	/>

	<!-- Step 4: Optimal Representation Form -->
	<FourierSeriesStep4Form
		{problem}
		{solver}
	/>

	<!-- Step 5: Integral Setup Formulation -->
	<FourierSeriesStep5Integrals
		{problem}
		{solver}
	/>

	<!-- Step 6: Harmonic Coefficient Evaluation -->
	<FourierSeriesStep6Evaluation
		{problem}
		{solver}
	/>

	<!-- Step 7: Final Fourier Series Expression -->
	<FourierSeriesStep7Series
		{problem}
		{solver}
	/>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.fourier-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}
</style>
