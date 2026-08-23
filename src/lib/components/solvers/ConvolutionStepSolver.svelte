<script lang="ts">
	/**
	 * Five-step Intelligent Tutoring System orchestrator for convolution.
	 *
	 * Follows the ODE and Fourier Series solver path with centralized reactive
	 * state, locked/completed StepCards, progressive hints, and visual test hooks.
	 */

	import ConvolutionChoiceStep from "$lib/components/solvers/convolution-steps/ConvolutionChoiceStep.svelte";
	import ConvolutionStep4Intervals from "$lib/components/solvers/convolution-steps/ConvolutionStep4Intervals.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution";
	import { ConvolutionStepSolverState } from "./convolution-step-solver.svelte";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Callback triggered after all five steps are completed. */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	/** Reactive convolution tutor controller. */
	const solver = new ConvolutionStepSolverState(
		() => problem,
		() => onComplete,
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

	<ConvolutionChoiceStep
		stepNumber={1}
		title="Define the Convolution Integral"
		data={problem.itsData.step1}
		state={solver.step1}
		{solver}
		onCheck={(option) => solver.checkStep1(option)}
		summaryLatex={String.raw`y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau`}
	/>

	<ConvolutionChoiceStep
		stepNumber={2}
		title="Flip and Shift the Impulse Response"
		data={problem.itsData.step2}
		state={solver.step2}
		{solver}
		onCheck={(option) => solver.checkStep2(option)}
		summaryLatex={String.raw`h(\tau)\longrightarrow h(-\tau)\longrightarrow h(t-\tau)`}
	/>

	<ConvolutionChoiceStep
		stepNumber={3}
		title="Find the Transition Regions"
		data={problem.itsData.step3}
		state={solver.step3}
		{solver}
		onCheck={(option) => solver.checkStep3(option)}
		summaryLatex={String.raw`\text{All edge-contact transition times identified}`}
		singleColumn={true}
	/>

	<ConvolutionStep4Intervals
		{problem}
		{solver}
	/>

	<ConvolutionChoiceStep
		stepNumber={5}
		title="Assemble the Piecewise Response"
		data={problem.itsData.step5}
		state={solver.step5}
		{solver}
		onCheck={(option) => solver.checkStep5(option)}
		summaryLatex={String.raw`\text{Exact piecewise response assembled}`}
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
