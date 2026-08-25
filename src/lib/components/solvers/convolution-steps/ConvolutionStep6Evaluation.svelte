<script lang="ts">
	/** Typed interval-expression evaluation step with live LaTeX preview. */

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
		solver.currentStep === 6
			? "active"
			: solver.currentStep > 6
				? "completed"
				: "locked",
	);
	const activeIndex = $derived(
		problem.itsData.step6.parts.findIndex(
			({ id }) => id === solver.step6.activeSubStepId,
		),
	);
	const activePart = $derived(problem.itsData.step6.parts[activeIndex]);
	const activeState = $derived(
		solver.step6.subSteps[solver.step6.activeSubStepId],
	);
	const verifiedSetup = $derived(
		problem.itsData.step5.parts[activeIndex]?.setupBySignal?.[
			solver.flippedSignal
		].integralLatex ?? "y(t)=0",
	);
	const suppliedPrimitive = $derived(
		activePart?.primitiveBySignal?.[solver.flippedSignal] ??
			activePart?.primitiveLatex ??
			"",
	);
	const evaluationTerms = $derived(
		activePart?.evaluationBySignal?.[solver.flippedSignal] ?? [],
	);
	const activeTerm = $derived(
		evaluationTerms[activeState?.activeTermIndex ?? 0],
	);
	const activeTermInput = $derived(
		activeState?.termInputs[activeState?.activeTermIndex ?? 0],
	);
</script>

