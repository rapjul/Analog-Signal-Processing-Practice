<script lang="ts">
	/**
	 * StepBreadcrumb Svelte 5 Component.
	 *
	 * Compact horizontal step-progression indicator used across ITS solvers.
	 * Shows completed (✓), active (pulsing glow), and locked (🔒) step states.
	 * Step titles are rendered via MathText so LaTeX math in titles compiles cleanly.
	 */

	import MathText from "$lib/components/math/MathText.svelte";

	/** Metadata for a single step in the breadcrumb. */
	interface StepInfo {
		/** 1-based step number. */
		number: number;
		/** Full step title (may contain $math$ expressions). */
		title: string;
		/** Optional abbreviated title for narrow viewports. */
		shortTitle?: string;
	}

	interface Props {
		/** Ordered list of step metadata objects. */
		steps: StepInfo[];
		/** Current 1-based active step index. */
		currentStep: number;
		/** Total number of steps in the solver. */
		totalSteps: number;
		/**
		 * Optional callback invoked when the user clicks a completed step pill.
		 * Receives the 1-based step number clicked.
		 */
		onSelectStep?: (stepNumber: number) => void;
	}

	let { steps, currentStep, totalSteps, onSelectStep }: Props = $props();

	/**
	 * Derives the display status of a given step number relative to currentStep.
	 * @param {number} stepNumber 1-based step number to evaluate
	 * @returns {"completed" | "active" | "locked"} Step status string
	 */
	function getStatus(stepNumber: number): "completed" | "active" | "locked" {
		if (stepNumber < currentStep) return "completed";
		if (stepNumber === currentStep) return "active";
		return "locked";
	}

	/**
	 * Returns the icon suffix to append after the step number / title.
	 * @param {"completed" | "active" | "locked"} status Step status
	 * @returns {string} Icon character or empty string
	 */
	function getIcon(status: "completed" | "active" | "locked"): string {
		switch (status) {
			case "completed":
				return "✓";
			case "locked":
				return "🔒";
			case "active":
				return "";
			default:
				throw new Error(
					`Unhandled step status: ${status satisfies never}`,
				);
		}
	}
</script>

<nav
	class="step-breadcrumb"
	aria-label="Step Progression"
>
	<ol
		class="breadcrumb-list"
		role="list"
	>
		{#each steps as step (step.number)}
			{@const status = getStatus(step.number)}
			{@const isClickable = status === "completed" && onSelectStep}

			<li
				class="breadcrumb-item"
				role="listitem"
			>
				{#if isClickable}
					<!-- Completed steps are navigable when a callback is provided -->
					<button
						id="step-crumb-{step.number}"
						type="button"
						class="crumb-pill crumb-pill--{status}"
						onclick={() => onSelectStep?.(step.number)}
						aria-label={`Go back to Step ${step.number}: ${step.shortTitle ?? step.title}`}
					>
						<span class="crumb-num">{step.number}</span>
						<span class="crumb-title">
							<MathText text={step.shortTitle ?? step.title} />
						</span>
						<span
							class="crumb-icon"
							aria-hidden="true"
						>
							{getIcon(status)}
						</span>
					</button>
				{:else}
					<!-- Active and locked steps are non-interactive -->
					<div
						id="step-crumb-{step.number}"
						class="crumb-pill crumb-pill--{status}"
						role="listitem"
						aria-label={`Step ${step.number}: ${step.shortTitle ?? step.title}${status === "active" ? " (Current)" : status === "locked" ? " (Locked)" : ""}`}
						aria-current={status === "active" ? "step" : undefined}
					>
						<span class="crumb-num">{step.number}</span>
						<span class="crumb-title">
							<MathText text={step.shortTitle ?? step.title} />
						</span>
						{#if getIcon(status)}
							<span
								class="crumb-icon"
								aria-hidden="true"
							>
								{getIcon(status)}
							</span>
						{/if}
					</div>
				{/if}

				{#if step.number < totalSteps}
					<!-- Separator arrow between steps; hidden from screen readers -->
					<span
						class="crumb-sep"
						aria-hidden="true">›</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.step-breadcrumb {
		width: 100%;
		min-width: 0;
		overflow-x: auto;
		/* Smooth horizontal scroll snap on mobile */
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.step-breadcrumb::-webkit-scrollbar {
		display: none;
	}

	.breadcrumb-list {
		display: flex;
		align-items: center;
		gap: 0;
		list-style: none;
		margin: 0;
		padding: 0;
		flex-wrap: nowrap;
	}

	.breadcrumb-item {
		display: flex;
		align-items: center;
		gap: 0;
		flex-shrink: 0;
		scroll-snap-align: start;
	}

	/* ── Pill ─────────────────────────────────────────────── */

	.crumb-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.55rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: var(--leading-tight);
		white-space: nowrap;
		text-decoration: none;
		cursor: default;
		border: 1px solid transparent;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
		font-family: inherit;
		background: transparent;
	}

	/* Active – pulsing glow accent border */
	.crumb-pill--active {
		border-color: var(--accent-primary);
		color: var(--accent-primary);
		background: var(--accent-bg-subtle);
		animation: crumb-pulse 2.4s ease-in-out infinite;
	}

	/* Completed – muted green tint, clickable variant */
	.crumb-pill--completed {
		border-color: var(--color-success);
		color: var(--color-success);
		background: var(--color-success-bg);
	}

	/* Locked – greyed out, non-interactive */
	.crumb-pill--locked {
		border-color: var(--border-color);
		color: var(--text-secondary);
		background: transparent;
		opacity: 0.55;
	}

	/* Button-specific states for completed/clickable pills */
	button.crumb-pill--completed:hover {
		background: var(--color-success-bg);
		border-color: var(--color-success);
		filter: brightness(1.15);
		cursor: pointer;
	}

	button.crumb-pill--completed:focus-visible {
		outline: 2px solid var(--color-success);
		outline-offset: 2px;
	}

	/* ── Step parts ───────────────────────────────────────── */

	.crumb-num {
		font-size: var(--text-2xs);
		font-weight: 800;
		opacity: 0.75;
	}

	.crumb-title {
		font-size: var(--text-xs);
		font-weight: 600;
		min-width: 0;
	}

	.crumb-icon {
		font-size: var(--text-2xs);
	}

	/* ── Separator ────────────────────────────────────────── */

	.crumb-sep {
		padding: 0 0.25rem;
		font-size: 0.85rem;
		color: var(--border-color);
		user-select: none;
	}

	/* ── Active pulse animation ───────────────────────────── */

	@keyframes crumb-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
		}
		50% {
			box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.crumb-title {
			/* Abbreviate title on extremely narrow screens */
			max-width: 4.5rem;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.crumb-pill {
			padding: 0.25rem 0.45rem;
			font-size: 0.7rem;
		}

		.crumb-sep {
			padding: 0 0.15rem;
		}
	}
</style>
