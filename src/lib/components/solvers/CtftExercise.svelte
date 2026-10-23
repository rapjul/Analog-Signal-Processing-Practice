<script lang="ts">
	import { tick } from "svelte";
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
	import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";
	import StepFeedback from "$lib/components/ui/StepFeedback.svelte";
	import type {
		CtftLessonPart,
		CtftStageId,
	} from "$lib/math-engine/ctft-lesson";
	import { displayCtftInput } from "$lib/math-engine/ctft-presentation";
	import type { TransformDiagnostic } from "$lib/math-engine/transform-diagnostics";
	import { transformSyntaxDiagnostics } from "$lib/math-engine/transform-diagnostics";
	import type {
		CtftPartState,
		CtftStepSolverState,
	} from "./ctft-step-solver.svelte";

	/** One active task; all verification remains in the controller. */
	interface Props {
		/** Owner of this lesson attempt. */ solver: CtftStepSolverState;
		/** Active stage captured for stale-submission guards. */ stageId: CtftStageId;
		/** Active lesson-owned task. */ task: CtftLessonPart;
		/** Editable response owned by the controller. */ response: CtftPartState;
	}
	let { solver, stageId, task, response }: Props = $props();
	let input: HTMLInputElement | undefined = $state();
	const inputId = $derived(
		stageId === "final" && task.kind === "spectrum"
			? "ctft-input"
			: "ctft-active-answer",
	);
	const compact = $derived(task.inputSize === "scalar");
	const preview = $derived(
		!compact &&
			response.input.trim() &&
			!/^[-+]?\d+(?:\.\d+)?$/.test(response.input.trim()),
	);
	const previewComplete = $derived(
		transformSyntaxDiagnostics(response.input).length === 0,
	);
	/** @param event - Native text edit. Routes mutation through the guarded state owner. */
	function edit(event: Event): void {
		solver.editAnswer(
			stageId,
			task.id,
			(event.currentTarget as HTMLInputElement).value,
		);
	}
	/** @param issue - Original-source range. Focuses and selects the affected input. */
	function selectIssue(issue: TransformDiagnostic): void {
		input?.focus();
		input?.setSelectionRange(issue.start, issue.end);
	}
	/** @param event - Native form event. Checks the current task and selects its first error. */
	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const submittedResponse = response;
		solver.check(stageId, task.id);
		const issue = submittedResponse.result?.diagnostics?.[0];
		if (!issue) return;
		await tick();
		selectIssue(issue);
	}
	/** @param id - Owned choice identifier. Checks activation, never mere focus. */
	function choose(id: string): void {
		solver.editAnswer(stageId, task.id, id);
		solver.check(stageId, task.id);
	}
</script>

<p class="objective">
	<MathText text={task.objective ?? "Complete the current exercise."} />
