<script lang="ts">
	/**
	 * StepFeedback Svelte 5 Component.
	 *
	 * Renders diagnostic ITS step solver feedback, input validation warnings,
	 * and error messages with LaTeX mathematical typesetting and responsive styling.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";
	import type { BaseStepSolverState } from "$lib/components/solvers/base-step-solver.svelte";

	interface Props {
		/** Reactive BaseStepSolverState controller instance */
		solver: BaseStepSolverState;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { solver }: Props = $props();
</script>

{#if solver.currentFeedback}
	<div
		class="feedback-alert error-box"
		class:feedback-validation={solver.currentFeedbackType === "validation"}
		class:feedback-misconception={solver.currentFeedbackType ===
			"misconception"}
		class:feedback-incorrect={solver.currentFeedbackType === "incorrect"}
		role="alert"
	>
		<span class="alert-icon">{solver.currentFeedbackIcon}</span>
		<div class="alert-content">
			<strong>{solver.currentFeedbackTitle}</strong>
			<p class="alert-text">
				<MathText text={solver.currentFeedback} />
			</p>
		</div>
	</div>
{/if}

<style>
	.feedback-alert {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm, 6px);
		font-size: 0.85rem;
		line-height: 1.4;
		word-break: break-word;
	}

	.feedback-alert.error-box {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: var(--text-primary);
	}

	.feedback-alert.feedback-validation {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.35);
	}

	.feedback-alert.feedback-misconception {
		background: rgba(249, 115, 22, 0.12);
		border: 1px solid rgba(249, 115, 22, 0.35);
	}

	.alert-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
		line-height: 1.2;
	}

	.alert-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.alert-text {
		margin: 0;
		color: var(--text-secondary);
	}
</style>
