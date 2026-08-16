<script lang="ts">
	/**
	 * StickyActionBar Svelte 5 Component.
	 *
	 * Floating viewport-anchored bottom utility bar for housing
	 * practice card action buttons (e.g. Submit, Validate, Formula Drawer).
	 *
	 * Uses `position: sticky; bottom` with backdrop blur and glassmorphism
	 * so it stays in view while the user scrolls through problem content.
	 * Safe-area insets (`env(safe-area-inset-bottom)`) ensure correct
	 * positioning on iOS home-indicator devices.
	 *
	 * Children are rendered via the `children` Svelte 5 snippet slot.
	 */

	import type { Snippet } from "svelte";

	interface Props {
		/**
		 * Controls visibility of the bar.
		 * When false, the bar is hidden via `display: none`.
		 * Defaults to true.
		 */
		visible?: boolean;
		/**
		 * Svelte 5 children snippet rendered inside the action bar.
		 * Typically one or more action buttons.
		 */
		children?: Snippet;
	}

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let { visible = true, children }: Props = $props();
</script>

{#if visible}
	<div
		class="sticky-action-bar"
		role="toolbar"
		aria-label="Problem actions"
	>
		<div class="action-bar-inner">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Sticky outer shell ────────────────────────────────── */

	.sticky-action-bar {
		position: sticky;
		/* --bar-offset is overridden by the ≤480px media query below */
		--bar-offset: 1rem;
		bottom: calc(var(--bar-offset) + env(safe-area-inset-bottom, 0px));
		z-index: 10;
		width: 100%;
		min-width: 0;
		pointer-events: none; /* Allow clicks through transparent areas */
	}

	/* ── Inner glassmorphic pill ───────────────────────────── */

	.action-bar-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid var(--border-color);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.3),
			0 1px 0 rgba(255, 255, 255, 0.04) inset;
		pointer-events: auto; /* Re-enable clicks inside the pill */
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.action-bar-inner {
			padding: 0.55rem 0.75rem;
			gap: 0.5rem;
		}
	}

	/* ── Mobile media query (≤480px) ─────────────────────── */

	@media (max-width: 480px) {
		.sticky-action-bar {
			--bar-offset: 0.75rem;
		}

		.action-bar-inner {
			/* Stack buttons to full width on narrow screens */
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
