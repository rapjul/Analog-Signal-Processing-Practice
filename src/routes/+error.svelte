<script lang="ts">
	/**
	 * SignalLab 404 & Global Error Page Component.
	 * Renders when a requested path is not found or when a requested practice module is under development.
	 */
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import { page } from "$app/state";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import MathInline from "$lib/components/math/MathInline.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in the Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";

	/**
	 * Checks if the requested pathname corresponds to an upcoming/unimplemented practice module.
	 * @param {string} pathname - The requested route path
	 * @returns {boolean} True if route is an upcoming module
	 */
	function isModuleUnimplemented(pathname: string): boolean {
		return (
			pathname.includes("fourier-transform") ||
			pathname.includes("laplace") ||
			pathname.includes("circuits")
		);
	}

	/**
	 * Computes the error title display based on status code and requested pathname.
	 * @param {number} status - The HTTP status code
	 * @param {string} pathname - The requested route path
	 * @returns {string} Human-readable status title
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getErrorTitle(status: number, pathname: string): string {
		if (isModuleUnimplemented(pathname)) {
			return "Module Under Construction";
		}
		switch (status) {
			case 404:
				return "Signal Not Found";
			default:
				return "System Disturbance";
		}
	}

	/**
	 * Computes the detailed error message or upcoming module notice based on route path.
	 * @param {string} defaultMsg - Default error message from page state
	 * @param {string} pathname - The requested route path
	 * @returns {string} Explanatory message text
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getErrorMessage(defaultMsg: string, pathname: string): string {
		if (pathname.includes("fourier-transform")) {
			return "Continuous-Time Fourier Transform (CTFT) practice suite is currently in active development.";
		}
		if (pathname.includes("laplace")) {
			return "Laplace Transform & S-Domain Analysis practice suite is currently in active development.";
		}
		if (pathname.includes("circuits")) {
			return "Circuit Analysis & Transfer Functions practice suite is currently in active development.";
		}
		return (
			defaultMsg ||
			"The requested transfer function path or signal processing page does not exist."
		);
	}

	/**
	 * Returns contextual KaTeX mathematical formula string for the error/module state.
	 * @param {string} pathname - The requested route path
	 * @returns {string} KaTeX LaTeX expression string
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getMathFormula(pathname: string): string {
		if (pathname.includes("fourier-transform")) {
			return "X(\\omega) = \\int_{-\\infty}^{\\infty} x(t) e^{-j\\omega t} dt";
		}
		if (pathname.includes("laplace")) {
			return "X(s) = \\int_{0^{-}}^{\\infty} x(t) e^{-st} dt";
		}
		if (pathname.includes("circuits")) {
			return "H(s) = \\frac{V_{\\text{out}}(s)}{V_{\\text{in}}(s)}";
		}
		return "H(s) \\to 0 \\quad \\text{for } t \\to \\infty";
	}
</script>

<svelte:head>
	<title
		>{isModuleUnimplemented(page.url.pathname)
			? "Module Coming Soon"
			: page.status || 404} — SignalLab</title
	>
</svelte:head>

<Navigation activeRoute="" />

<main class="error-container">
	<div class="error-card">
		<div
			class="error-badge"
			class:coming-soon={isModuleUnimplemented(page.url.pathname)}
		>
			<span class="status-code"
				>{isModuleUnimplemented(page.url.pathname)
					? "ASP"
					: page.status || 404}</span
			>
			<span class="badge-label"
				>{isModuleUnimplemented(page.url.pathname)
					? "Coming Soon"
					: "Error Response"}</span
			>
		</div>

		<div class="math-banner">
			<MathInline math={getMathFormula(page.url.pathname)} />
		</div>

		<h1 class="error-title">
			{getErrorTitle(page.status || 404, page.url.pathname)}
		</h1>

		<p class="error-message">
			{getErrorMessage(page.error?.message || "", page.url.pathname)}
		</p>

		<div class="available-modules-notice">
			<span class="notice-heading">Practice Ready Modules:</span>
			<div class="module-quick-links">
				<a href="/odes" class="quick-link">LCC ODEs</a>
				<a href="/convolution" class="quick-link">Convolution</a>
				<a href="/fourier-series" class="quick-link">Fourier Series</a>
			</div>
		</div>

		<div class="action-buttons">
			<a href="/" class="home-button"> Return to Main Dashboard </a>
		</div>
	</div>
</main>

<style>
	.error-container {
		max-width: 650px;
		margin: 3.5rem auto;
		padding: 0 1.5rem;
		display: flex;
		justify-content: center;
	}

	.error-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 2.5rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		box-shadow: var(--shadow-md);
	}

	.error-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
	}

	.error-badge.coming-soon {
		background: rgba(6, 182, 212, 0.12);
		border-color: rgba(6, 182, 212, 0.3);
	}

	.error-badge.coming-soon .status-code {
		color: var(--accent-primary);
	}

	.status-code {
		font-weight: 800;
		font-size: 0.9rem;
		color: #f87171;
	}

	.badge-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.math-banner {
		padding: 0.75rem 1.25rem;
		background: var(--bg-card-hover);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		font-size: 1.1rem;
		color: var(--accent-primary);
	}

	.error-title {
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin: 0;
	}

	.error-message {
		font-size: 0.95rem;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
		max-width: 480px;
	}

	.available-modules-notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		padding: 1rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		width: 100%;
		max-width: 480px;
	}

	.notice-heading {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.module-quick-links {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.quick-link {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--accent-primary);
		background: rgba(6, 182, 212, 0.1);
		border: 1px solid rgba(6, 182, 212, 0.25);
		padding: 0.3rem 0.65rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.quick-link:hover {
		background: var(--accent-primary);
		color: var(--bg-dark);
	}

	.action-buttons {
		margin-top: 0.5rem;
	}

	.home-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--accent-primary);
		color: var(--bg-dark);
		font-weight: 700;
		font-size: 0.9rem;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.home-button:hover {
		opacity: 0.9;
		transform: translateY(-2px);
		box-shadow: var(--shadow-glow);
	}
</style>
