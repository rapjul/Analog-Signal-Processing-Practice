<script lang="ts">
	/**
	 * UpdateToast Svelte 5 Component.
	 *
	 * Displays non-intrusive, accessible toast notifications for PWA update prompts
	 * and offline-ready status updates.
	 */

	interface Props {
		/** Whether the toast is currently visible */
		show?: boolean;
		/** Toast display mode: 'update' for new version or 'offline' for offline cache ready */
		mode?: "update" | "offline";
		/** Callback triggered when user clicks 'Update / Refresh' */
		onUpdate?: () => void;
		/** Callback triggered when user dismisses the toast */
		onDismiss?: () => void;
	}

	let {
		show = false,
		mode = "update",
		onUpdate = () => {},
		onDismiss = () => {},
	}: Props = $props();

	/**
	 * Handles clicking the update / refresh action button.
	 */
	function handleUpdate() {
		onUpdate();
	}

	/**
	 * Handles dismissing the toast notification.
	 */
	function handleDismiss() {
		onDismiss();
	}
</script>

{#if show}
	<aside
		class="update-toast"
		role="status"
		aria-live="polite"
		aria-label={mode === "update"
			? "Application update available"
			: "Application ready for offline use"}
	>
		<div class="toast-content">
			<div
				class="toast-icon-wrapper"
				aria-hidden="true"
			>
				{#if mode === "update"}
					<svg
						class="toast-icon"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg
						class="toast-icon"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>

			<div class="toast-text-group">
				<p class="toast-title">
					{mode === "update"
						? "New version available"
						: "Offline ready"}
				</p>
				<p class="toast-description">
					{mode === "update"
						? "Reload to update SignalLab with the latest features."
						: "SignalLab is cached and ready to use offline."}
				</p>
			</div>
		</div>

		<div class="toast-actions">
			{#if mode === "update"}
				<button
					type="button"
					class="btn-toast-update"
					onclick={handleUpdate}
					aria-label="Update and refresh application"
				>
					Update
				</button>
			{/if}
			<button
				type="button"
				class="btn-toast-dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss notification"
			>
				Dismiss
			</button>
		</div>
	</aside>
{/if}

<style>
	/* ── Update Toast Notification Layout ────────────────────────────── */

	.update-toast {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		max-width: 480px;
		padding: 0.875rem 1.125rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(8px);
		animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.toast-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		background-color: var(--accent-bg);
		color: var(--accent-primary);
		border-radius: var(--radius-sm);
	}

	.toast-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.toast-text-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.toast-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
		line-height: var(--leading-tight);
	}

	.toast-description {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		line-height: var(--leading-normal);
	}

	.toast-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* ── Toast Buttons ───────────────────────────────────────────────── */

	.btn-toast-update,
	.btn-toast-dismiss {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	/* Primary update button */
	.btn-toast-update {
		background-color: var(--accent-primary);
		color: var(--accent-contrast);
		border: 1px solid var(--accent-primary);
	}

	.btn-toast-update:hover {
		background-color: var(--accent-hover);
		border-color: var(--accent-hover);
	}

	/* Dismiss secondary button */
	.btn-toast-dismiss {
		background-color: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.btn-toast-dismiss:hover {
		background-color: var(--white-5);
		color: var(--text-primary);
	}

	/* ── Focus Visible State ─────────────────────────────────────────── */

	.btn-toast-update:focus-visible,
	.btn-toast-dismiss:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	/* ── Mobile media query (≤480px) ─────────────────────────────────── */

	@media (max-width: 480px) {
		.update-toast {
			left: 0.75rem;
			right: 0.75rem;
			bottom: 0.75rem;
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			max-width: none;
		}

		.toast-actions {
			justify-content: flex-end;
		}
	}
</style>
