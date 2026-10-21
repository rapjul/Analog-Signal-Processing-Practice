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

	import { tick, untrack } from "svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import type { FourierSeriesProblem } from "$lib/math-engine/fourier-series/index";
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
	let lastProblem: FourierSeriesProblem | undefined;
	$effect(() => {
		if (problem !== lastProblem) {
			lastProblem = problem;
			untrack(() => solver.reset());
		}
	});

	let root = $state<HTMLDivElement | null>(null);
	const questionKey = $derived(
		`${solver.currentStep}:${solver.step2.activeSubStepId}:${solver.step5.activeSubStepId}:${solver.step6.activeSubStepId}`,
	);
	const announcement = $derived(
		solver.isCompleted
			? "Fourier Series derivation completed."
			: `Step ${solver.currentStep} of 7. ${solver.currentStep === 2 ? solver.step2Progress.label : solver.currentStep === 5 ? solver.step5Progress.label : solver.currentStep === 6 ? solver.step6Progress.label : ""}`,
	);
	let previousQuestion = "";
	let previousQuestionProblem: FourierSeriesProblem | undefined;
	$effect(() => {
		const nextQuestion = questionKey;
		const shouldFocus =
			previousQuestionProblem === problem &&
			previousQuestion !== "" &&
			previousQuestion !== nextQuestion;
		previousQuestion = nextQuestion;
		previousQuestionProblem = problem;
		if (shouldFocus) {
			let cancelled = false;
			void tick().then(() => {
				if (!cancelled) {
					const heading =
						root?.querySelector<HTMLElement>(
							".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading]",
						) ??
						root?.querySelector<HTMLElement>(
							".step-card.active [data-progress-heading]",
						);
					heading?.focus();
				}
			});
			return () => {
				cancelled = true;
			};
		}
		return undefined;
	});
</script>

<div
	class="fourier-step-solver"
	bind:this={root}
>
	<p
		class="sr-only"
		role="status"
		aria-live="polite"
		aria-atomic="true"
	>
		{announcement}
	</p>
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
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	/* ── Outer solver container ────────────────────────────── */

	.fourier-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}
</style>
