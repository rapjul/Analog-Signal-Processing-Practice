<script lang="ts">
	/**
	 * PageLayout.svelte
	 *
	 * Universal scaffolding component for SignalLab practice module pages.
	 * Centralizes header typography, navigation wiring, SEO head metadata,
	 * responsive container wrapping, and slot orchestration for controls and workspace.
	 */

	import type { Snippet } from "svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import MathText from "$lib/components/math/MathText.svelte";
	// biome-ignore lint/correctness/noUnusedImports: Used in Svelte HTML template markup.
	import Navigation from "$lib/components/ui/Navigation.svelte";

	/**
	 * Props interface for PageLayout component.
	 */
	interface Props {
		/** Primary page heading and document title */
		title: string;
		/** Mathematical subtitle string parsed and formatted via MathText */
		subtitleText?: string;
		/** Optional custom subtitle snippet for specialized layout structures */
		subtitleSnippet?: Snippet;
		/** Optional plain-text meta description for SEO */
		metaDescription?: string;
		/** Active navigation route path (e.g. "/odes", "/fourier-series") */
		activeRoute: string;
		/** Maximum layout width container constraint (default: "1200px") */
		maxWidth?: "1100px" | "1200px" | "1400px" | "full";
		/** Optional slot for targeted drill panels and filter selectors */
		controls?: Snippet;
		/** Main practice card and solver workspace */
		children: Snippet;
	}

	let {
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		title,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		subtitleText,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		subtitleSnippet,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		metaDescription,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		activeRoute,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		maxWidth = "1200px",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		controls,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		children,
	}: Props = $props();

	/**
	 * Computes the inline CSS max-width value based on the maxWidth prop.
	 *
	 * @param {"1100px" | "1200px" | "1400px" | "full"} width - The requested width constraint
	 * @returns {string} The CSS max-width string value
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function getComputedMaxWidth(
		width: "1100px" | "1200px" | "1400px" | "full",
	): string {
		switch (width) {
			case "1100px":
				return "1100px";
			case "1200px":
				return "1200px";
			case "1400px":
				return "1400px";
			case "full":
				return "100%";
			default:
				return "1200px";
		}
	}
</script>

<svelte:head>
	<title>{title} — SignalLab</title>
	{#if metaDescription}
		<meta
			name="description"
			content={metaDescription}
		/>
	{/if}
</svelte:head>

<Navigation {activeRoute} />

<main
	class="page-container"
	id="main-content"
	style:max-width={getComputedMaxWidth(maxWidth)}
>
	<!-- Header Section -->
	<header class="header-section">
		<h1 class="page-title">{title}</h1>
		{#if subtitleSnippet}
			<p class="page-subtitle">
				{@render subtitleSnippet()}
			</p>
		{:else if subtitleText}
			<p class="page-subtitle">
				<MathText text={subtitleText} />
			</p>
		{/if}
	</header>

	<!-- Optional Filter & Drill Controls -->
	{#if controls}
		<section
			class="controls-section"
			aria-label="Practice filters and drill customization"
		>
			{@render controls()}
		</section>
	{/if}

	<!-- Main Practice Workspace -->
	<div class="workspace-container">
		{@render children()}
	</div>
</main>

<style>
	/* ── Page layout container ─────────────────────────────── */

	.page-container {
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-width: 0;
		box-sizing: border-box;
	}

	/* ── Header section & typography ───────────────────────── */

	.header-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.page-title {
		font-size: var(--text-3xl);
		font-weight: 800;
		letter-spacing: -0.025em;
		color: var(--text-primary);
		line-height: var(--leading-tight);
	}

	.page-subtitle {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		overflow-wrap: break-word;
		word-break: normal;
	}

	/* ── Controls section wrapper ──────────────────────────── */

	.controls-section {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

	/* ── Workspace practice container ──────────────────────── */

	.workspace-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

	/* ── Narrow viewport (≤360px) container query ─────────── */

	@container (max-width: 360px) {
		.page-container {
			padding: 1rem 0.5rem;
			gap: 1rem;
		}

		.page-title {
			font-size: var(--text-2xl);
		}
	}

	/* ── Mobile media query (≤480px) ───────────────────────── */

	@media (max-width: 480px) {
		.page-container {
			padding: 1.25rem 0.75rem;
			gap: 1rem;
		}

		.page-title {
			font-size: var(--text-2xl);
		}
	}
</style>
