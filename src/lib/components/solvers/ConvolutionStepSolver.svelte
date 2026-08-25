<script lang="ts">
	/**
	 * Seven-step Intelligent Tutoring System orchestrator for convolution.
	 *
	 * Follows the ODE and Fourier Series solver path with centralized reactive
	 * state, locked/completed StepCards, progressive hints, and visual test hooks.
	 */

	import { tick } from "svelte";
	import ConvolutionChoiceStep from "$lib/components/solvers/convolution-steps/ConvolutionChoiceStep.svelte";
	import ConvolutionStep1Timing from "$lib/components/solvers/convolution-steps/ConvolutionStep1Timing.svelte";
	import ConvolutionStep3Flip from "$lib/components/solvers/convolution-steps/ConvolutionStep3Flip.svelte";
	import ConvolutionStep4Transitions from "$lib/components/solvers/convolution-steps/ConvolutionStep4Transitions.svelte";
	import ConvolutionStep5Bounds from "$lib/components/solvers/convolution-steps/ConvolutionStep5Bounds.svelte";
	import ConvolutionStep6Evaluation from "$lib/components/solvers/convolution-steps/ConvolutionStep6Evaluation.svelte";
	import ConvolutionStep7Piecewise from "$lib/components/solvers/convolution-steps/ConvolutionStep7Piecewise.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution";
	import { ConvolutionStepSolverState } from "./convolution-step-solver.svelte";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Callback triggered with the verified moving-signal choice. */
		onComplete?: (flippedSignal: "x" | "h") => void;
		/** Callback triggered as soon as Step 3 verifies the moving path. */
		onMovingSignalVerified?: (flippedSignal: "x" | "h") => void;
	}

	let { problem, onComplete, onMovingSignalVerified }: Props = $props();

	/** Reactive convolution tutor controller. */
	const solver = new ConvolutionStepSolverState(
		() => problem,
		() => () => onComplete?.(solver.flippedSignal),
	);

	/** Last problem identifier used to synchronize state resets. */
	let lastProblemId = "";
	let lastVerifiedMovingSignal = "";
	let solverElement: HTMLDivElement | undefined = $state();
	let lastProgressKey = "";
	$effect(() => {
		if (problem.id !== lastProblemId) {
			lastProblemId = problem.id;
			solver.reset();
		}
	});

	$effect(() => {
		const selected = solver.step3.selectedSignal;
		const isVerified = solver.step3.subSteps?.["choose-signal"]?.isValid;
		if (!selected || !isVerified || selected === lastVerifiedMovingSignal)
			return;
		lastVerifiedMovingSignal = selected;
		onMovingSignalVerified?.(selected);
	});

	/** Focuses the newly active instructions after verified work remains visible. */
	$effect(() => {
		const progressKey = [
			solver.currentStep,
			solver.currentStep === 1 ? solver.step1.activeSubStepId : "",
			solver.currentStep === 3 ? solver.step3.activeSubStepId : "",
			solver.currentStep === 4 ? solver.step4.activeSubStepId : "",
			solver.currentStep === 5 ? solver.step5.activeSubStepId : "",
			solver.currentStep === 6 ? solver.step6.activeSubStepId : "",
			solver.currentStep === 7
				? solver.step7.rows.findIndex(({ isValid }) => !isValid)
				: "",
		].join(":");
		if (!lastProgressKey) {
			lastProgressKey = progressKey;
			return;
		}
		if (progressKey === lastProgressKey) return;
		lastProgressKey = progressKey;
		const timeout = window.setTimeout(async () => {
			await tick();
			const heading =
				solverElement?.querySelector<HTMLElement>(
					".step-card.active .piecewise-builder form:not(.verified) [data-progress-heading]",
				) ??
				solverElement?.querySelector<HTMLElement>(
					".step-card.active .subpart-block:not(.subpart-done) [data-progress-heading]",
				) ??
				solverElement?.querySelector<HTMLElement>(
					".step-card.active > .step-header [data-progress-heading]",
				);
			if (!heading) return;
			heading.focus({ preventScroll: true });
			const bounds = heading.getBoundingClientRect();
			if (bounds.top >= 0 && bounds.bottom <= window.innerHeight) return;
			const reducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			heading.scrollIntoView({
				block: "start",
				behavior: reducedMotion ? "auto" : "smooth",
			});
		}, 180);
		return () => window.clearTimeout(timeout);
	});
</script>

<div
	class="convolution-step-solver"
	bind:this={solverElement}
>
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
		showNotationKey={true}
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

	<ConvolutionStep7Piecewise
		{problem}
		{solver}
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
