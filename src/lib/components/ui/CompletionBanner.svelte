<script lang="ts">
	/**
	 * CompletionBanner Svelte 5 Component.
	 *
	 * Celebratory banner displayed when all steps or problems in a
	 * practice card have been successfully solved.
	 *
	 * Renders a glassmorphic green-tinted card with an optional icon,
	 * title, description, stat items, and an `actionsSnippet` slot
	 * for caller-defined action buttons.
	 *
	 * Title and description strings may contain $math$ expressions —
	 * each is rendered through MathText so LaTeX compiles cleanly.
	 */

	import type { Snippet } from "svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";

	/** A single statistic row displayed in the banner footer. */
	interface StatItem {
		/** Descriptive label for the stat (e.g. "Steps Completed"). */
		label: string;
		/** Computed or raw value displayed alongside the label. */
		value: string | number;
	}

	interface Props {
		/**
		 * Banner headline.
		 * Defaults to "Problem Completed!".
		 * May contain $math$ expressions rendered via MathText.
		 */
		title?: string;
		/**
		 * Secondary descriptive text shown beneath the title.
		 * May contain $math$ expressions rendered via MathText.
		 */
		description?: string;
		/**
		 * Emoji or unicode icon shown on the leading edge of the banner.
		 * Defaults to "🎉".
		 */
		icon?: string;
		/**
		 * Optional list of key-value stat items rendered in a pill row
		 * beneath the description.
		 */
		stats?: StatItem[];
		/**
		 * Optional Svelte snippet rendered below the stat row.
		 * Use for action buttons (e.g. "Next Problem", "Review Steps").
		 */
		actionsSnippet?: Snippet;
	}

	let {
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		title = "Problem Completed!",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		description,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		icon = "🎉",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		stats = [],
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		actionsSnippet,
	}: Props = $props();
</script>

<div
	class="completion-banner"
	role="status"
	aria-live="polite"
>
	<!-- ── Icon ── -->
	<span
		class="banner-icon"
		aria-hidden="true">{icon}</span
	>

	<!-- ── Text content ── -->
	<div class="banner-body">
		<h3 class="banner-title">
			<MathText text={title} />
		</h3>

		{#if description}
			<p class="banner-description">
				<MathText text={description} />
			</p>
		{/if}

		{#if stats.length > 0}
			<div
				class="banner-stats"
				aria-label="Completion statistics"
			>
				{#each stats as stat (stat.label)}
					<span class="stat-pill">
						<span class="stat-label">{stat.label}</span>
						<span class="stat-value">{stat.value}</span>
					</span>
				{/each}
			</div>
		{/if}

		{#if actionsSnippet}
			<div class="banner-actions">
				{@render actionsSnippet()}
			</div>
		{/if}
	</div>
</div>

<style>
	/* ── Outer banner card ─────────────────────────────────── */

	.completion-banner {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.35);
		border-radius: var(--radius-md, 8px);
		padding: 1rem 1.25rem;
		animation: bannerFadeIn 0.35s ease-out;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		/* Subtle green backdrop glow */
		box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08);
	}

	@keyframes bannerFadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ── Icon ─────────────────────────────────────────────── */

	.banner-icon {
		font-size: 2rem;
		line-height: 1;
		flex-shrink: 0;
	}

	/* ── Body column ──────────────────────────────────────── */

	.banner-body {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		flex: 1 1 0;
	}

	/* ── Title ────────────────────────────────────────────── */

	.banner-title {
		font-size: var(--text-lg);
		font-weight: 800;
		color: #10b981;
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* ── Description ──────────────────────────────────────── */

	.banner-description {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
		line-height: var(--leading-normal, 1.5);
	}

	/* ── Stats row ────────────────────────────────────────── */

	.banner-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.stat-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.25);
		border-radius: 999px;
		padding: 0.2rem 0.65rem;
		font-size: var(--text-xs);
	}

	.stat-label {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.stat-value {
		color: #10b981;
		font-weight: 700;
	}

	/* ── Actions slot ─────────────────────────────────────── */

	.banner-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.completion-banner {
			padding: 0.85rem 0.9rem;
			gap: 0.75rem;
		}

		.banner-icon {
			font-size: 1.6rem;
		}

		.banner-title {
			font-size: var(--text-base);
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.completion-banner {
			flex-direction: column;
			gap: 0.75rem;
		}

		.banner-icon {
			font-size: 1.75rem;
		}
	}
</style>
