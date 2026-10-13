<script lang="ts">
	import type { Snippet } from "svelte";

	/** Accessible worked-solution disclosure with explicit assistance tracking. */
	interface Props {
		/** Whether the student's current answer has passed validation. */
		verified?: boolean;
		/** Complete worked solution, mounted only after verification or deliberate reveal. */
		children: Snippet;
	}

	let { verified = false, children }: Props = $props();
	let revealed = $state(false);
	let assisted = $state(false);

	/** Tracks deliberate native disclosure opening without granting correctness.
	 * @param event - Native details toggle event.
	 */
	function handleToggle(event: Event) {
		if (!(event.currentTarget as HTMLDetailsElement).open) return;
		revealed = true;
		if (!verified) assisted = true;
	}
</script>

<details
	class="worked-solution"
	ontoggle={handleToggle}
>
	<summary
		>{verified || revealed
			? "View worked solution"
			: "Reveal worked solution (assisted)"}</summary
	>
	{#if assisted}
		<p
			class="assistance-status"
			role="status"
		>
			Assisted practice: the worked solution was revealed before
			verification.
		</p>
	{/if}
	{#if verified || revealed}
		<div class="worked-solution-content">{@render children()}</div>
	{/if}
</details>

<style>
	/* ── Native worked-solution disclosure ────────────────── */
	.worked-solution {
		min-width: 0;
		border-top: 1px solid var(--border-color);
		padding-top: 1rem;
	}
	summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--accent-primary);
		overflow-wrap: anywhere;
	}
	summary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 4px;
	}
	.worked-solution-content {
		min-width: 0;
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.assistance-status {
		color: var(--text-secondary);
		margin-top: 0.75rem;
	}
</style>
