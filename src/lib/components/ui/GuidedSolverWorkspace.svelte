<script lang="ts">
	import type { Snippet } from "svelte";

	/** Solver-independent exercise and previously available context. */
	interface Props {
		/** Active exercise, including its controls and feedback. */ children: Snippet;
		/** Only results already verified by the consuming solver. */ results?:
			Snippet | undefined;
		/** Supplied identities available at this point in the lesson. */ identities?:
			Snippet | undefined;
	}
	let { children, results, identities }: Props = $props();
</script>

<div class="workspace-container">
	<div
		class="guided-workspace"
		class:has-context={results || identities}
	>
		{#if results || identities}
			<aside
				class="workspace-context"
				aria-label="Exercise context"
			>
				{#if results}<section aria-label="Results so far">
						<h5>Results so far</h5>
						{@render results()}
					</section>{/if}
				{#if identities}<section aria-label="Useful identity">
						<h5>Useful identity</h5>
						{@render identities()}
					</section>{/if}
			</aside>
		{/if}
		<div class="workspace-exercise">{@render children()}</div>
	</div>
</div>

<style>
	/* ── Exercise and optional context panels ───────────────────────────── */
	.workspace-container {
		container-type: inline-size;
		width: 100%;
		min-width: 0;
	}
	.guided-workspace {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}
	.workspace-exercise,
	.workspace-context,
	section {
		min-width: 0;
	}
	.workspace-context {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	section {
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		padding: 0.85rem;
		background: var(--bg-secondary);
		overflow-wrap: anywhere;
	}
	h5 {
		margin: 0 0 0.65rem;
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}
	/* ── Wide containers; DOM reading order stays context then exercise ── */
	@container (min-width: 52rem) {
		.guided-workspace.has-context {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			align-items: start;
		}
		.workspace-context {
			grid-column: 2;
			grid-row: 1;
		}
		.workspace-exercise {
			grid-column: 1;
			grid-row: 1;
		}
	}
</style>
