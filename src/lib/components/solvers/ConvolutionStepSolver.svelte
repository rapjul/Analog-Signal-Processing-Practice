<script lang="ts">
	/**
	 * Seven-step Intelligent Tutoring System orchestrator for convolution.
	 *
	 * Follows the ODE and Fourier Series solver path with centralized reactive
	 * state, locked/completed StepCards, progressive hints, and visual test hooks.
	 */

	import ConvolutionChoiceStep from "$lib/components/solvers/convolution-steps/ConvolutionChoiceStep.svelte";
	import ConvolutionStep1Timing from "$lib/components/solvers/convolution-steps/ConvolutionStep1Timing.svelte";
	import ConvolutionStep3Flip from "$lib/components/solvers/convolution-steps/ConvolutionStep3Flip.svelte";
	import ConvolutionStep4Transitions from "$lib/components/solvers/convolution-steps/ConvolutionStep4Transitions.svelte";
	import ConvolutionStep5Bounds from "$lib/components/solvers/convolution-steps/ConvolutionStep5Bounds.svelte";
	import ConvolutionStep6Evaluation from "$lib/components/solvers/convolution-steps/ConvolutionStep6Evaluation.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution";
	import { ConvolutionStepSolverState } from "./convolution-step-solver.svelte";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Callback triggered with the verified moving-signal choice. */
		onComplete?: (flippedSignal: "x" | "h") => void;
	}

	let { problem, onComplete }: Props = $props();

	/** Reactive convolution tutor controller. */
	const solver = new ConvolutionStepSolverState(
		() => problem,
		() => () => onComplete?.(solver.flippedSignal),
	);

	/** Last problem identifier used to synchronize state resets. */
	let lastProblemId = "";
	$effect(() => {
		if (problem.id !== lastProblemId) {
			lastProblemId = problem.id;
			solver.reset();
		}
	});
</script>

<div class="convolution-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<ConvolutionStep1Timing
		{problem}
		{solver}
	/>

	<ConvolutionChoiceStep
		stepNumber={2}
		title="Define the Convolution Integral"
		data={problem.itsData.step2}
		state={solver.step2}
		{solver}
		onCheck={(option) => solver.checkStep2(option)}
		summaryLatex={String.raw`Verified definition: $y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau$.`}
	/>

	<ConvolutionStep3Flip
		{problem}
		{solver}
	/>

	<ConvolutionStep4Transitions
		{problem}
		{solver}
	/>

	<ConvolutionStep5Bounds
		{problem}
		{solver}
	/>

	<ConvolutionStep6Evaluation
		{problem}
		{solver}
	/>

	<ConvolutionChoiceStep
		stepNumber={7}
		title="Assemble the Piecewise Response"
		data={problem.itsData.step7}
		state={solver.step7}
		{solver}
		onCheck={(option) => solver.checkStep7(option)}
		summaryLatex={String.raw`Exact piecewise response $y(t)$ assembled from the verified interval results.`}
		singleColumn={true}
	/>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.convolution-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.convolution-step-solver :global(.step-card.completed),
	.convolution-step-solver :global(.step-summary) {
		max-width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.convolution-step-solver :global(.summary-text) {
		display: block;
		flex: 1 1 0;
		max-width: 100%;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
	}
</style>
