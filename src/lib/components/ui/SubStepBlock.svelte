<script lang="ts">
	/**
	 * SubStepBlock Svelte 5 Component.
	 *
	 * Standardized Tier 2 structural container for micro-challenges within
	 * ITS multi-part solver steps (ADR-0034).
	 *
	 * Encapsulates part badges, mathematical headers via MathText, completion status
	 * badges, and reactive toggling between active interactive controls and
	 * compact verified summary rows.
	 */

	import type { Snippet } from "svelte";
	import MathText from "$lib/components/math/MathText.svelte";

	/**
	 * Component properties for SubStepBlock.
	 */
	interface Props {
		/** Optional part identifier badge label (e.g. "Part 2A", "Part 1", "Substep A"). */
		badge?: string;
		/** Optional sub-step title, rendered with math notation via MathText. */
		title?: string;
		/** Optional custom title snippet override. */
		titleSnippet?: Snippet;
		/** Flag indicating whether this sub-step has been completed and verified. */
		isCompleted?: boolean;
		/** Optional custom snippet displayed when this sub-step is completed. */
		summarySnippet?: Snippet;
		/** Optional explicit snippet displayed when active. */
		activeSnippet?: Snippet;
		/** Default slot/content displayed when active or when summarySnippet is omitted. */
		children?: Snippet;
		/** Optional additional CSS class names. */
		class?: string;
	}

	let {
		badge,
		title,
		titleSnippet,
		isCompleted = false,
		summarySnippet,
		activeSnippet,
		children,
		class: className = "",
	}: Props = $props();
</script>

<div
	class={["subpart-block", className].filter(Boolean).join(" ")}
	class:subpart-done={isCompleted}
>
	{#if badge || title || titleSnippet || isCompleted}
		<div class="subpart-header">
			{#if badge}
				<span class="subpart-badge">{badge}</span>
			{/if}
			{#if titleSnippet}
				{@render titleSnippet()}
			{:else if title}
				<h4
					class="subpart-title"
					tabindex="-1"
					data-progress-heading
				>
					<MathText text={title} />
				</h4>
			{/if}
			{#if isCompleted}
				<span class="substep-check-badge">
					<span class="check-icon">✓</span> Verified
				</span>
			{/if}
		</div>
	{/if}

	{#if isCompleted && summarySnippet}
		{@render summarySnippet()}
	{:else if activeSnippet}
		{@render activeSnippet()}
	{:else if children}
		{@render children()}
	{/if}
</div>

<style>
	/* ── Subpart Block Layout ──────────────────────────────────── */

	.subpart-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}

	/* Completed subpart modifier */
	.subpart-block.subpart-done {
		opacity: 0.92;
	}

	/* ── Subpart Header ────────────────────────────────────────── */

	.subpart-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.subpart-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
		letter-spacing: 0.02em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.subpart-title {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		flex: 1;
		min-width: 0;
	}

	.substep-check-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-success);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
		flex-shrink: 0;
	}

	.check-icon {
		font-size: 0.85rem;
	}

	/* ── Narrow viewport (≤360px) container query ───────────────── */
	@container (max-width: 360px) {
		.subpart-header {
			gap: 0.35rem;
		}

		.subpart-badge {
			font-size: 0.7rem;
			padding: 0.1rem 0.35rem;
		}

		.subpart-title {
			font-size: var(--text-xs);
		}

		.substep-check-badge {
			font-size: 0.7rem;
		}
	}

	/* ── Mobile media query (≤480px) ───────────────────────────── */
	@media (max-width: 480px) {
		.subpart-block {
			gap: 0.5rem;
		}
	}
</style>
