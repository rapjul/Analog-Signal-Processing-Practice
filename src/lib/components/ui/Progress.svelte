<script lang="ts">
	/**
	 * Progress Svelte 5 Component.
	 *
	 * Displays step numbers, current active sub-task, step completion status,
	 * and a responsive layout across all practice modules.
	 */

	interface Props {
		/** Active 1-based step index */
		currentStep: number;
		/** Total number of sequential steps */
		totalSteps: number;
		/** Optional custom title label (defaults to "Progress:") */
		title?: string;
		/** Optional active step title / sub-task description */
		activeStepTitle?: string;
		/** Optional callback when a step pill is clicked */
		onStepClick?: (step: number) => void;
	}

	let {
		currentStep,
		totalSteps,
		title = "Progress:",
		activeStepTitle,
		onStepClick,
	}: Props = $props();

	/**
	 * Array of 1-based step indices.
	 */
	const stepIndices = $derived(
		Array.from({ length: Math.max(1, totalSteps) }, (_, i) => i + 1),
	);
</script>

<div
	class="steps-progress-bar"
	role="region"
	aria-label="Progress Tracker"
>
	<div class="progress-info">
		<span class="progress-title">{title}</span>
		{#if activeStepTitle}
			<span class="active-task-desc">{activeStepTitle}</span>
		{/if}
	</div>

	<div
		class="progress-pills"
		role="list"
		aria-label="Step Progression"
	>
		{#each stepIndices as s}
			{#if onStepClick}
				<button
					type="button"
					class="progress-pill"
					class:active={currentStep === s}
					class:completed={currentStep > s}
					onclick={() => onStepClick?.(s)}
					aria-label={`Step ${s}${currentStep === s ? " (Active)" : currentStep > s ? " (Completed)" : " (Upcoming)"}`}
					aria-current={currentStep === s ? "step" : undefined}
				>
					{s < currentStep ? "✓" : s}
				</button>
			{:else}
				<div
					class="progress-pill"
					class:active={currentStep === s}
					class:completed={currentStep > s}
					role="listitem"
					aria-label={`Step ${s}${currentStep === s ? " (Active)" : currentStep > s ? " (Completed)" : " (Upcoming)"}`}
					aria-current={currentStep === s ? "step" : undefined}
				>
					{s < currentStep ? "✓" : s}
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* ── Progress bar container ────────────────────────────── */

	.steps-progress-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--bg-secondary);
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
		box-sizing: border-box;
	}

	/* ── Progress info & title ─────────────────────────────── */

	.progress-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		min-width: 0;
		padding: 5px 10px;
	}

	.progress-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.active-task-desc {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--accent-primary);
		background: var(--accent-bg-subtle);
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--accent-bg);
		word-break: break-word;
	}

	/* ── Progress pills track ──────────────────────────────── */

	.progress-pills {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.progress-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 700;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		transition: all 0.2s ease;
		cursor: default;
		padding: 0;
		line-height: 1;
		font-family: inherit;
	}

	button.progress-pill {
		cursor: pointer;
	}

	button.progress-pill:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* Active step — filled cyan with subtle shadow */
	.progress-pill.active {
		background: var(--accent-primary);
		color: var(--accent-contrast);
		border-color: var(--accent-primary);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	/* Completed step — emerald checkmark */
	.progress-pill.completed {
		background: var(--color-success-bg);
		border-color: var(--color-success);
		color: var(--color-success);
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.steps-progress-bar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.6rem;
			padding: 0.6rem 0.75rem;
		}

		.progress-info {
			width: 100%;
			justify-content: space-between;
		}

		.progress-pill {
			width: 1.5rem;
			height: 1.5rem;
			font-size: var(--text-2xs);
		}
	}
</style>