</p>
{#if task.contextLatex}<MathBlock
		math={task.contextLatex}
		compact
		hideHeader
	/>{/if}
<p
	class="answer-form"
	id="ctft-answer-form"
>
	<MathText text={task.answerForm ?? ""} />
</p>
<form onsubmit={submit}>
	{#if task.kind === "choice"}
		<div
			class="choices"
			role="group"
			aria-label={task.label}
		>
			{#each task.choices ?? [] as choice}
				<button
					type="button"
					value={choice.id}
					class="choice"
					class:selected={response.input === choice.id}
					aria-label={choice.accessibleLabel ?? choice.label}
					aria-pressed={response.input === choice.id}
					onclick={/** Activates this lesson-owned option. */ () =>
						choose(choice.id)}
				>
					{#if task.mathChoices}<span aria-hidden="true"
							><MathText text={`$${choice.label}$`} /></span
						>{:else}{choice.label}{/if}
				</button>
			{/each}
		</div>
	{:else}
		<div
			class="answer-row"
			class:compact
		>
			<label
				for={inputId}
				class:sr-only={!compact}
				><MathText
					text={compact ? (task.inputLabel ?? "Value") : task.label}
				/></label
			>
			<input
				bind:this={input}
				id={inputId}
				class="math-text-input"
				aria-label={task.label}
				type="text"
				autocomplete="off"
				spellcheck="false"
				maxlength="16384"
				value={response.input}
				oninput={edit}
				aria-invalid={response.result !== null &&
					response.result.status !== "correct"}
				aria-describedby={`ctft-notation ctft-answer-form${response.result?.diagnostics?.length ? " ctft-input-errors" : ""}`}
			/>
		</div>
		{#if preview && !previewComplete && !response.result?.diagnostics?.length}<p
				class="answer-form"
			>
				Complete the brackets and exponent to see the expression
				preview.
			</p>{/if}
		{#if preview && previewComplete && !response.result?.diagnostics?.length}<div
				class="answer-preview"
			>
				<span>Expression preview</span><MathBlock
					math={displayCtftInput(response.input)}
					compact
					hideHeader
				/>
			</div>{/if}
		<button
			class="check-button"
			type="submit"
			disabled={!response.input.trim()}>Check Answer</button
		>
	{/if}
</form>
{#if response.result?.diagnostics?.length}
	<div
		id="ctft-input-errors"
		class="input-errors"
		role="region"
		aria-label="Issues in your expression"
	>
		<p>Select an issue to jump to its location in your input.</p>
		<ul>
			{#each response.result.diagnostics as issue}
				<li>
					<button
						type="button"
						onclick={/** Selects this original input range. */ () =>
							selectIssue(issue)}
						>{issue.message}
						<span class="source-excerpt"
							><code
								>{response.input.slice(
									Math.max(0, issue.start - 16),
									issue.start,
								)}<mark
									>{response.input.slice(
										issue.start,
										issue.end,
									) || "▏"}</mark
								>{response.input.slice(
									issue.end,
									issue.end + 16,
								)}</code
							></span
						></button
					>
				</li>
			{/each}
		</ul>
	</div>
{/if}
<div
	class="feedback-box"
	data-validation={response.result?.status}
>
	<StepFeedback {solver} />
</div>
<HintDisclosure
	hints={solver.activeHints}
	hintTier={solver.hintTier}
	onRevealNextHint={/** Reveals only the current exercise's next hint. */ () =>
		solver.revealNextHint()}
/>

<style>
	/* ── Labels and exercise layout ─────────────────────────────────────── */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	form,
	.choices {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	p {
		margin: 0 0 0.75rem;
	}
	.answer-form,
	.answer-preview > span {
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}
	.answer-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}
	input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}
	.compact input {
		max-width: 10rem;
	}
	.choice {
		width: 100%;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0.85rem;
		text-align: left;
		cursor: pointer;
		font: inherit;
		min-width: 0;
		overflow-x: auto;
	}
	/* ── Choice and verification action states ──────────────────────────── */
	:is(button, input):focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 3px;
	}
	.choice:hover,
	.choice.selected {
		border-color: var(--accent-primary);
		background: var(--accent-glow);
	}
	.check-button {
		align-self: flex-end;
		display: inline-flex;
		justify-content: center;
		padding: 0.55rem 1.1rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: var(--accent-primary);
		color: var(--text-on-accent, #000);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
	}
	.check-button:hover:enabled {
		filter: brightness(1.1);
	}
	.check-button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.answer-preview {
		margin-block: 0.5rem;
		min-width: 0;
	}
	.input-errors {
		margin-block: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--color-error, #ef4444);
		border-radius: var(--radius-sm);
		min-width: 0;
	}
	.input-errors ul {
		padding-left: 1rem;
		margin: 0;
	}
	.input-errors button {
		background: transparent;
		color: var(--text-primary);
		border: 0;
		font: inherit;
		text-align: left;
		cursor: pointer;
		padding: 0.4rem 0;
		overflow-wrap: anywhere;
	}
	.source-excerpt {
		display: block;
		overflow-wrap: anywhere;
		word-break: break-word;
	}
	mark {
		background: var(--color-warning-bg, #713f12);
		color: var(--text-primary);
		text-decoration: underline;
	}
	/* ── Desktop scalar alignment; mobile retains stacked controls ─────── */
	@media (min-width: 640px) {
		.answer-row.compact {
			flex-direction: row;
			align-items: center;
			gap: 1rem;
		}
	}
</style>
