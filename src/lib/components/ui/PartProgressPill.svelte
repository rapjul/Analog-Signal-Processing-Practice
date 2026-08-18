<script lang="ts">
	import type { SubStepProgress } from "$lib/components/solvers/base-step-solver.svelte";

	/**
	 * Component Props for PartProgressPill.
	 */
	interface Props {
		/** Progress descriptor containing current/total and formatted label */
		progress?: SubStepProgress;
		/** Explicit 1-based part index override */
		current?: number;
		/** Explicit total parts count override */
		total?: number;
		/** Explicit custom label override */
		label?: string;
	}

	const { progress, current, total, label }: Props = $props();

	const displayLabel = $derived.by((): string => {
		if (label) return label;
		if (progress) return progress.label;
		if (current !== undefined && total !== undefined) {
			return `Part ${current} of ${total}`;
		}
		return "";
	});
</script>

{#if displayLabel}
	<span class="part-progress-pill">{displayLabel}</span>
{/if}

<style>
	/* ── Subpart progress pill ──────────────────────────────────── */

	.part-progress-pill {
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 0.2rem 0.55rem;
		background: rgba(6, 182, 212, 0.12);
		color: var(--accent-primary);
		border: 1px solid rgba(6, 182, 212, 0.25);
		border-radius: var(--radius-full);
		margin-left: auto;
		white-space: nowrap;
	}

	/* ── Narrow viewport (≤360px) container query ───────────────── */
	@container (max-width: 360px) {
		.part-progress-pill {
			font-size: 0.7rem;
			padding: 0.15rem 0.45rem;
		}
	}
</style>
