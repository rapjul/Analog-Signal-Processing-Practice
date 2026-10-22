<script lang="ts">
	/** Multipart typed timing step for x, h, and the convolution output. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution/index";

	interface Props {
		/** Active exact convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 1
			? "active"
			: solver.currentStep > 1
				? "completed"
				: "locked",
	);
	const activeIndex = $derived(
		problem.itsData.step1.parts.findIndex(
			({ id }) => id === solver.step1.activeSubStepId,
		),
	);
	const activePart = $derived(problem.itsData.step1.parts[activeIndex]);
	const activeState = $derived(
		solver.step1.subSteps[solver.step1.activeSubStepId],
	);
	const timingParts = $derived(problem.itsData.step1.parts);

	/** Formats finite and infinite timing values for generated LaTeX. */
	function timingValueLatex(value: number): string {
		if (value === Number.POSITIVE_INFINITY) return String.raw`\infty`;
		if (value === Number.NEGATIVE_INFINITY) return String.raw`-\infty`;
		return String(value);
	}
</script>

{#snippet headerExtra()}
	{#if status === "active"}
		<PartProgressPill progress={solver.step1Progress} />
	{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-list">
		{#each problem.itsData.step1.parts as part}
			<MathBlock
				math={part.resultLatex}
				compact={true}
				hideHeader={true}
				responsive={true}
			/>
		{/each}
	</div>
{/snippet}

<StepCard
	stepNumber={1}
	title="Find Signal Start Times, End Times, and Widths"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p class="support-intro">{problem.itsData.step1.intro}</p>
		{#each problem.itsData.step1.parts.slice(0, activeIndex) as part, index}
			<SubStepBlock
				badge={`Part 1${String.fromCharCode(65 + index)}`}
				title={part.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}
					<MathBlock
						math={part.resultLatex}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>
				{/snippet}
			</SubStepBlock>
		{/each}

		{#if activePart && activeState}
			<SubStepBlock
				badge={`Part 1${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
				title={activePart.title}
			>
				{#if activePart.id === "y"}
					<div class="timing-property">
						<p>
							The first possible overlap occurs when the two start
							times add. The final possible overlap occurs when
							the two end times add. Signed contributions can
							cancel within this span, so these are bounds on
							overlap, not a guarantee of nonzero output.
						</p>
						<MathBlock
							math={String.raw`t_{\mathrm{overlap,start}}=t_{x,\mathrm{start}}+t_{h,\mathrm{start}},\qquad t_{\mathrm{overlap,end}}=t_{x,\mathrm{end}}+t_{h,\mathrm{end}}`}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
						<div class="timing-lines">
							<p class="diagram-intro">
								Each line shows one complete time span. Compare
								start with start and end with end.
							</p>
							<div
								class="span-diagram"
								role="img"
								aria-label="Three aligned number lines for the x signal, h signal, and possible overlap span. The overlap bounds are the input starts added and the input ends added."
							>
								{#each timingParts as part}
									<div class="span-row">
										<MathText
											text={`$${part.signalLatex}$`}
										/>
										<div
											class="span-line"
											aria-hidden="true"
										>
											<span class="endpoint start"></span>
											<span class="endpoint end"></span>
										</div>
										<MathText
											text={`$${timingValueLatex(part.start)}$ to $${timingValueLatex(part.end)}$`}
										/>
									</div>
								{/each}
							</div>
							<MathBlock
								math={String.raw`W_{\mathrm{overlap}}=W_x+W_h`}
								compact={true}
								hideHeader={true}
								responsive={true}
							/>
						</div>
					</div>
				{/if}
				<p class="part-prompt">
					<MathText
						text={activePart.id === "y"
							? "Enter the start time, end time, and width of the possible overlap span."
							: `Enter the start time, end time, and ${problem.itsData.step3.sectionsBySignal[activePart.id].length > 1 ? "overall span width" : "signal width"} for $${activePart.signalLatex}$.`}
					/>
				</p>
				<form
					class="answer-form"
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep1();
					}}
				>
					<div class="timing-grid">
						<label>
							<span>Start time</span>
							<input
								type="text"
								bind:value={activeState.start}
								placeholder="e.g. -2 or 0"
							/>
						</label>
						<label>
							<span>End time</span>
							<input
								type="text"
								bind:value={activeState.end}
								placeholder="e.g. 3 or infinity"
							/>
						</label>
						<label>
							<span
								>{activePart.id === "y"
									? "Overlap span width"
									: problem.itsData.step3.sectionsBySignal[
												activePart.id
										  ].length > 1
										? "Overall span width"
										: "Signal width"}</span
							>
							<input
								type="text"
								bind:value={activeState.width}
								placeholder="end - start"
							/>
						</label>
					</div>
					<button
						type="submit"
						class="check-button"
					>
						Check timing and width
					</button>
				</form>
			</SubStepBlock>
		{/if}
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
	.answer-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}
	.support-intro {
		margin: 0;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
	}
	.part-prompt {
		margin: 0;
		color: var(--text-primary);
	}
	.timing-property {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}
	.timing-property p {
		margin: 0;
		color: var(--text-secondary);
	}
	.timing-lines {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.diagram-intro {
		margin: 0;
		font-size: var(--text-sm);
	}
	.span-diagram {
		display: grid;
		gap: 0.55rem;
		padding: 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--bg-card);
	}
	.span-row {
		display: grid;
		grid-template-columns: minmax(2.5rem, auto) minmax(5rem, 1fr) minmax(
				8rem,
				auto
			);
		gap: 0.65rem;
		align-items: center;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}
	.span-line {
		position: relative;
		height: 2px;
		background: var(--accent-primary);
	}
	.endpoint {
		position: absolute;
		top: 50%;
		width: 0.6rem;
		height: 0.6rem;
		border: 2px solid var(--accent-primary);
		border-radius: 50%;
		background: var(--bg-card);
		transform: translateY(-50%);
	}
	.endpoint.start {
		left: 0;
	}
	.endpoint.end {
		right: 0;
	}
	.timing-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.timing-grid label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.timing-grid input {
		min-width: 0;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font: inherit;
	}
	.timing-grid input:focus-visible,
	.check-button:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
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

	/* ── Mobile media query (≤640px) ──────────────────────── */
	@media (max-width: 640px) {
		.span-row {
			grid-template-columns: minmax(2.5rem, auto) minmax(4rem, 1fr);
		}
		.span-row > :last-child {
			grid-column: 1 / -1;
		}
		.timing-grid {
			grid-template-columns: 1fr;
		}
		.check-button {
			width: 100%;
		}
	}
</style>
