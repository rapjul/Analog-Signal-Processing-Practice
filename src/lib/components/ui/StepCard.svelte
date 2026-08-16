<script lang="ts">
	/**
	 * StepCard Svelte 5 Component.
	 *
	 * Reusable container card for a single ITS solver step.
	 * Encapsulates step badge, title (rendered via MathText), collapsed/completed
	 * summary display, and active step body content via the children snippet.
	 *
	 * Status states:
	 *  - "active"    — current step; full body visible, accent border.
	 *  - "completed" — collapsed; shows a green checkmark summary row.
	 *  - "locked"    — upcoming step; dimmed, no body rendered.
	 */

	import type { Snippet } from "svelte";
	import MathText from "$lib/components/math/MathText.svelte";

	interface Props {
		/** 1-based index of this step within the solver. */
		stepNumber: number;
		/** Step title, may contain $math$ expressions rendered via MathText. */
		title: string;
		/** Visual and interaction state of this step card. */
		status: "active" | "completed" | "locked";
		/**
		 * Optional raw LaTeX string shown in the completed summary row.
		 * When provided, rendered as: ✓ <summaryLatex rendered by MathText>
		 * Ignored when a summarySnippet is also provided.
		 */
		summaryLatex?: string;
		/** Optional Svelte snippet for the active step body content. */
		children?: Snippet;
		/**
		 * Optional Svelte snippet replacing the default completed summary row.
		 * Takes precedence over summaryLatex when both are provided.
		 */
		summarySnippet?: Snippet;
	}

	let {
		stepNumber,
		title,
		status,
		summaryLatex,
		children,
		summarySnippet,
	}: Props = $props();
</script>

<div
	class="step-card"
	class:step-card--active={status === "active"}
	class:step-card--completed={status === "completed"}
	class:step-card--locked={status === "locked"}
>
	<!-- ── Step Header ── -->
	<div class="step-header">
		<div
			class="step-badge"
			aria-hidden="true"
		>
			Step {stepNumber}
		</div>
		<h3 class="step-title">
			<MathText text={title} />
		</h3>
	</div>

	<!-- ── Body: Active step content ── -->
	{#if status === "active" && children}
		<div class="step-body">
			{@render children()}
		</div>
	{/if}

	<!-- ── Summary: Completed state ── -->
	{#if status === "completed"}
		<div
			class="step-summary"
			aria-label={`Step ${stepNumber} completed`}
		>
			<span
				class="check-icon"
				aria-hidden="true">✓</span
			>
			{#if summarySnippet}
				{@render summarySnippet()}
			{:else if summaryLatex}
				<span class="summary-text">
					<MathText text={summaryLatex} />
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ── Card Container ───────────────────────────────────── */

	.step-card {
		container-type: inline-size;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md, 8px);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: all 0.2s ease;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	/* Active — accent border + subtle glow */
	.step-card--active {
		border-color: var(--accent-primary);
		box-shadow: 0 2px 12px var(--accent-glow);
	}

	/* Completed — green tint, compact padding */
	.step-card--completed {
		border-color: var(--color-success);
		background: var(--color-success-bg);
		padding: 0.75rem 1.25rem;
	}

	/* Locked — dimmed, pointer events disabled */
	.step-card--locked {
		opacity: 0.65;
		pointer-events: none;
	}

	.step-card--locked .step-badge {
		background: var(--white-10);
		color: var(--text-secondary);
	}

	/* ── Step Header ──────────────────────────────────────── */

	.step-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
	}

	.step-badge {
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		background: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.step-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
		line-height: var(--leading-tight);
	}

	/* ── Body ─────────────────────────────────────────────── */

	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		min-width: 0;
	}

	/* ── Completed Summary Row ────────────────────────────── */

	.step-summary {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.check-icon {
		color: var(--color-success);
		font-weight: 800;
		flex-shrink: 0;
	}

	.summary-text {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.step-card {
			padding: 0.75rem 0.85rem;
		}

		.step-card--completed {
			padding: 0.6rem 0.85rem;
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.step-title {
			font-size: var(--text-sm);
		}
	}
</style>
