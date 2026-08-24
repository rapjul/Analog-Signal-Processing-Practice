<script lang="ts">
	/** Multipart moving-signal, formula, and transformed-edge step. */

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
		/** Active convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 3
			? "active"
			: solver.currentStep > 3
				? "completed"
				: "locked",
	);
	const formulaData = $derived(
		problem.itsData.step3.formulaBySignal[solver.flippedSignal],
	);
	const transformedSections = $derived(
		problem.itsData.step3.sectionsBySignal[solver.flippedSignal],
	);
	const selectedFormula = $derived(
		formulaData.options.find(({ isCorrect }) => isCorrect)?.latex ?? "",
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}<PartProgressPill
			progress={solver.step3Progress}
		/>{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-grid">
		<div class="summary-note">
			<MathText
				text={`Moved $${solver.flippedSignal}(t)$ and kept $${solver.flippedSignal === "x" ? "h" : "x"}(\\tau)$ fixed.`}
			/>
		</div>
		<div class="summary-item">
			<MathBlock
				math={selectedFormula}
				compact={true}
				hideHeader={true}
				responsive={true}
			/>
		</div>
		{#each transformedSections as section}
			<div class="summary-item">
				<MathBlock
					math={String.raw`\tau\in ${section.includedEndpoint === "left" || section.includedEndpoint === "both" ? "[" : "("}${section.leftLatex},${section.rightLatex}${section.includedEndpoint === "right" || section.includedEndpoint === "both" ? "]" : ")"}`}
					compact={true}
					hideHeader={true}
					responsive={true}
				/>
			</div>
		{/each}
	</div>
{/snippet}

<StepCard
	stepNumber={3}
	title="Choose Which Signal to Flip and Shift"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		{#if solver.step3.activeSubStepId === "choose-signal"}
			<SubStepBlock
				badge="Part 3A"
				title="Choose the Moving Signal"
			>
				<p class="step-prompt">{problem.itsData.step3.prompt}</p>
				<div class="concept-key">
					<p>
						<strong>Fixed:</strong> stays in place and is written as a
						function of the dummy variable.
					</p>
					<p>
						<strong>Moving:</strong> is reflected first, then translated
						by the output time.
					</p>
					<p>
						<MathText
							text={String.raw`Convolution is commutative, so either path gives the same $y(t)$ even though its notation and bounds look different.`}
						/>
					</p>
				</div>
				<p class="recommendation">
					<MathText text={problem.itsData.step3.recommendation} />
				</p>
				<div class="binary-grid">
					<button
						type="button"
						onclick={() => solver.chooseMovingSignal("x")}
					>
						<MathText
							text={String.raw`Move $x(t)$; keep $h(\tau)$ fixed.`}
						/>
					</button>
					<button
						type="button"
						onclick={() => solver.chooseMovingSignal("h")}
					>
						<MathText
							text={String.raw`Move $h(t)$; keep $x(\tau)$ fixed.`}
						/>
					</button>
				</div>
			</SubStepBlock>
		{:else}
			<SubStepBlock
				badge="Part 3A"
				title="Choose the Moving Signal"
				isCompleted={true}
			>
				{#snippet summarySnippet()}<MathText
						text={`Selected $${solver.flippedSignal}(t)$ as the moving signal.`}
					/>{/snippet}
			</SubStepBlock>
		{/if}

		{#if solver.step3.activeSubStepId === "choose-formula"}
			<SubStepBlock
				badge="Part 3B"
				title="Match the Integral to Your Choice"
			>
				<p class="step-prompt">
					<MathText text={formulaData.prompt} />
				</p>
				<div class="option-grid">
					{#each formulaData.options as option}
						<button
							type="button"
							class:selected={solver.step3.formulaSelected ===
								option.id}
							onclick={() => solver.checkStep3Formula(option)}
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
		{:else if solver.step3.activeSubStepId === "transform-edges"}
			<SubStepBlock
				badge="Part 3B"
				title="Match the Integral to Your Choice"
				isCompleted={true}
			>
				{#snippet summarySnippet()}<MathBlock
						math={selectedFormula}
						compact={true}
						hideHeader={true}
						responsive={true}
					/>{/snippet}
			</SubStepBlock>
		{/if}

		{#if solver.step3.activeSubStepId === "transform-edges"}
			<SubStepBlock
				badge="Part 3C"
				title="Transform Every Moving Section"
			>
				<p class="step-prompt">
					<MathText
						text={String.raw`For each original section $[c,d]$, type the transformed left edge $t-d$ and right edge $t-c$.`}
					/>
				</p>
				<form
					class="edge-form"
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep3Edges();
					}}
				>
					<div class="edge-list">
						{#each transformedSections as section}
							<div class="edge-card">
								<MathText
									text={`Original section ${section.index}: $${section.originalLatex}$.`}
								/>
								<div class="edge-grid">
									<label>
										<span>Transformed left edge</span>
										<input
											type="text"
											bind:value={
												solver.step3.edgeInputs[
													section.id
												].left
											}
											placeholder="e.g. t-2"
										/>
									</label>
									<label>
										<span>Transformed right edge</span>
										<input
											type="text"
											bind:value={
												solver.step3.edgeInputs[
													section.id
												].right
											}
											placeholder="e.g. t"
										/>
									</label>
								</div>
							</div>
						{/each}
					</div>
					<button
						type="submit"
						class="check-button"
					>
						Check transformed edges
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
	/* ── Step and summary layout ───────────────────────────── */
	.step-body,
	.edge-list,
	.edge-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}
	.summary-note {
		grid-column: 1 / -1;
	}
	.summary-item {
		min-width: 0;
	}
	.step-prompt {
		margin: 0;
		color: var(--text-primary);
		line-height: var(--leading-relaxed);
	}
	.concept-key {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.concept-key p,
	.recommendation {
		margin: 0;
		padding: 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.recommendation {
		border-left: 3px solid var(--accent-primary);
	}
	.binary-grid,
	.option-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.binary-grid button,
	.option-grid button {
		min-width: 0;
		padding: 0.8rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
	}
	.option-grid button.selected {
		border-color: var(--accent-primary);
		background: var(--accent-bg);
	}
	.edge-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}
	.edge-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.edge-grid label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.edge-grid input {
		min-width: 0;
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
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
	.option-grid button:focus-visible,
	.edge-grid input:focus-visible,
	.check-button:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤720px) ──────────────────────── */
	@media (max-width: 720px) {
		.summary-grid,
		.edge-grid,
		.concept-key {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.binary-grid,
		.option-grid {
			grid-template-columns: 1fr;
		}
		.check-button {
			width: 100%;
		}
	}
</style>
