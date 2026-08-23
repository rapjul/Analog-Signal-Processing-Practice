<script lang="ts">
	/** Sequential breakpoint-contact and interval-construction step. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathInline from "$lib/components/math/MathInline.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution";

	interface Props {
		/** Active exact convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 4
			? "active"
			: solver.currentStep > 4
				? "completed"
				: "locked",
	);
	const activeId = $derived(solver.step4.activeSubStepId);
	const activeState = $derived(solver.step4.subSteps[activeId]);
	const breakpoint = $derived(
		problem.itsData.step4.breakpointParts.find(({ id }) => id === activeId),
	);
	const transition = $derived(
		problem.itsData.step4.transitionGroups.find(
			({ id }) => id === activeId,
		),
	);
	const contacts = $derived(
		transition?.contactsBySignal[solver.flippedSignal] ?? [],
	);
	const completedTransitions = $derived(
		problem.itsData.step4.transitionGroups
			.map(({ time }) => `t=${time}`)
			.join(",\\;"),
	);
	const completedIntervals = $derived(
		problem.itsData.step4.intervalLabels.join(",\\;"),
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}<PartProgressPill
			progress={solver.step4Progress}
		/>{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-list">
		<MathBlock
			math={`\mathcal T=\{${completedTransitions}\}`}
			compact={true}
			hideHeader={true}
			responsive={true}
		/>
		<MathBlock
			math={`\mathcal R=\{${completedIntervals}\}`}
			compact={true}
			hideHeader={true}
			responsive={true}
		/>
	</div>
{/snippet}

<StepCard
	stepNumber={4}
	title="Find Transition Points, Then Build Time Intervals"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p class="definition">
			<strong>Breakpoint:</strong> a start edge, end edge, interior slope change,
			or piecewise formula change.
		</p>

		{#if activeId === "section-count-x" || activeId === "section-count-h"}
			{@const signal = activeId === "section-count-x" ? "x" : "h"}
			<p class="step-prompt">
				<MathText
					text={`How many distinct nonzero pulses or connected sections does $${signal}(t)$ contain? Count overlapping sections separately.`}
				/>
			</p>
			<p class="context-note">
				Known overlaps between these sections: {problem.itsData.step4
					.sectionOverlapCounts[signal]}.
			</p>
		{:else if breakpoint}
			<p class="step-prompt">
				<MathText
					text={`Find interior edge, slope, or formula change ${breakpoint.index} of $${breakpoint.signal}(t)$. Enter its time value.`}
				/>
			</p>
		{:else if transition}
			<p class="step-prompt">
				Solve the following contact equation{contacts.length === 1
					? ""
					: "s"}. Contacts with the same answer form one transition
				time.
			</p>
			<div class="contact-list">
				{#each contacts as contact}
					<MathBlock
						math={contact.equationLatex}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>
				{/each}
			</div>
		{:else if activeId === "interval-builder"}
			<p class="step-prompt">
				Use the verified sorted transition times to fill every interval
				boundary.
			</p>
			<div class="interval-list">
				<label
					><MathInline math="t<" /><input
						type="text"
						bind:value={activeState.intervalInputs[0]}
						aria-label="First interval upper boundary"
					/></label
				>
				{#each activeState.intervalInputs.slice(0, -1) as _, index}
					<label
						><input
							type="text"
							bind:value={activeState.intervalInputs[index]}
							aria-label={`Interval ${index + 2} lower boundary`}
						/><MathInline math="\le t<" /><input
							type="text"
							bind:value={activeState.intervalInputs[index + 1]}
							aria-label={`Interval ${index + 2} upper boundary`}
						/></label
					>
				{/each}
				<label
					><MathInline math="t\ge" /><input
						type="text"
						bind:value={
							activeState.intervalInputs[
								activeState.intervalInputs.length - 1
							]
						}
						aria-label="Final interval lower boundary"
					/></label
				>
			</div>
		{/if}

		{#if activeId !== "interval-builder"}
			<label class="scalar-entry"
				><span>Your answer</span><input
					type="text"
					bind:value={activeState.input}
					onkeydown={(event) =>
						event.key === "Enter" && solver.checkStep4()}
				/></label
			>
		{/if}
		<button
			type="button"
			class="check-button"
			onclick={() => solver.checkStep4()}
			>{activeId === "interval-builder"
				? "Check interval partition"
				: "Check this part"}</button
		>
		<StepFeedback {solver} />
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Step layout ───────────────────────────────────────── */
	.step-body,
	.summary-list,
	.contact-list,
	.interval-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.definition,
	.step-prompt,
	.context-note {
		margin: 0;
		line-height: var(--leading-relaxed);
	}
	.definition {
		color: var(--text-secondary);
	}
	.step-prompt {
		color: var(--text-primary);
	}
	.context-note {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.scalar-entry {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-width: 320px;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.scalar-entry input,
	.interval-list input {
		min-width: 0;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font: inherit;
	}
	.interval-list label {
		display: grid;
		grid-template-columns: auto minmax(70px, 160px) auto minmax(
				70px,
				160px
			);
		align-items: center;
		justify-content: start;
		gap: 0.45rem;
	}
	.interval-list label:first-child,
	.interval-list label:last-child {
		grid-template-columns: auto minmax(70px, 160px);
	}
	.check-button {
		align-self: flex-start;
		padding: 0.55rem 0.9rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--accent-primary);
		color: var(--black-100);
		font-weight: 700;
		cursor: pointer;
	}
	.scalar-entry input:focus-visible,
	.interval-list input:focus-visible,
	.check-button:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤520px) ──────────────────────── */
	@media (max-width: 520px) {
		.interval-list label {
			grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
		}
		.check-button {
			width: 100%;
		}
	}
</style>
