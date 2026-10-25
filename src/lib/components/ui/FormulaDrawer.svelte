<script lang="ts">
	/**
	 * FormulaDrawer Svelte 5 Component.
	 *
	 * Slide-over drawer providing on-demand mathematical reference tables,
	 * formulas, and shortcuts for ODEs, Fourier Series, and Transforms.
	 */

	import { tick } from "svelte";
	import ConvolutionFormulaReference from "$lib/components/ui/formula-drawer/ConvolutionFormulaReference.svelte";
	import FourierFormulaReference from "$lib/components/ui/formula-drawer/FourierFormulaReference.svelte";
	import LaplaceFormulaReference from "$lib/components/ui/formula-drawer/LaplaceFormulaReference.svelte";
	import OdeFormulaReference from "$lib/components/ui/formula-drawer/OdeFormulaReference.svelte";
	import TransformsFormulaReference from "$lib/components/ui/formula-drawer/TransformsFormulaReference.svelte";

	interface Props {
		/** Whether the drawer overlay is currently open */
		isOpen: boolean;
		/** Callback triggered when the drawer is closed */
		onClose: () => void;
		/** Current route used to select the most relevant reference. */
		activeRoute?: string;
	}

	let {
		isOpen = $bindable(false),
		onClose,
		activeRoute = "/",
	}: Props = $props();

	type TabId = "odes" | "fourier" | "convolution" | "transforms";
	const tabs: TabId[] = ["odes", "fourier", "convolution", "transforms"];
	let activeTab = $state<TabId>("odes");
	let drawerElement = $state<HTMLDivElement>();
	let tabElements = $state<HTMLButtonElement[]>([]);
	let priorFocus: HTMLElement | null = null;
	let wasOpen = false;

	/** Maps the current solver route to its formula reference tab. */
	function tabForRoute(route: string): TabId {
		if (route.startsWith("/convolution")) return "convolution";
		if (route.startsWith("/fourier-series")) return "fourier";
		if (
			route.startsWith("/fourier-transform") ||
			route.startsWith("/laplace") ||
			route.startsWith("/circuits")
		)
			return "transforms";
		return "odes";
	}

	$effect(() => {
		if (isOpen && !wasOpen) {
			wasOpen = true;
			priorFocus = document.activeElement as HTMLElement | null;
			activeTab = tabForRoute(activeRoute);
			void tick().then(() =>
				tabElements[tabs.indexOf(activeTab)]?.focus(),
			);
		} else if (!isOpen && wasOpen) {
			wasOpen = false;
			void tick().then(() => priorFocus?.focus());
		}
	});

	/**
	 * Handles keydown events to close drawer on Esc key and stop propagation to underlying listeners.
	 * @param {KeyboardEvent} event Keyboard event
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Escape" && isOpen) {
			event.stopImmediatePropagation();
			onClose();
			return;
		}
		if (!isOpen || event.key !== "Tab") return;
		if (!drawerElement) return;
		const focusable = Array.from(
			drawerElement.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		);
		const first = focusable[0];
		const last = focusable.at(-1);
		if (!first || !last) return;
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	/**
	 * Sets the active reference tab.
	 * @param {TabId} tab Tab identifier
	 */
	function setTab(tab: TabId) {
		activeTab = tab;
	}

	/** Moves roving tab focus with the horizontal arrow keys. */
	function handleTabKeydown(event: KeyboardEvent, index: number): void {
		let nextIndex = index;
		if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
		else if (event.key === "ArrowLeft")
			nextIndex = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === "Home") nextIndex = 0;
		else if (event.key === "End") nextIndex = tabs.length - 1;
		else return;
		event.preventDefault();
		setTab(tabs[nextIndex] ?? "odes");
		void tick().then(() => tabElements[nextIndex]?.focus());
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div
		class="drawer-backdrop"
		onclick={onClose}
		onkeydown={(e) => e.key === "Escape" && onClose()}
		role="button"
		tabindex="-1"
		aria-label="Close formula reference drawer backdrop"
	></div>

	<div
		class="formula-drawer"
		bind:this={drawerElement}
		role="dialog"
		aria-modal="true"
		aria-labelledby="drawer-title"
	>
		<div class="drawer-header">
			<div class="header-title-group">
				<span class="header-icon">📖</span>
				<h2
					id="drawer-title"
					class="drawer-title"
				>
					Formula Reference Sheet
				</h2>
			</div>
			<button
				type="button"
				class="btn-close close-btn"
				onclick={onClose}
				aria-label="Close formula reference drawer"
			>
				✕
			</button>
		</div>

		<!-- Tab Navigation -->
		<div
			class="drawer-tabs"
			role="tablist"
		>
			{#each tabs as tab, index}
				<button
					type="button"
					role="tab"
					class="tab-btn"
					class:active={activeTab === tab}
					aria-selected={activeTab === tab}
					aria-controls={`formula-panel-${tab}`}
					id={`formula-tab-${tab}`}
					tabindex={activeTab === tab ? 0 : -1}
					bind:this={tabElements[index]}
					onclick={() => setTab(tab)}
					onkeydown={(event) => handleTabKeydown(event, index)}
				>
					{tab === "odes"
						? "LCC ODEs"
						: tab === "fourier"
							? "Fourier Series"
							: tab === "convolution"
								? "Convolution"
								: "Transforms & Circuits"}
				</button>
			{/each}
		</div>

		<!-- Drawer Body Content -->
		<div
			class="drawer-content"
			role="tabpanel"
			id={`formula-panel-${activeTab}`}
			aria-labelledby={`formula-tab-${activeTab}`}
		>
			{#if activeTab === "odes"}
				<OdeFormulaReference />
			{:else if activeTab === "fourier"}
				<FourierFormulaReference />
			{:else if activeTab === "convolution"}
				<ConvolutionFormulaReference />
			{:else if activeTab === "transforms"}
				{#if activeRoute.startsWith("/laplace")}<LaplaceFormulaReference
					/>{:else}<TransformsFormulaReference {activeRoute} />{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Drawer backdrop overlay ───────────────────────────── */

	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(2px);
		z-index: 200;
		animation: fadeIn 0.2s ease-out forwards;
	}

	/* ── Slide-over drawer container ───────────────────────── */

	.formula-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(100%, 520px);
		background: var(--bg-card);
		border-left: 1px solid var(--border-color);
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.35);
		z-index: 210;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	/* ── Drawer header & close action ──────────────────────── */

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-card);
	}

	.header-title-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.header-icon {
		font-size: 1.3rem;
	}

	.drawer-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm, 6px);
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.95rem;
		transition: all 0.15s ease;
	}

	.btn-close:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
		border-color: var(--accent-primary);
	}

	.btn-close:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	/* ── Category tabs navigation ──────────────────────────── */

	.drawer-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-secondary);
		padding: 0 1rem;
		gap: 0.5rem;
		overflow-x: auto;
	}

	.tab-btn {
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		color: var(--text-primary);
	}

	.tab-btn.active {
		color: var(--accent-primary);
		border-bottom-color: var(--accent-primary);
	}

	.tab-btn:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: -2px;
	}

	/* ── Drawer scrollable body ────────────────────────────── */

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Mobile media query (≤640px) ─────────────────────── */

	@media (max-width: 640px) {
		.formula-drawer {
			width: 100%;
		}
	}
</style>
