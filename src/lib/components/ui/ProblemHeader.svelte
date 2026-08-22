<script lang="ts">
	/**
	 * ProblemHeader Svelte 5 Component.
	 *
	 * Reusable header shell for all practice cards across SignalLab modules.
	 * Renders a title (via MathText), optional badge pills, and a
	 * "Generate Next Problem" button with full keyboard accessibility.
	 *
	 * Supported modules: /odes, /fourier-series, /convolution,
	 * /laplace, /circuits, /fourier-transform.
	 */

	import MathText from "$lib/components/math/MathText.svelte";

	/** A single badge pill displayed beneath the problem title. */
	interface BadgeItem {
		/** Human-readable badge label. May contain plain text only (no LaTeX). */
		label: string;
		/**
		 * Visual colour variant of the badge pill.
		 * - `"primary"`  — cyan accent (default)
		 * - `"secondary"` — amber
		 * - `"accent"`   — green
		 * - `"category"` — neutral/muted
		 */
		variant?: "primary" | "secondary" | "accent" | "category";
	}

	interface Props {
		/**
		 * Problem title displayed as an `<h2>`.
		 * May contain $math$ expressions rendered via MathText.
		 */
		title: string;
		/**
		 * Optional category prefix shown above the title.
		 * Displayed as a plain-text label (e.g. "LCC ODE Problem").
		 */
		category?: string;
		/**
		 * Optional array of badge pills rendered left of the title row.
		 * Each badge inherits its colour from `variant`.
		 */
		badges?: BadgeItem[];
		/** Callback invoked when the "Generate Next Problem" button is clicked. */
		onNextProblem: () => void;
		/**
		 * Override text for the next-problem button.
		 * Defaults to "🎲 Generate Next Problem".
		 */
		nextButtonLabel?: string;
	}

	let {
		title,
		category,
		badges = [],
		onNextProblem,
		nextButtonLabel = "🎲 Generate Next Problem",
	}: Props = $props();
</script>

<div class="problem-header">
	<div class="header-left">
		{#if badges.length > 0 || category}
			<div class="badges-row">
				{#if category}
					<span class="badge primary">{category}</span>
				{/if}
				{#each badges as badge (badge.label)}
					<span class="badge {badge.variant ?? 'primary'} capitalize">
						{badge.label}
					</span>
				{/each}
			</div>
		{/if}
		<h2 class="problem-title">
			<MathText text={title} />
		</h2>
	</div>

	<button
		id="btn-next-problem"
		type="button"
		class="btn-next"
		onclick={onNextProblem}
	>
		{nextButtonLabel}
	</button>
</div>

<style>
	/* ── Outer row ─────────────────────────────────────────── */

	.problem-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	/* ── Left column (badges + title) ─────────────────────── */

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		flex: 1 1 220px;
	}

	/* ── Badge row ─────────────────────────────────────────── */

	.badges-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-full);
		width: fit-content;
		max-width: 100%;
		white-space: nowrap;
	}

	/* Primary — cyan (default) */
	.badge.primary {
		background: var(--accent-bg);
		color: var(--accent-primary);
		border: 1px solid var(--accent-primary);
	}

	/* Secondary — amber */
	.badge.secondary {
		background: var(--color-warning-bg);
		color: var(--color-warning);
		border: 1px solid var(--color-warning);
	}

	/* Accent — green */
	.badge.accent {
		background: var(--color-success-bg);
		color: var(--color-success);
		border: 1px solid var(--color-success);
	}

	/* Category — muted neutral */
	.badge.category {
		background: var(--white-10);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	/* ── Problem title ─────────────────────────────────────── */

	.problem-title {
		font-size: var(--text-xl);
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
		line-height: var(--leading-snug, 1.375);
	}

	/* ── Next problem button ───────────────────────────────── */

	.btn-next {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.btn-next:hover {
		background: var(--bg-card-hover);
		border-color: var(--accent-primary);
	}

	.btn-next:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Container query (≤580px) ──────────────────────────── */

	@container (max-width: 580px) {
		.problem-header {
			gap: 0.75rem;
		}

		.btn-next {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
	}

	/* ── Mobile media query (≤580px) ───────────────────────── */

	@media (max-width: 580px) {
		.problem-header {
			gap: 0.75rem;
		}

		.problem-title {
			font-size: var(--text-lg);
		}

		.btn-next {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.problem-header {
			gap: 0.5rem;
		}

		.problem-title {
			font-size: var(--text-base);
		}

		.btn-next {
			width: 100%;
			text-align: center;
			justify-content: center;
		}
	}
</style>
