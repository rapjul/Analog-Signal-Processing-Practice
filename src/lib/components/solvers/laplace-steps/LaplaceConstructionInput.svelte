<script lang="ts">
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
	import { emptyRow } from "$lib/math-engine/laplace/construction";
	import LaplaceTypedInput from "./LaplaceTypedInput.svelte";

	/** Structured entry properties. */
	interface Props {
		/** Active controller with learner-owned drafts. */ solver: LaplaceStepSolverState;
	}
	let { solver }: Props = $props();
	/** @param key - Field identity. @returns Its feedback element when an issue exists. */
	function feedbackId(key: string): string | undefined {
		return solver.constructionResults[key]
			? `construction-${key}`
			: undefined;
	}
</script>

{#if solver.task && "construction" in solver.task}
	<fieldset
		class="construction"
		aria-describedby={solver.result && !solver.awaitingContinue
			? "laplace-feedback"
			: undefined}
		disabled={solver.awaitingContinue}
	>
		<legend
			>{solver.task.kind === "roots"
				? "Build the root set"
				: solver.task.kind === "template"
					? "Build the decomposition"
					: "Build the factorization"}</legend
		>
		{#if solver.task.kind !== "template"}
			<label
				>Expression type<select
					aria-label="Expression type"
					aria-invalid={!!solver.constructionResults.mode ||
						undefined}
					aria-describedby={feedbackId("mode")}
					bind:value={solver.construction.mode}
					onchange={() => solver.clearFeedback()}
				>
					<option value="finite"
						>{solver.task.kind === "roots"
							? "Finite Root Set"
							: "Nonzero Polynomial"}</option
					>
					{#if solver.task.kind === "roots"}<option value="none"
							>No Finite Roots</option
						>{/if}
					<option value="zero">Identically Zero</option>
				</select></label
			>
		{/if}
		{#if solver.constructionResults.mode}<p
				id="construction-mode"
				role="status"
			>
				<MathText text={solver.constructionResults.mode.message} />
			</p>{/if}
		{#if solver.construction.mode === "finite"}
			{#if solver.task.kind !== "roots"}<label
					>{solver.task.kind === "template"
						? "Constant quotient"
						: "Outside gain"}<LaplaceTypedInput
						aria-label={solver.task.kind === "template"
							? "Constant quotient"
							: "Outside gain"}
						entry={{
							kind:
								solver.task.kind === "template"
									? "exact"
									: "literal",
						}}
						aria-invalid={!!solver.constructionResults.gain ||
							undefined}
						aria-describedby={feedbackId("gain")}
						bind:value={solver.construction.gain}
						onedit={() => solver.clearFeedback()}
						autocomplete="off"
					/></label
				>{/if}
			{#if solver.constructionResults.gain}<p
					id="construction-gain"
					role="status"
				>
					<MathText text={solver.constructionResults.gain.message} />
				</p>{/if}
			{#each solver.construction.rows as row, index}
				<div
					class="entry-row"
					data-construction-row={index}
				>
					<label
						>{solver.task.kind === "roots"
							? "Root type"
							: "Factor type"}<select
							aria-label={`Row ${index + 1} type`}
							bind:value={row.kind}
							onchange={() => solver.clearFeedback()}
						>
							<option value="linear"
								>{solver.task.kind === "roots"
									? "Real Root"
									: "Linear"}</option
							>
							<option value="quadratic"
								>{solver.task.kind === "roots"
									? "Conjugate Pair"
									: "Quadratic"}</option
							>
						</select></label
					>
					<p class="row-template">
						<MathText
							text={solver.task.kind === "roots"
								? row.kind === "linear"
									? "Root: $a$"
									: "Roots: $a\\pm j b$, with $b>0$"
								: row.kind === "linear"
									? "Factor: $(s+b)^m$"
									: "Factor: $(s^2+bs+c)^m$"}
						/>
					</p>
					<label
						><MathText
							text={solver.task.kind === "roots"
								? "Real part $a$"
								: "Signed coefficient $b$"}
						/><LaplaceTypedInput
							aria-label={`Row ${index + 1} ${solver.task.kind === "roots" ? "real part" : "coefficient b"}`}
							entry={{ kind: "literal" }}
							bind:value={row.first}
							onedit={() => solver.clearFeedback()}
							aria-invalid={!!solver.constructionResults[
								`row-${index}-first`
							] || undefined}
							aria-describedby={feedbackId(`row-${index}-first`)}
							autocomplete="off"
						/></label
					>
					{#if row.kind === "quadratic"}<label
							><MathText
								text={solver.task.kind === "roots"
									? "Positive frequency $b$"
									: "Signed constant $c$"}
							/><LaplaceTypedInput
								aria-label={`Row ${index + 1} ${solver.task.kind === "roots" ? "frequency" : "coefficient c"}`}
								entry={{ kind: "literal" }}
								bind:value={row.second}
								onedit={() => solver.clearFeedback()}
								aria-invalid={!!solver.constructionResults[
									`row-${index}-second`
								] || undefined}
								aria-describedby={feedbackId(
									`row-${index}-second`,
								)}
								autocomplete="off"
							/></label
						>{/if}
					<label
						>{solver.task.kind === "roots"
							? "Multiplicity"
							: "Power"}<LaplaceTypedInput
							aria-label={`Row ${index + 1} ${solver.task.kind === "roots" ? "multiplicity" : "power"}`}
							entry={{ kind: "integer", min: 1, max: 4 }}
							bind:value={row.power}
							onedit={() => solver.clearFeedback()}
							aria-invalid={!!solver.constructionResults[
								`row-${index}-power`
							] || undefined}
							aria-describedby={feedbackId(`row-${index}-power`)}
							autocomplete="off"
						/></label
					>
					{#if solver.task.kind === "template"}<label
							>Unknown numerator<select
								aria-label={`Row ${index + 1} numerator`}
								bind:value={row.numerator}
								onchange={() => solver.clearFeedback()}
								aria-invalid={!!solver.constructionResults[
									`row-${index}-numerator`
								] || undefined}
								aria-describedby={feedbackId(
									`row-${index}-numerator`,
								)}
								><option value="constant">Constant</option
								><option value="linear">Linear</option></select
							></label
						>{/if}
					<button
						type="button"
						class="remove"
						aria-label={`Remove row ${index + 1}`}
						onclick={() => {
							solver.construction.rows.splice(index, 1);
							solver.clearFeedback();
						}}>Remove Row</button
					>
					{#each ["first", "second", "power", "numerator"] as field}
						{@const key = `row-${index}-${field}`}
						{#if solver.constructionResults[key]}<p
								id={`construction-${key}`}
								role="status"
							>
								<MathText
									text={solver.constructionResults[key]!
										.message}
								/>
							</p>{/if}
					{/each}
				</div>
			{/each}
			<button
				type="button"
				class="add"
				disabled={solver.construction.rows.length >= 8}
				onclick={() => {
					solver.construction.rows.push(emptyRow());
					solver.clearFeedback();
				}}
				>Add {solver.task.kind === "roots"
					? "Root"
					: solver.task.kind === "template"
						? "Term"
						: "Factor"}</button
			>
		{/if}
		{#if solver.constructionResults.rows}<p
				id="construction-rows"
				role="status"
			>
				<MathText text={solver.constructionResults.rows.message} />
			</p>{/if}
	</fieldset>
	<div
		class="preview"
		aria-label="Constructed expression preview"
	>
		<MathBlock
			math={solver.preview}
			compact
			hideHeader
		/>
	</div>
{/if}

<style>
	/* ── Structured mathematical entry ────────────────────────────────────── */
	.construction {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		font-weight: 700;
		margin-bottom: 0.6rem;
	}
	.entry-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
		gap: 0.75rem;
		padding: 0.8rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		min-width: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}
	select {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.6rem;
		font: inherit;
	}
	.row-template {
		grid-column: 1 / -1;
		margin: 0;
	}
	button {
		padding: 0.6rem 0.8rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font: inherit;
	}
	.add {
		align-self: flex-start;
	}
	.preview {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
	/* ── Mobile media query (≤480px) ──────────────────────────────────────── */
	@media (max-width: 480px) {
		.entry-row {
			grid-template-columns: minmax(0, 1fr);
		}
		.add {
			width: 100%;
		}
	}
</style>
