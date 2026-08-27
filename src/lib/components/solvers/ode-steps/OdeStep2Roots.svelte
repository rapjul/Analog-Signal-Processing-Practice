<script lang="ts">
	/**
	 * OdeStep2Roots Svelte 5 Component.
	 *
	 * Step 2: Characteristic Roots & Strategy State Machine.
	 *
	 * Guides students through strategy gate (factoring vs quadratic formula),
	 * root classification, remedial discriminant calculation, and root verification.
	 */

	import MathText from "$lib/components/math/MathText.svelte";
	import type { OdeStepSolverState } from "$lib/components/solvers/ode-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { OdeProblem } from "$lib/math-engine/odes/index";
	import OdeStep2Factoring from "./step2-substeps/OdeStep2Factoring.svelte";
	import OdeStep2Quadratic from "./step2-substeps/OdeStep2Quadratic.svelte";
	import OdeStep2StrategyGate from "./step2-substeps/OdeStep2StrategyGate.svelte";

	interface Props {
		/** Active ODE problem instance */
		problem: OdeProblem;
		/** Active reactive ODE solver controller */
		solver: OdeStepSolverState;
	}

	let { problem, solver }: Props = $props();

	const status = $derived(
		solver.currentStep === 2
			? "active"
			: solver.currentStep > 2
				? "completed"
				: "locked",
	);
</script>

{#snippet summarySnippet()}
	<span>
		Roots:
		<MathText text={`$${problem.itsData.step2.symbolicRootsLatex}$`} />
	</span>
	{#if solver.step2.strategy === "quadratic" && "isFactorable" in problem.itsData.step2 && problem.itsData.step2.isFactorable && problem.itsData.step2.factoredFormLatex}
		<span class="shortcut-tip-note">
			<MathText
				text={`(Factoring shortcut: $${problem.itsData.step2.factoredFormLatex}$)`}
			/>
		</span>
	{/if}
{/snippet}

<StepCard
	stepNumber={2}
	title="Characteristic Polynomial Roots"
	{status}
	{summarySnippet}
>
	<div class="step-body">
		<p class="step-prompt">
			<MathText
				text={`Characteristic Polynomial: $${problem.itsData.step1.latex}$`}
			/>
		</p>

		<!-- Strategy selection only applies to quadratic equations. -->
		<OdeStep2StrategyGate
			{problem}
			{solver}
		/>

		{#if solver.step2.strategy === "factoring"}
			<!-- Factoring Path -->
			<OdeStep2Factoring
				{problem}
				{solver}
			/>
		{:else if solver.step2.strategy === "quadratic"}
			<!-- Quadratic Formula Setup Path -->
			<OdeStep2Quadratic
				{problem}
				{solver}
			/>
		{/if}

		<!-- Feedback & Progressive Hints -->
		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Box-drawing section dividers ────────────────────────────────────────── */
	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.shortcut-tip-note {
		font-size: var(--text-xs);
		color: var(--accent-primary);
		opacity: 0.9;
	}
</style>
