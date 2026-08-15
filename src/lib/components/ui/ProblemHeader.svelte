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

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
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
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		title,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		category,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		badges = [],
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		onNextProblem,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		nextButtonLabel = "🎲 Generate Next Problem",
	}: Props = $props();
</script>

<div class="problem-header">
	<div class="header-left">
		{#if badges.length > 0 || category}
			<div class="badges-row">
				{#if category}
					<span class="badge badge--primary">{category}</span>
				{/if}
				{#each badges as badge (badge.label)}
					<span
						class="badge badge--{badge.variant ??
							'primary'} capitalize"
					>
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
		flex: 1 1 0;
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
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		width: fit-content;
		white-space: nowrap;
	}

	/* Primary — cyan (default) */
	.badge--primary {
		background: rgba(6, 182, 212, 0.12);
		color: var(--accent-primary);
		border: 1px solid rgba(6, 182, 212, 0.3);
	}

	/* Secondary — amber */
	.badge--secondary {
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	/* Accent — green */
	.badge--accent {
		background: rgba(16, 185, 129, 0.12);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	/* Category — muted neutral */
	.badge--category {
		background: rgba(148, 163, 184, 0.1);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	/* ── Problem title ─────────────────────────────────────── */

	.problem-title {
		font-size: 1.35rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
	}

	/* ── Next problem button ───────────────────────────────── */

	.btn-next {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
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

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.problem-header {
			gap: 0.75rem;
		}

		.problem-title {
			font-size: 1.15rem;
		}

		.btn-next {
			width: 100%;
			text-align: center;
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.problem-title {
			font-size: 1.2rem;
		}

		.btn-next {
			width: 100%;
			text-align: center;
		}
	}
</style>
