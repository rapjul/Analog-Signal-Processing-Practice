<script lang="ts">
	/** Solver-independent primary action, following the established solver button styles. */
	interface Props {
		/** Task-specific action name. */ label: string;
		/** Whether the current response can be submitted. */ disabled?: boolean;
		/** Native button behavior; solver forms submit by default. */ type?:
			"submit" | "button";
		/** Optional click handler. @param event - Native activation event. */ onclick?: (
			event: MouseEvent,
		) => void;
	}
	let { label, disabled = false, type = "submit", onclick }: Props = $props();
</script>

<div class="solver-actions">
	<button
		class="btn btn-primary"
		{type}
		{disabled}
		{onclick}>{label}</button
	>
</div>

<style>
	/* ── Primary solver action ─────────────────────────────────────────── */
	.solver-actions {
		container: solver-actions / inline-size;
		display: flex;
		justify-content: flex-end;
		width: 100%;
		min-width: 0;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--radius-sm);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 700;
		line-height: var(--leading-snug);
		text-wrap: balance;
		max-width: 100%;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}
	/* Primary — shared solver theme colors. */
	.btn-primary {
		background: var(--accent-primary);
		color: var(--accent-contrast);
	}
	.btn-primary:hover:enabled {
		background: var(--accent-hover);
	}
	.btn-primary:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	/* ── Narrow action container ───────────────────────────────────────── */
	@container solver-actions (max-width: 360px) {
		.btn {
			width: 100%;
		}
	}
	/* ── Reduced motion preference ─────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none;
		}
	}
</style>
