<script lang="ts">
	/** Interval-aligned typed builder for the final convolution response. */

	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { ConvolutionStepSolverState } from "$lib/components/solvers/convolution-step-solver.svelte";
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
			Copy each verified Step 6 expression into its matching Step 4
			interval. Exterior no-overlap rows are already locked.
		</p>
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
		<div class="piecewise-builder">
			{#each problem.intervals as interval, index}
				{@const row = solver.step7.rows[index]}
				<form
					class:verified={row?.isValid}
					onsubmit={(event) => {
						event.preventDefault();
						solver.checkStep7Row(index);
					}}
				>
					<MathText
						text={String.raw`$${interval.labelLatex}:\quad y(t)=$`}
					/>
					<input
						type="text"
						bind:value={row.input}
						disabled={row.isLocked || row.isValid}
						aria-label={`Expression for ${interval.labelLatex}`}
					/>
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
			{/each}
		</div>
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
	.piecewise-builder button:focus-visible {
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
