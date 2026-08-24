<script lang="ts">
	/** Typed max/min integration-bound step for every verified interval. */

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
		solver.currentStep === 5
			? "active"
			: solver.currentStep > 5
				? "completed"
				: "locked",
	);
	const activeIndex = $derived(
		problem.itsData.step5.parts.findIndex(
			({ id }) => id === solver.step5.activeSubStepId,
		),
	);
	const activePart = $derived(problem.itsData.step5.parts[activeIndex]);
	const activeState = $derived(
		solver.step5.subSteps[solver.step5.activeSubStepId],
	);
	const activeSetup = $derived(
		activePart?.setupBySignal?.[solver.flippedSignal],
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}<PartProgressPill
			progress={solver.step5Progress}
		/>{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-table">
		{#each problem.itsData.step5.parts as part}
			<div class="summary-row">
				<MathText text={`$${part.intervalLatex}$`} />
				<MathBlock
					math={part.setupBySignal?.[solver.flippedSignal]
						.integralLatex ?? "y(t)=0"}
					compact={true}
					hideHeader={true}
					responsive={true}
				/>
			</div>
		{/each}
	</div>
{/snippet}

<StepCard
	stepNumber={5}
	title="Determine Every Integral's Bounds"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p class="method">
			<MathText
				text={String.raw`For fixed section $[a,b]$ and original moving section $[c,d]$, the transformed section is $[t-d,t-c]$. Use $L(t)=\max(a,t-d)$ and $U(t)=\min(b,t-c)$.`}
			/>
		</p>
		<details class="other-methods">
			<summary>Other valid methods for comparing bounds</summary>
			<p>
				You may instead solve an algebraic inequality between the two
				candidates or draw both intervals on a number line. The tutor
				uses an interior test value because it is quick and avoids an
				endpoint tie. Step 4 guarantees the ordering cannot change
				inside the verified interval.
			</p>
			<div
				class="number-line-example"
				role="img"
				aria-label="Number-line example: the overlap starts at the farther-right left edge and ends at the farther-left right edge."
			>
				<span class="axis"></span>
				<span class="fixed-range">fixed section</span>
				<span class="moving-range">transformed section</span>
				<span class="overlap-range">active overlap</span>
			</div>
		</details>
		{#each problem.itsData.step5.parts.slice(0, activeIndex) as part, index}
			<SubStepBlock
				badge={`Part 5${String.fromCharCode(65 + index)}`}
				title={part.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}<MathBlock
						math={part.setupBySignal?.[solver.flippedSignal]
							.integralLatex ?? "y(t)=0"}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>{/snippet}
			</SubStepBlock>
		{/each}

		{#if activePart && activeState && activeSetup}
			<SubStepBlock
				badge={`Part 5${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
				title={activePart.title}
			>
				<p class="step-prompt">
					<MathText
						text={`For $${activePart.intervalLatex}$, do the fixed and transformed signals overlap?`}
					/>
				</p>
				<div class="binary-grid">
					<button
						type="button"
						class:selected={activeState.hasOverlap === true}
						aria-pressed={activeState.hasOverlap === true}
						onclick={() => solver.chooseStep5Overlap(true)}
					>
						Yes, there is overlap
					</button>
					<button
						type="button"
						class:selected={activeState.hasOverlap === false}
						aria-pressed={activeState.hasOverlap === false}
						onclick={() => solver.chooseStep5Overlap(false)}
					>
						No overlap
					</button>
				</div>

				{#if activeState.hasOverlap === true && activeSetup.hasOverlap}
					<form
						class="bounds-form"
						onsubmit={(event) => {
							event.preventDefault();
							solver.checkStep5();
						}}
					>
						<div class="bounds-list">
							{#each activeSetup.overlaps as overlap, overlapIndex}
								<div class="bounds-card">
									<h5>
										Connected overlap {overlapIndex + 1}
									</h5>
									<div class="candidate-grid">
										<div>
											<span>Lower candidates</span
											><MathBlock
												math={String.raw`\max\left(${overlap.lowerCandidatesLatex.join(",")}\right)`}
												compact={true}
												hideHeader={true}
												responsive={true}
											/>
										</div>
										<div>
											<span>Upper candidates</span
											><MathBlock
												math={String.raw`\min\left(${overlap.upperCandidatesLatex.join(",")}\right)`}
												compact={true}
												hideHeader={true}
												responsive={true}
											/>
										</div>
									</div>
									<p class="comparison-prompt">
										<MathText
											text={`First substitute the safe interior value $t=${activeSetup.overlaps[overlapIndex]?.representativeTime}$. Choose the larger lower value and the smaller upper value.`}
										/>
									</p>
									<div class="candidate-value-grid">
										{#each overlap.lowerCandidatesLatex as candidate, candidateIndex}
											<label>
												<MathText
													text={`$${candidate}$ at the test time`}
												/>
												<input
													type="text"
													bind:value={
														activeState.boundInputs[
															overlapIndex
														].lowerValues[
															candidateIndex
														]
													}
												/>
											</label>
										{/each}
										{#each overlap.upperCandidatesLatex as candidate, candidateIndex}
											<label>
												<MathText
													text={`$${candidate}$ at the test time`}
												/>
												<input
													type="text"
													bind:value={
														activeState.boundInputs[
															overlapIndex
														].upperValues[
															candidateIndex
														]
													}
												/>
											</label>
										{/each}
									</div>
									<div class="bound-input-grid">
										<label>
											<span>Simplified lower limit</span>
											<input
												type="text"
												bind:value={
													activeState.boundInputs[
														overlapIndex
													].lower
												}
												placeholder="larger left edge"
											/>
										</label>
										<label>
											<span>Simplified upper limit</span>
											<input
												type="text"
												bind:value={
													activeState.boundInputs[
														overlapIndex
													].upper
												}
												placeholder="smaller right edge"
											/>
										</label>
									</div>
									{#if overlap.splitPointsLatex.length > 0}
										<div class="split-grid">
											{#each overlap.splitPointsLatex as _, splitIndex}
												<label>
													<span>
														Interior split point {splitIndex +
															1}
													</span>
													<input
														type="text"
														bind:value={
															activeState
																.boundInputs[
																overlapIndex
															].splits[splitIndex]
														}
														placeholder="slope or formula change"
													/>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<button
							type="submit"
							class="check-button"
						>
							Check bounds
						</button>
					</form>
				{/if}
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
	/* ── Step and summary layout ───────────────────────────── */
	.step-body,
	.bounds-list,
	.summary-table,
	.bounds-form {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		min-width: 0;
	}
	.method,
	.step-prompt,
	.comparison-prompt,
	.other-methods p {
		margin: 0;
		line-height: var(--leading-relaxed);
		color: var(--text-primary);
	}
	.number-line-example {
		position: relative;
		min-height: 6.5rem;
		margin-top: 0.75rem;
		color: var(--text-secondary);
		font-size: var(--text-xs);
	}
	.number-line-example .axis,
	.number-line-example span:not(.axis) {
		position: absolute;
		left: 5%;
		right: 5%;
	}
	.number-line-example .axis {
		top: 3.1rem;
		border-top: 1px solid var(--border-color);
	}
	.number-line-example span:not(.axis) {
		height: 1.15rem;
		border-top: 0.25rem solid;
		text-align: center;
	}
	.number-line-example .fixed-range {
		top: 0.4rem;
		right: 26%;
		border-color: var(--color-warning);
	}
	.number-line-example .moving-range {
		top: 2.25rem;
		left: 28%;
		border-color: var(--color-info);
	}
	.number-line-example .overlap-range {
		top: 4.1rem;
		left: 28%;
		right: 26%;
		border-color: var(--color-success);
		font-weight: 700;
	}
	.other-methods {
		padding: 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.other-methods summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--accent-primary);
	}
	.other-methods summary:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}
	.binary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.binary-grid button {
		padding: 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
	}
	.binary-grid button.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}
	.bounds-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}
	.bounds-card h5 {
		margin: 0;
		color: var(--accent-primary);
	}
	.candidate-grid,
	.candidate-value-grid,
	.bound-input-grid,
	.split-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.candidate-grid > div,
	.candidate-value-grid label,
	.bound-input-grid label,
	.split-grid label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.bound-input-grid input,
	.candidate-value-grid input,
	.split-grid input {
		min-width: 0;
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
	}
	.summary-row {
		display: grid;
		grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border-color);
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
	.binary-grid button:focus-visible,
	.candidate-value-grid input:focus-visible,
	.bound-input-grid input:focus-visible,
	.split-grid input:focus-visible,
	.check-button:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤640px) ──────────────────────── */
	@media (max-width: 640px) {
		.candidate-grid,
		.candidate-value-grid,
		.bound-input-grid,
		.split-grid,
		.summary-row {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 480px) {
		.binary-grid {
			grid-template-columns: 1fr;
		}
		.check-button {
			width: 100%;
		}
	}
</style>
