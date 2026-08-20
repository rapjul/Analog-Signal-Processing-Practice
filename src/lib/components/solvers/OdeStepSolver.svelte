<script lang="ts">
	/**
	 * OdeStepSolver Svelte 5 Orchestrator Component.
	 *
	 * 7-Step Intelligent Tutoring System (ITS) for Linear Constant-Coefficient ODEs.
	 *
	 * Orchestrates step progression through:
	 * - Step 1: Characteristic Equation Setup (OdeStep1CharEq)
	 * - Step 2: Characteristic Roots & Strategy (OdeStep2Roots)
	 * - Step 3: Homogeneous Form Template (OdeStep3Homogeneous)
	 * - Step 4: Particular Solution Ansatz (OdeStep4Ansatz)
	 * - Step 5: Undetermined Coefficients (OdeStep5Coefficients)
	 * - Step 6: Initial Conditions System & Constants (OdeStep6InitialConditions)
	 * - Step 7: Dual Response Decomposition & Conceptual Mastery (OdeStep7Decomposition)
	 */

	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import Progress from "../ui/Progress.svelte";
	import { OdeStepSolverState } from "./ode-step-solver.svelte";
	import OdeStep1CharEq from "./ode-steps/OdeStep1CharEq.svelte";
	import OdeStep2Roots from "./ode-steps/OdeStep2Roots.svelte";
	import OdeStep3Homogeneous from "./ode-steps/OdeStep3Homogeneous.svelte";
	import OdeStep4Ansatz from "./ode-steps/OdeStep4Ansatz.svelte";
	import OdeStep5Coefficients from "./ode-steps/OdeStep5Coefficients.svelte";
	import OdeStep6InitialConditions from "./ode-steps/OdeStep6InitialConditions.svelte";
	import OdeStep7Decomposition from "./ode-steps/OdeStep7Decomposition.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Callback triggered when all 7 steps are completed */
		onComplete?: () => void;
	}

	let { problem, onComplete }: Props = $props();

	// Reactive step solver controller
	const solver = new OdeStepSolverState(
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

<div class="ode-step-solver">
	<Progress
		currentStep={solver.currentStep}
		totalSteps={solver.totalSteps}
	/>

	<!-- Step 1: Characteristic Equation Setup -->
	<OdeStep1CharEq
		{problem}
		{solver}
	/>

	<!-- Step 2: Characteristic Roots & Strategy -->
	<OdeStep2Roots
		{problem}
		{solver}
	/>

	<!-- Step 3: Homogeneous Form Selection -->
	<OdeStep3Homogeneous
		{problem}
		{solver}
	/>

	<!-- Step 4: Particular Solution Ansatz Guess -->
	<OdeStep4Ansatz
		{problem}
		{solver}
	/>

	<!-- Step 5: Solve Particular Coefficients -->
	<OdeStep5Coefficients
		{problem}
		{solver}
	/>

	<!-- Step 6: Initial Conditions System & Solved Constants -->
	<OdeStep6InitialConditions
		{problem}
		{solver}
	/>

	<!-- Step 7: Dual Response Decomposition & Conceptual Mastery -->
	<OdeStep7Decomposition
		{problem}
		{solver}
	/>
</div>

<style>
	/* ── Outer solver container ────────────────────────────── */

	.ode-step-solver {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}
</style>
