<script lang="ts">
	/** Interval-aligned typed builder for the final convolution response. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepCard from "$lib/components/ui/StepCard.svelte";
	import type { ConvolutionProblem } from "$lib/math-engine/convolution/index";

	interface Props {
		/** Active exact convolution problem. */
		problem: ConvolutionProblem;
		/** Reactive solver controller. */
		solver: ConvolutionStepSolverState;
	}

	let { problem, solver }: Props = $props();
	const status = $derived(
		solver.currentStep === 7
			? "active"
			: solver.currentStep > 7
				? "completed"
				: "locked",
	);
</script>

{#snippet completedSummary()}
	<MathBlock
		math={problem.itsData.step7.resultLatex}
		compact={true}
		hideHeader={true}
		responsive={true}
	/>
{/snippet}

<StepCard
	stepNumber={7}
	title="Assemble the Piecewise Response"
	{status}
	summarySnippet={completedSummary}
>
	<div class="step-body">
		<p>
			<MathText
				text={String.raw`Copy each verified Step 6 expression for $y(t)$ into its matching interval row below. Exterior no-overlap rows are pre-filled and locked.`}
			/>
		</p>
		<details class="verified-reference">
			<summary>Show verified Step 6 expressions</summary>
			<div
				class="reference-table"
				aria-label="Verified Step 6 results"
			>
				{#each problem.intervals as interval}
					<div><MathText text={`$${interval.labelLatex}$`} /></div>
					<div>
						<MathBlock
							math={`y(t)=${interval.exprLatex}`}
							compact={true}
							hideHeader={true}
							responsive={true}
						/>
					</div>
				{/each}
			</div>
		</details>
		<div class="piecewise-builder">
			{#each problem.intervals as interval, index}
				{@const row = solver.step7.rows[index]}
				{#if row}
					<form
						class:verified={row.isValid}
						onsubmit={(event) => {
							event.preventDefault();
							solver.checkStep7Row(index);
						}}
					>
						<h4
							tabindex="-1"
							data-progress-heading
						>
							<MathText text={`$${interval.labelLatex}$`} />
						</h4>
						<label>
							<MathText text={String.raw`$y(t)=$`} />
							<input
								type="text"
								bind:value={row.input}
								readonly={row.isLocked || row.isValid}
								aria-readonly={row.isLocked || row.isValid}
								aria-label={`Expression for ${interval.labelLatex}`}
							/>
						</label>
						<button
							type="submit"
							disabled={row.isLocked || row.isValid}
						>
							{row.isValid ? "Verified" : "Check row"}
						</button>
						{#if row.feedback}<p class="row-feedback">
								{row.feedback}
							</p>{/if}
					</form>
				{/if}
			{/each}
		</div>
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			onRevealNextHint={() => solver.revealNextHint()}
		/>
	</div>
</StepCard>

<style>
	/* ── Piecewise assembly layout ─────────────────────────── */
	.step-body,
	.piecewise-builder {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.step-body > p {
		margin: 0;
		color: var(--text-secondary);
	}
	.reference-table {
		display: grid;
		grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr);
		gap: 0.4rem 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.verified-reference {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.verified-reference summary {
		padding: 0.7rem;
		font-weight: 700;
		color: var(--accent-primary);
		cursor: pointer;
	}
	.verified-reference .reference-table {
		border: 0;
		border-top: 1px solid var(--border-color);
		border-radius: 0;
	}
	.piecewise-builder form {
		display: grid;
		grid-template-columns: minmax(9rem, auto) minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.65rem;
		padding: 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
	}
	.piecewise-builder form.verified {
		border-color: var(--color-success);
		background: var(--color-success-bg);
	}
	.piecewise-builder h4 {
		margin: 0;
		font-size: var(--text-base);
	}
	.piecewise-builder label {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	.piecewise-builder input {
		min-width: 0;
		padding: 0.55rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		background: var(--bg-input);
		color: var(--text-primary);
		font-family: var(--font-mono);
	}
	.piecewise-builder button {
		padding: 0.55rem 0.75rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--accent-primary);
		color: var(--black-100);
		font-weight: 700;
		cursor: pointer;
	}
	.piecewise-builder button:disabled {
		cursor: default;
		opacity: 0.75;
	}
	.piecewise-builder input:focus-visible,
	.piecewise-builder button:focus-visible,
	.verified-reference summary:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}
	.row-feedback {
		grid-column: 2 / -1;
		margin: 0;
		color: var(--color-error);
		font-size: var(--text-sm);
	}
	@media (max-width: 640px) {
		.reference-table,
		.piecewise-builder form {
			grid-template-columns: 1fr;
		}
		.row-feedback {
			grid-column: auto;
		}
	}
</style>
