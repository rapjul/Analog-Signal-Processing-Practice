<script lang="ts">
	/**
	 * Seven-step Intelligent Tutoring System orchestrator for convolution.
	 *
	 * Follows the ODE and Fourier Series solver path with centralized reactive
	 * state, locked/completed StepCards, progressive hints, and visual test hooks.
	 */

	import ConvolutionChoiceStep from "$lib/components/solvers/convolution-steps/ConvolutionChoiceStep.svelte";
	import ConvolutionStep4Intervals from "$lib/components/solvers/convolution-steps/ConvolutionStep4Intervals.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import {
		type ConvolutionProblem,
		getFiniteConvolutionTransitionTimes,
	} from "$lib/math-engine/convolution";
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
	const supportSummary = $derived(
		problem.itsData.step1.options.find(({ isCorrect }) => isCorrect)
			?.latex ?? "",
	);
	const transitionSummary = $derived(
		getFiniteConvolutionTransitionTimes(problem.intervals)
			.map((time) => `t=${time}`)
			.join(",\\;"),
	);
	const intervalSummary = $derived(
		problem.intervals.map(({ labelLatex }) => labelLatex).join(",\\;"),
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
		title="Analyze the Signal Supports"
		data={problem.itsData.step1}
		state={solver.step1}
		{solver}
		onCheck={(option) => solver.checkStep1(option)}
		summaryLatex={`Verified supports and widths: $${supportSummary}$.`}
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

	<ConvolutionChoiceStep
		stepNumber={3}
		title="Choose, Flip, and Shift a Signal"
		data={problem.itsData.step3}
		state={solver.step3}
		{solver}
		onCheck={(option) => solver.checkStep3(option)}
		summaryLatex={solver.flippedSignal === "x"
			? String.raw`Selected $x(t)$ as the moving signal: use $h(\tau)x(t-\tau)$.`
			: String.raw`Selected $h(t)$ as the moving signal: use $x(\tau)h(t-\tau)$.`}
		singleColumn={true}
	/>

	<ConvolutionChoiceStep
		stepNumber={4}
		title="Find Transition Points and Build Intervals"
		data={problem.itsData.step4}
		state={solver.step4}
		{solver}
		onCheck={(option) => solver.checkStep4(option)}
		summaryLatex={`Transition points: $${transitionSummary}$. Intervals: $${intervalSummary}$.`}
		singleColumn={true}
	/>

	<ConvolutionStep4Intervals
		{problem}
		{solver}
		stepNumber={5}
		title="Set Up Every Overlap Integral"
		mode="setup"
	/>

	<ConvolutionStep4Intervals
		{problem}
		{solver}
		stepNumber={6}
		title="Evaluate Every Overlap Integral"
		mode="evaluation"
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
