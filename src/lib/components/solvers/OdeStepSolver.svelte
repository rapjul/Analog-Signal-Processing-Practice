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

	import OdeStep1CharEq from "$lib/components/solvers/ode-steps/OdeStep1CharEq.svelte";
	import OdeStep2Roots from "$lib/components/solvers/ode-steps/OdeStep2Roots.svelte";
	import OdeStep3Homogeneous from "$lib/components/solvers/ode-steps/OdeStep3Homogeneous.svelte";
	import OdeStep4Ansatz from "$lib/components/solvers/ode-steps/OdeStep4Ansatz.svelte";
	import OdeStep5Coefficients from "$lib/components/solvers/ode-steps/OdeStep5Coefficients.svelte";
	import OdeStep6InitialConditions from "$lib/components/solvers/ode-steps/OdeStep6InitialConditions.svelte";
	import OdeStep7Decomposition from "$lib/components/solvers/ode-steps/OdeStep7Decomposition.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import { OdeStepSolverState } from "./ode-step-solver.svelte";

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
	let lastProblem: OdeProblem | undefined;
	$effect(() => {
		if (problem !== lastProblem) {
			lastProblem = problem;
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
