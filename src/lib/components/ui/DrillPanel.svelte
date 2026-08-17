<script lang="ts">
	/**
	 * DrillPanel.svelte
	 *
	 * A standardized collapsible disclosure panel (<details>) used across practice
	 * module pages to house targeted filters and problem generators without spoiling
	 * problem types on page load.
	 */

	import type { Snippet } from "svelte";

	/**
	 * Props interface for DrillPanel component.
	 */
	interface Props {
		/** Display title shown in the summary bar */
		title?: string;
		/** Leading emoji or icon symbol */
		icon?: string;
		/** Status or filter mode badge text (e.g. "Random / Exam Mode") */
		badge?: string;
		/** Whether the drawer starts expanded */
		isOpen?: boolean;
		/** Filter inputs and controls slot */
		children: Snippet;
	}

	let {
		title = "Targeted Drill & Custom Filters",
		icon = "⚙️",
		badge = "Random / Exam Mode",
		isOpen = $bindable(false),
		children,
	}: Props = $props();
</script>

<details
	class="drill-panel"
	bind:open={isOpen}
>
	<summary class="drill-summary">
		<span class="drill-summary-content">
			<span
				class="drill-icon"
				aria-hidden="true">{icon}</span
			>
			<span class="drill-title">{title}</span>
		</span>
		<span class="drill-badge">
			{badge}
		</span>
	</summary>

	<div class="drill-controls">
		{@render children()}
	</div>
</details>

<style>
	/* ── Drill disclosure panel container ───────────────────── */

	.drill-panel {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: border-color 0.2s ease;
		width: 100%;
	}

	.drill-panel[open] {
		border-color: var(--accent-primary);
	}

	/* ── Summary interactive bar ────────────────────────────── */

	.drill-summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
		user-select: none;
		list-style: none;
		transition: background 0.15s ease;
		gap: 0.75rem;
	}

	.drill-summary::-webkit-details-marker {
		display: none;
	}

	.drill-summary:hover {
		background: var(--bg-secondary);
	}

	.drill-summary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: -2px;
	}

	.drill-summary-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.drill-icon {
		flex-shrink: 0;
	}

	.drill-title {
		text-wrap: balance;
	}

	/* ── Active state badge ─────────────────────────────────── */

	.drill-badge {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--accent-primary);
		background: var(--accent-bg-subtle, rgba(6, 182, 212, 0.12));
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		border: 1px solid rgba(6, 182, 212, 0.25);
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ── Expanded controls container ────────────────────────── */

	.drill-controls {
		padding: 1rem 1.25rem;
		background: var(--bg-secondary);
		border-top: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ── Mobile media query (≤480px) ────────────────────────── */

	@media (max-width: 480px) {
		.drill-summary {
			padding: 0.65rem 0.75rem;
			flex-wrap: wrap;
		}

		.drill-controls {
			padding: 0.85rem 0.75rem;
		}
	}
</style>
