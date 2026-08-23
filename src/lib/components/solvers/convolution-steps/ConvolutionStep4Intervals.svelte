<script lang="ts">
	/**
	 * Reusable multi-part setup/evaluation step for the convolution tutor.
	 *
	 * Carries verified regions forward while focusing the student on one exact
	 * overlap interval at a time, matching the Fourier Series coefficient flow.
	 */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type {
		ConvolutionItsOption,
		ConvolutionProblem,
	} from "$lib/math-engine/convolution";

	interface Props {
		/** Active convolution problem instance. */
		problem: ConvolutionProblem;
		/** Active reactive convolution solver controller. */
		solver: ConvolutionStepSolverState;
		/** Parent step number. */
		stepNumber: 5 | 6;
		/** Student-facing step title. */
		title: string;
		/** Whether this step validates setup or evaluation choices. */
		mode: "setup" | "evaluation";
	}

	let { problem, solver, stepNumber, title, mode }: Props = $props();
	const data = $derived(
		stepNumber === 5 ? problem.itsData.step5 : problem.itsData.step6,
	);
	const state = $derived(stepNumber === 5 ? solver.step5 : solver.step6);
	const completedSummary = $derived(
		data.parts
			.map(
				(part) =>
					`$$${
						mode === "setup" && solver.flippedSignal === "x"
							? (part.flipXResultLatex ?? part.resultLatex)
							: part.resultLatex
					}$$`,
			)
			.join("; "),
	);

	/** Visual status for Step 4. */
	const status = $derived(
		solver.currentStep === stepNumber
			? "active"
			: solver.currentStep > stepNumber
				? "completed"
				: "locked",
	);
	/** Zero-based index of the active interval part. */
	const activeIndex = $derived(
		data.parts.findIndex(({ id }) => id === state.activeSubStepId),
	);
	/** Exact data for the active interval part. */
	const activePart = $derived(
		data.parts.find(({ id }) => id === state.activeSubStepId),
	);
	const activeOptions = $derived(
		mode === "setup" && solver.flippedSignal === "x"
			? (activePart?.flipXOptions ?? activePart?.options ?? [])
			: (activePart?.options ?? []),
	);

	/**
	 * Stores and validates one selected interval result.
	 *
	 * @param option - Selected interval response.
	 */
	function handleSelection(option: ConvolutionItsOption): void {
		if (mode === "setup") solver.checkStep5(option);
		else solver.checkStep6(option);
	}
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill
			progress={stepNumber === 5
				? solver.step5Progress
				: solver.step6Progress}
		/>
	{/if}
{/snippet}

<StepCard
	{stepNumber}
	{title}
	{status}
	{headerExtra}
	summaryLatex={mode === "setup"
		? `Verified support intersections and integral setups: ${completedSummary}`
		: `Evaluated interval results: ${completedSummary}`}
>
	<div class="step-body">
		{#each data.parts.slice(0, activeIndex) as previousPart, index}
			<SubStepBlock
				badge={`Part ${stepNumber}${String.fromCharCode(65 + index)}`}
				title={previousPart.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}
					<MathBlock
						math={mode === "setup" && solver.flippedSignal === "x"
							? (previousPart.flipXResultLatex ??
								previousPart.resultLatex)
							: previousPart.resultLatex}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>
				{/snippet}
			</SubStepBlock>
		{/each}

		<SubStepBlock
			badge={`Part ${stepNumber}${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
			title={activePart?.title ??
				(mode === "setup" ? "Set Up Region" : "Evaluate Region")}
			isCompleted={false}
		>
			<p class="step-prompt">
				<MathText
					text={mode === "setup"
						? String.raw`For $${activePart?.intervalLatex ?? ""}$, identify the support intersection and set the exact integration bounds:`
						: String.raw`For $${activePart?.intervalLatex ?? ""}$, evaluate the verified definite integral:`}
				/>
			</p>
			<MathBlock
				math={String.raw`y(t)=\int_{-\infty}^{\infty}x(\tau)h(t-\tau)\,d\tau`}
				compact={true}
				responsive={true}
			/>
			<div
				class="option-grid"
				data-testid={`convolution-step${stepNumber}-options`}
			>
				{#each activeOptions as option}
					<button
						type="button"
						class="option-card"
						class:selected={state.subSteps[state.activeSubStepId]
							?.selected === option.id}
						onclick={() => handleSelection(option)}
					>
						<MathBlock
							math={option.latex}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
					</button>
				{/each}
			</div>
		</SubStepBlock>

		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step body & prompt ────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	.step-prompt {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* ── Interval choice cards ─────────────────────────────── */

	.option-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.option-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		color: var(--text-primary);
		width: 100%;
		max-width: 100%;
		min-width: 0;
		font-family: inherit;
		box-sizing: border-box;
	}

	.option-card :global(.math-block) {
		margin: 0;
		background: transparent;
		border: none;
		box-shadow: none;
		width: 100%;
	}

	.option-card:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.option-card:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* Selected state */
	.option-card.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}

	/* ── Mobile media query (≤640px) ──────────────────────── */

	@media (max-width: 640px) {
		.option-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
