<script lang="ts">
	/**
	 * Navigation Header Svelte 5 Component.
	 *
	 * Displays SignalLab brand, module selector links, and theme toggle.
	 */

	import { onMount } from "svelte";

	interface Props {
		/** Current active module path */
		activeRoute?: string;
	}

	// biome-ignore lint/correctness/noUnusedVariables: activeRoute prop is used in template markup
	let { activeRoute = "/odes" }: Props = $props();
	let isDark = $state(true);
	let isMenuOpen = $state(false);

	onMount(() => {
		const currentTheme =
			document.documentElement.getAttribute("data-theme") ||
			localStorage.getItem("theme") ||
			"dark";
		isDark = currentTheme === "dark";
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
	});

	/**
	 * Toggles light and dark UI themes and dispatches event for canvas redraws.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: toggleTheme function is referenced in template click handler
	function toggleTheme() {
		isDark = !isDark;
		const nextTheme = isDark ? "dark" : "light";
		document.documentElement.setAttribute("data-theme", nextTheme);
		localStorage.setItem("theme", nextTheme);
		window.dispatchEvent(
			new CustomEvent("themechange", { detail: { theme: nextTheme } }),
		);
	}

	/**
	 * Toggles the mobile menu open/closed state.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: toggleMenu function is referenced in template click handler
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	/**
	 * Closes mobile menu when clicking a link.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: closeMenu function is referenced in template click handler.
	function closeMenu() {
		isMenuOpen = false;
	}

	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import FormulaDrawer from "./FormulaDrawer.svelte";

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let isFormulaDrawerOpen = $state(false);

	/**
	 * Opens the global formula reference slide-over drawer.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function openFormulaDrawer() {
		isFormulaDrawerOpen = true;
	}

	/**
	 * Closes the global formula reference slide-over drawer.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function closeFormulaDrawer() {
		isFormulaDrawerOpen = false;
	}

	/**
	 * Handles global keyboard shortcuts to dismiss open mobile navigation on Escape.
	 * @param {KeyboardEvent} event Keyboard event
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && isMenuOpen) {
			isMenuOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="navbar">
	<div class="nav-brand">
		<a
			href="/"
			class="brand-link"
			onclick={closeMenu}
		>
			<span class="brand-icon">⚡</span>
			<span class="brand-title">SignalLab</span>
		</a>
	</div>

	<nav
		class="nav-links"
		class:open={isMenuOpen}
	>
		<a
			href="/odes"
			class="nav-link"
			class:active={activeRoute === "/odes"}
			onclick={closeMenu}
		>
			LCC ODEs
		</a>
		<a
			href="/fourier-series"
			class="nav-link"
			class:active={activeRoute === "/fourier-series"}
			onclick={closeMenu}
		>
			Fourier Series
		</a>
		<a
			href="/fourier-transform"
			class="nav-link"
			class:active={activeRoute === "/fourier-transform"}
			onclick={closeMenu}
		>
			CTFT
		</a>
		<a
			href="/convolution"
			class="nav-link"
			class:active={activeRoute === "/convolution"}
			onclick={closeMenu}
		>
			Convolution
		</a>
		<a
			href="/laplace"
			class="nav-link"
			class:active={activeRoute === "/laplace"}
			onclick={closeMenu}
		>
			Laplace
		</a>
		<a
			href="/circuits"
			class="nav-link"
			class:active={activeRoute === "/circuits"}
			onclick={closeMenu}
		>
			Circuits
		</a>
	</nav>

	<div class="nav-actions">
		<button
			type="button"
			class="btn-formula-drawer formula-drawer-btn"
			onclick={openFormulaDrawer}
			title="Open Formula Reference Sheet"
			aria-label="Open Formula Reference Sheet"
		>
			<span class="btn-icon">📖</span>
			<span class="btn-label">Formulas</span>
		</button>

		<button
			type="button"
			class="menu-toggle"
			onclick={toggleMenu}
			aria-label="Toggle navigation menu"
			aria-expanded={isMenuOpen}
		>
			{isMenuOpen ? "✕" : "☰"}
		</button>

		<button
			type="button"
			class="theme-toggle"
			onclick={toggleTheme}
			title="Toggle Theme"
			aria-label="Toggle Theme. Current Theme is {isDark
				? 'Dark'
				: 'Light'}."
		>
			<span class="btn-icon">{isDark ? "🌙" : "☀️"}</span>
			<span class="btn-label">{isDark ? "Dark" : "Light"}</span>
		</button>
	</div>
</header>

<FormulaDrawer
	isOpen={isFormulaDrawerOpen}
	onClose={closeFormulaDrawer}
/>

<style>
	.navbar {
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 100;
		gap: 1rem;
		flex-wrap: nowrap;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
	}

	.brand-link:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.brand-icon {
		font-size: 1.2rem;
	}

	.brand-title {
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
		background: linear-gradient(
			135deg,
			var(--accent-primary),
			var(--accent-hover)
		);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		white-space: nowrap;
	}

	.nav-links {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		justify-content: space-around;
	}

	.nav-link {
		text-decoration: none;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
		white-space: nowrap;
		text-align: center;
	}

	.nav-link:hover {
		color: var(--text-primary);
		background: var(--bg-card-hover);
	}

	.nav-link:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.nav-link.active {
		color: var(--accent-primary);
		background: rgba(6, 182, 212, 0.12);
		font-weight: 600;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
		/* margin-left: auto; */
	}

	.menu-toggle {
		display: none;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.35rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 1rem;
		cursor: pointer;
		line-height: 1;
		transition: all 0.2s ease;
	}

	.menu-toggle:hover,
	.menu-toggle:focus-visible {
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.btn-formula-drawer {
		background: rgba(6, 182, 212, 0.12);
		border: 1px solid rgba(6, 182, 212, 0.35);
		color: var(--accent-primary);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-formula-drawer:hover {
		background: rgba(6, 182, 212, 0.22);
		border-color: var(--accent-primary);
	}

	.btn-formula-drawer:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	.theme-toggle {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.theme-toggle:hover,
	.theme-toggle:focus-visible {
		color: var(--text-primary);
		border-color: var(--accent-primary);
		outline: 2px solid var(--accent-primary);
		outline-offset: 2px;
	}

	@media (max-width: 950px) {
		.navbar {
			padding: 0.6rem 1rem;
			position: relative;
		}

		.menu-toggle {
			display: block;
		}

		.nav-actions {
			margin-left: auto;
		}

		.nav-links {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: var(--bg-card);
			border-bottom: 1px solid var(--border-color);
			flex-direction: column;
			padding: 0.75rem 1rem;
			gap: 0.5rem;
			box-shadow: var(--shadow-md);
		}

		.nav-links.open {
			display: flex;
		}

		.nav-link {
			width: 100%;
			text-align: left;
			padding: 0.6rem 0.8rem;
			font-size: 0.9rem;
		}
	}

	@media (max-width: 480px) {
		.navbar {
			padding: 0.5rem 0.65rem;
			gap: 0.35rem;
		}

		.brand-title {
			font-size: 1.05rem;
		}

		.nav-actions {
			gap: 0.35rem;
		}

		.btn-label {
			display: none;
		}

		.btn-formula-drawer,
		.theme-toggle {
			padding: 0.35rem 0.55rem;
		}
	}
</style>
