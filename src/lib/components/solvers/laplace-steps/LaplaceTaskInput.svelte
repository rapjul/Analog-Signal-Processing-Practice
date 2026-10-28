<script lang="ts">
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import { ZERO_POLYNOMIAL } from "$lib/math-engine/laplace/input-entry";
	import LaplaceConstructionInput from "./LaplaceConstructionInput.svelte";
	import LaplaceTypedInput from "./LaplaceTypedInput.svelte";

	/** Input task and validation controls. */
	interface Props {
		/** Reactive controller. */ solver: LaplaceStepSolverState;
		/** Records hint assistance without granting validation. */ onAssist?:
			(() => void) | undefined;
	}
	let { solver, onAssist }: Props = $props();
</script>

{#if solver.task}
	<div data-task-id={solver.task.id}>
		<p><MathText text={solver.task.prompt} /></p>
		{#if solver.task.formula}<MathBlock
				math={solver.task.formula}
				compact
			/>{/if}
		{#if solver.task.kind === "choice"}
			<fieldset
				disabled={solver.awaitingContinue}
				aria-describedby={solver.result && !solver.awaitingContinue
					? "laplace-feedback"
					: undefined}
			>
				<legend>Choose an answer</legend>
				{#each solver.task.choices ?? [] as choice}
					<button
						type="button"
						class="choice"
						class:selected={solver.input === choice}
						aria-pressed={solver.input === choice}
						data-choice={choice}
						onclick={() => {
							solver.input = choice;
							solver.clearFeedback();
							solver.check();
						}}
						><span
							class="choice-marker"
							aria-hidden="true">•</span
						><span class="choice-content"
							><MathText
								text={solver.task.choicePresentation?.[choice]
									?.label ?? choice}
							/>
							{#if solver.task.choicePresentation?.[choice]?.math}<span
									class="choice-math"
									><MathText
										text={`$${solver.task.choicePresentation[choice]!.math}$`}
									/></span
								>{/if}
							{#if solver.task.choicePresentation?.[choice]?.description}<span
									class="choice-description"
									>{solver.task.choicePresentation[choice]!
										.description}</span
								>{/if}
						</span></button
					>
				{/each}
			</fieldset>
		{:else if "construction" in solver.task}
			<LaplaceConstructionInput {solver} />
		{:else if solver.task.kind === "fields"}
			<MathBlock
				math={solver.preview}
				compact
			/>
			<fieldset
				class="coefficient-fields"
				disabled={solver.awaitingContinue}
			>
				<legend
					>{solver.task.fields.some(
						(field) => field.entry?.kind === "boolean",
					)
						? "Select active terms and enter their combined expression"
						: "Enter each requested value"}</legend
				>
				{#each solver.task.fields as field}
					{#if field.entry?.kind === "boolean"}
						<label class="activity-row">
							<input
								type="checkbox"
								id={`laplace-field-${field.id}`}
								data-field-id={field.id}
								checked={solver.fieldInputs[field.id] === "1"}
								aria-describedby={solver.fieldResults[field.id]
									? `laplace-feedback-${field.id}`
									: undefined}
								aria-invalid={solver.fieldResults[field.id]
									? solver.fieldResults[field.id]!.status !==
										"correct"
									: undefined}
								onchange={(event) => {
									solver.fieldInputs[field.id] = event
										.currentTarget.checked
										? "1"
										: "0";
									solver.clearFeedback();
								}}
							/>
							<MathText text={field.label} />
						</label>
					{:else}
						<label
							for={solver.fieldInputs[field.id] ===
							ZERO_POLYNOMIAL
								? `laplace-degree-${field.id}`
								: `laplace-field-${field.id}`}
							><MathText text={field.label} /></label
						>
						{#if field.entry?.kind === "degree" && field.entry.zero}
							<select
								id={`laplace-degree-${field.id}`}
								aria-label={`${field.label} polynomial case`}
								data-degree-id={field.id}
								value={solver.fieldInputs[field.id] ===
								ZERO_POLYNOMIAL
									? "zero"
									: "nonzero"}
								aria-describedby={solver.fieldResults[field.id]
									? `laplace-feedback-${field.id}`
									: undefined}
								onchange={(event) => {
									solver.fieldInputs[field.id] =
										event.currentTarget.value === "zero"
											? ZERO_POLYNOMIAL
											: "";
									solver.clearFeedback();
								}}
							>
								<option value="nonzero"
									>Nonzero polynomial—enter its degree</option
								>
								<option value="zero"
									>Zero polynomial—degree undefined</option
								>
							</select>
						{/if}
						{#if solver.fieldInputs[field.id] !== ZERO_POLYNOMIAL}
							<LaplaceTypedInput
								id={`laplace-field-${field.id}`}
								data-field-id={field.id}
								entry={field.entry ?? { kind: "exact" }}
								autocomplete="off"
								spellcheck="false"
								bind:value={solver.fieldInputs[field.id]}
								onedit={() => solver.clearFeedback()}
								onkeydown={(event) => {
									if (event.key === "Enter") solver.check();
								}}
								aria-describedby={solver.fieldResults[field.id]
									? `laplace-feedback-${field.id}`
									: undefined}
								aria-invalid={solver.fieldResults[field.id]
									? solver.fieldResults[field.id]!.status !==
										"correct"
									: undefined}
							/>
						{/if}
					{/if}
					{#if solver.fieldResults[field.id]}<p
							id={`laplace-feedback-${field.id}`}
							data-field-feedback={field.id}
							data-validation={solver.fieldResults[field.id]!
								.status}
							role="status"
						>
							<MathText
								text={solver.fieldResults[field.id]!.message}
							/>
						</p>{/if}
				{/each}
			</fieldset>
		{:else}
			<label for="laplace-input"
				>{solver.task.kind === "scalar"
					? "Exact value (integer, decimal, fraction, or LaTeX)"
					: "Enter an expression (standard math or LaTeX)"}</label
			>
			{#if solver.task.kind === "s" || solver.task.kind === "t"}<p>
					<MathText
						text={`Use $${solver.task.kind}$ as the variable. Enter the right-hand expression beside the fixed label.`}
					/>
				</p>{/if}
			<div class="equation-entry">
				{#if solver.task.lhs}<span class="equation-label"
						><MathText text={`$${solver.task.lhs}=$`} /></span
					>{/if}
				<LaplaceTypedInput
					id="laplace-input"
					entry={solver.task.kind === "scalar"
						? (solver.task.entry ?? { kind: "exact" })
						: { kind: "expression" }}
					autocomplete="off"
					spellcheck="false"
					disabled={solver.awaitingContinue}
					aria-invalid={solver.result
						? solver.result.status !== "correct"
						: undefined}
					aria-describedby={solver.result && !solver.awaitingContinue
						? "laplace-feedback"
						: undefined}
					bind:value={solver.input}
					onedit={() => solver.clearFeedback()}
					onkeydown={(event) => {
						if (event.key === "Enter") solver.check();
					}}
				/>
			</div>
			{#if solver.input.trim() || solver.task.lhs}<div class="preview">
					<span>Input preview</span><MathBlock
						math={solver.preview}
						compact
					/>
				</div>{/if}
		{/if}
		{#if solver.task.kind !== "choice" && !solver.awaitingContinue}<div
				class="actions"
			>
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => solver.check()}
					>{solver.task.action ??
						`Check ${solver.task.title}`}</button
				>
			</div>{/if}
		<div
			id="laplace-feedback"
			class:visible-feedback={!!solver.result && !solver.awaitingContinue}
			data-validation={solver.result?.status}
		>
			<StepFeedback {solver} />
		</div>
		{#if solver.awaitingContinue}<div
				class="success"
				role="status"
				data-validation="correct"
			>
				<h4
					tabindex="-1"
					data-success-heading
				>
					Correct — here is why
				</h4>
				<p>
					<MathText
						text={solver.task.explanation ?? solver.result!.message}
					/>
				</p>
				<div class="actions">
					<button
						type="button"
						class="btn btn-primary"
						onclick={() => solver.continue()}>Continue</button
					>
				</div>
			</div>{/if}
		<HintDisclosure
			hints={solver.activeHints}
			hintTier={solver.hintTier}
			disabled={solver.awaitingContinue}
			onRevealNextHint={() => {
				solver.revealNextHint();
				onAssist?.();
			}}
		/>
	</div>
{/if}

<style>
	/* ── Equation frames and independent coefficient fields ───────────────── */
	.equation-entry {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-width: 0;
	}
	.equation-entry :global(input) {
		flex: 1 1 12rem;
	}
	.equation-label {
		flex: 0 0 auto;
		max-width: 100%;
		overflow-x: auto;
	}
	.coefficient-fields input {
		min-width: 0;
	}
	.activity-row {
		display: flex;
		align-items: start;
		gap: 0.75rem;
		min-height: 2.75rem;
		cursor: pointer;
	}
	.activity-row input {
		width: 1.1rem;
		height: 1.1rem;
		flex: 0 0 auto;
		accent-color: var(--accent-primary);
	}
	fieldset {
		min-width: 0;
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.6rem;
	}
	select {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		padding: 0.6rem;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font: inherit;
	}
	legend,
	label {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	.choice {
		display: flex;
		align-items: start;
		gap: 0.7rem;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		overflow-wrap: anywhere;
		min-width: 0;
		text-align: left;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font: inherit;
		font-weight: 500;
		width: 100%;
	}
	.choice.selected {
		border-color: var(--accent-primary);
		background: var(--accent-subtle, rgba(6, 182, 212, 0.12));
	}
	.choice-content {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}
	.choice-marker {
		flex: 0 0 auto;
		color: var(--accent-primary);
	}
	.choice-description {
		font-size: 0.9em;
		color: var(--text-secondary);
		font-weight: 400;
	}
	.choice-math {
		overflow-x: auto;
		max-width: 100%;
	}
	.visible-feedback {
		margin-top: 1rem;
	}
	.choice:hover:not(:disabled) {
		border-color: var(--accent-primary);
	}
	.success {
		margin-block: 1rem;
		border: 1px solid var(--color-success, #22c55e);
		border-radius: var(--radius-sm);
		padding: 0.85rem;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1rem;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}
	button {
		padding: 0.6rem 1rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
		cursor: pointer;
	}
	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast, #042f2e);
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
	.preview {
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		overflow-wrap: anywhere;
		min-width: 0;
	}
	/* ── Mobile media query (≤480px) ──────────────────────────────────────── */
	@media (max-width: 480px) {
		.actions button {
			max-width: 100%;
			white-space: normal;
		}
	}
</style>
