<script lang="ts">
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import type { LaplaceStepSolverState } from "../laplace-solver-state/controller.svelte";

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
			<fieldset>
				<legend>Your answer</legend>
				{#each solver.task.choices ?? [] as choice}
					<label class="choice"
						><input
							type="radio"
							name={solver.task.id}
							value={choice}
							bind:group={solver.input}
							onchange={() => solver.clearFeedback()}
						/><MathText text={choice} /></label
					>
				{/each}
			</fieldset>
		{:else}
			<label for="laplace-input"
				>{solver.task.kind === "scalar"
					? "Exact value (integer, decimal, fraction, or LaTeX)"
					: `Expression in ${solver.task.kind} (LaTeX)`}</label
			>
			<input
				id="laplace-input"
				type="text"
				autocomplete="off"
				spellcheck="false"
				bind:value={solver.input}
				oninput={() => solver.clearFeedback()}
				onkeydown={(event) => {
					if (event.key === "Enter") solver.check();
				}}
			/>
			{#if solver.input.trim()}<div class="preview">
					<span>Input preview</span><MathBlock
						math={solver.input}
						compact
					/>
				</div>{/if}
		{/if}
		<div class="actions">
			<button
				type="button"
				class="btn btn-primary"
				onclick={() => solver.check()}>Check Answer</button
			><button
				type="button"
				class="btn btn-secondary"
				onclick={() => {
					solver.revealNextHint();
					onAssist?.();
				}}
				disabled={solver.hintTier >= solver.activeHints.length}
				>Show Hint</button
			>
		</div>
		{#if solver.result}<p
				class="feedback-box"
				role="status"
				data-validation={solver.result.status}
			>
				<MathText text={solver.result.message} />
			</p>{/if}
		{#each solver.activeHints.slice(0, solver.hintTier) as hint, index}<p
				class="hint"
			>
				<strong>Hint {index + 1}:</strong>
				<MathText text={hint} />
			</p>{/each}
	</div>
{/if}

<style>
	fieldset {
		min-width: 0;
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.6rem;
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
	}
	input[type="text"] {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: var(--bg-input);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1rem;
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
	.btn-secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}
	:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
	.hint,
	.feedback-box,
	.preview {
		padding: 0.75rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		overflow-wrap: anywhere;
		min-width: 0;
	}
</style>