{#snippet headerExtra()}
	{#if status === "active"}<PartProgressPill
			progress={solver.step6Progress}
		/>{/if}
{/snippet}

{#snippet completedSummary()}
	<div class="summary-table">
		{#each problem.itsData.step6.parts as part, index}
			<div class="summary-row">
				<MathText text={`$${part.intervalLatex}$`} /><MathBlock
					math={`y(t)=${problem.intervals[index]?.exprLatex ?? "0"}`}
					compact={true}
					hideHeader={true}
					responsive={true}
				/>
			</div>
		{/each}
	</div>
{/snippet}

<StepCard
	stepNumber={6}
	title="Evaluate Every Overlap Integral"
	{status}
	{headerExtra}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		{#each problem.itsData.step6.parts.filter(({ carriedZero }) => carriedZero) as part}
			{@const index = problem.itsData.step6.parts.indexOf(part)}
			<SubStepBlock
				badge={`Part 6${String.fromCharCode(65 + index)}`}
				title={part.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}<div class="compact-result">
						<MathText text={`$${part.intervalLatex}$`} />
						<MathBlock
							math="y(t)=0"
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
						<span class="carried-note"
							>Carried forward from the verified no-overlap result
							in Step 5.</span
						>
					</div>{/snippet}
			</SubStepBlock>
		{/each}
		{#each problem.itsData.step6.parts.filter((part) => !part.carriedZero && solver.step6.subSteps[part.id]?.isValid) as part}
			{@const index = problem.itsData.step6.parts.indexOf(part)}
			<SubStepBlock
				badge={`Part 6${String.fromCharCode(65 + index)}`}
				title={part.title}
				isCompleted={true}
			>
				{#snippet summarySnippet()}<div class="compact-result">
						<MathText text={`$${part.intervalLatex}$`} /><MathBlock
							math={`y(t)=${problem.intervals[index]?.exprLatex ?? "0"}`}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
					</div>{/snippet}
			</SubStepBlock>
		{/each}
		{#if activePart && activeState}
			<SubStepBlock
				badge={`Part 6${String.fromCharCode(65 + Math.max(0, activeIndex))}`}
				title={activePart.title}
			>
				<p class="step-prompt">
					<MathText
						text={`For $${activePart.intervalLatex}$, evaluate and simplify the verified definite integral.`}
					/>
				</p>
				<MathBlock
					math={verifiedSetup}
					compact={true}
					responsive={true}
				/>
				<div class="primitive-card">
					<p>
						Use this supplied antiderivative; this tutor is testing
						convolution reasoning, not antiderivative recall.
					</p>
					{#if activeTerm}
						<p>
							Term {activeState.activeTermIndex + 1} of {evaluationTerms.length}
						</p>
						<div class="formula-ledger">
							<div>
								<span>Active fixed piece</span>
								<MathBlock
									math={activeTerm.fixedPieceLatex}
									compact={true}
									hideHeader={true}
									responsive={true}
								/>
							</div>
							<div>
								<span>Active transformed moving piece</span>
								<MathBlock
									math={activeTerm.movingPieceLatex}
									compact={true}
									hideHeader={true}
									responsive={true}
								/>
							</div>
							<div>
								<span>Concrete expanded integrand</span>
								<MathBlock
									math={activeTerm.integrandLatex}
									compact={true}
									hideHeader={true}
									responsive={true}
								/>
							</div>
							<div>
								<span>Supplied primitive</span>
								<MathBlock
									math={activeTerm.primitiveLatex}
									compact={true}
									hideHeader={true}
									responsive={true}
								/>
							</div>
						</div>
					{:else}
						<MathBlock
							math={suppliedPrimitive}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
					{/if}
				</div>
				<form
					class="evaluation-form"
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep6();
					}}
				>
					{#if activeTerm && activeTermInput && activeState.stage !== "combined"}
						{#if activeState.stage === "geometry-amplitude"}
							<p class="geometry-note">
								<MathText
									text={String.raw`Both active pieces are constant (flat rectangles), so the integral reduces to finding the area of a rectangle: $(\text{amplitude product}) \times (\text{overlap width})$.`}
								/>
							</p>
						{/if}
						<label class="expression-entry">
							<span>
								<MathText
									text={activeState.stage ===
									"geometry-amplitude"
										? String.raw`Enter the signed amplitude product:`
										: activeState.stage === "geometry-width"
											? String.raw`Enter the overlap width $U(t)-L(t)$:`
											: activeState.stage === "upper"
												? `Evaluate $F(\\tau,t)$ at the upper limit $${activeTerm.upperLatex}$:`
												: activeState.stage === "lower"
													? `Evaluate $F(\\tau,t)$ at the lower limit $${activeTerm.lowerLatex}$:`
													: String.raw`Enter $F(U(t),t)-F(L(t),t)$ with the subtraction sign preserved:`}
								/>
							</span>
							{#if activeState.stage === "geometry-amplitude"}
								<input
									type="text"
									bind:value={
										activeTermInput.amplitudeProduct
									}
								/>
							{:else if activeState.stage === "geometry-width"}
								<input
									type="text"
									bind:value={activeTermInput.overlapWidth}
								/>
							{:else if activeState.stage === "upper"}
								<input
									type="text"
									bind:value={activeTermInput.upper}
								/>
							{:else if activeState.stage === "lower"}
								<input
									type="text"
									bind:value={activeTermInput.lower}
								/>
							{:else}
								<input
									type="text"
									bind:value={activeTermInput.difference}
								/>
							{/if}
						</label>
					{:else}
						{#if evaluationTerms.length > 0}
							<div class="terms-recap">
								{#each evaluationTerms as term, termIdx}
									{@const termInput =
										activeState.termInputs[termIdx]}
									<div class="term-recap-item">
										<span class="term-recap-label">
											Term {termIdx + 1} contribution:
										</span>
										<MathBlock
											math={term.geometry
												? String.raw`(${termInput?.amplitudeProduct || term.geometry.amplitudeProductLatex}) \cdot (${termInput?.overlapWidth || term.geometry.overlapWidthLatex}) = ${term.differenceLatex}`
												: term.differenceLatex}
											compact={true}
											hideHeader={true}
											responsive={true}
										/>
									</div>
								{/each}
								{#if evaluationTerms.length > 1}
									<p class="recap-prompt">
										Enter the simplified sum of all term
										contributions.
									</p>
								{/if}
							</div>
						{/if}
						<label class="expression-entry">
							<span>
								<MathText
									text={String.raw`Enter the simplified expression for $y(t)$:`}
								/>
							</span>
							<input
								type="text"
								bind:value={activeState.input}
								placeholder="e.g. t-1 or (t+3)^2/4"
							/>
						</label>
						<div
							class="preview"
							aria-live="polite"
						>
							<span>Live preview</span>
							<MathBlock
								math={activeState.input.trim()
									? `y(t)=${activeState.input}`
									: String.raw`y(t)\;=\;?`}
								compact={true}
								hideHeader={true}
								responsive={true}
							/>
						</div>
					{/if}
					<button
						type="submit"
						class="check-button"
					>
						{activeState.stage === "combined"
							? "Check combined expression"
							: "Check this evaluation step"}
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
	/* ── Step and completed summary layout ─────────────────── */
	.step-body,
	.summary-table,
	.evaluation-form {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		min-width: 0;
	}
	.step-prompt {
		margin: 0;
		color: var(--text-primary);
	}
	.geometry-note {
		margin: 0;
		padding: 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		border-left: 3px solid var(--accent-primary);
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.terms-recap {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		border-left: 3px solid var(--accent-primary);
	}
	.term-recap-item {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: var(--text-sm);
	}
	.term-recap-label {
		color: var(--text-secondary);
		font-weight: 600;
	}
	.recap-prompt {
		margin: 0.25rem 0 0;
		color: var(--text-primary);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.expression-entry {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.primitive-card {
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
	}
	.primitive-card p,
	.carried-note {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.formula-ledger {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 0.65rem;
	}
	.formula-ledger > div {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.expression-entry input {
		width: 100%;
		min-width: 0;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font-family: var(--font-mono);
	}
	.preview {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.65rem;
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.summary-row,
	.compact-result {
		display: grid;
		grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
		align-items: center;
		gap: 0.75rem;
	}
	.summary-row {
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
	.expression-entry input:focus-visible,
	.check-button:focus-visible {
		position: relative;
		z-index: 1;
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤560px) ──────────────────────── */
	@media (max-width: 560px) {
		.summary-row,
		.compact-result,
		.formula-ledger {
			grid-template-columns: 1fr;
		}
		.check-button {
			width: 100%;
		}
	}
</style>
