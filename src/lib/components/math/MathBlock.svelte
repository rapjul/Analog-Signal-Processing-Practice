<script lang="ts">
	/**
	 * MathBlock Svelte 5 Component.
	 *
	 * Renders display-mode LaTeX math using KaTeX.
	 */
	import katex from "katex";

	interface Props {
		/** LaTeX expression to render */
		math: string;
		/** Whether to wrap the LaTeX expression in an aligned environment */
		aligned?: boolean;
		/** Whether to wrap the LaTeX expression in a cases environment */
		cases?: boolean;
		/** Matrix environment type: "bmatrix" | "pmatrix" | "matrix" */
		matrix?: "bmatrix" | "pmatrix" | "matrix";
		/** Whether to wrap the LaTeX expression in a gathered environment */
		gathered?: boolean;
		/** Whether to apply compact padding and responsive font sizing for narrow containers */
		compact?: boolean;
		/** Whether to apply responsive line breaks/wrapping */
		responsive?: boolean;
		/** Whether to hide the LaTeX copy button and header bar */
		hideHeader?: boolean;
		/** Optional additional CSS class */
		class?: string;
	}

	let {
		math = "",
		aligned = false,
		cases = false,
		matrix,
		gathered = false,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		compact = false,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		responsive = false,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		hideHeader = false,
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		class: className = "",
	}: Props = $props();

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let copied = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Formats raw math input by wrapping it in requested environment if not already present.
	 * @param {string} rawMath Raw LaTeX input
	 * @returns {string} Formatted LaTeX string with proper environment wrappers
	 */
	function getFormattedMath(rawMath: string): string {
		let trimmed = (rawMath || "").trim();
		if (!trimmed) return "";

		// If user explicitly requests matrix environment and expression is not already wrapped
		if (matrix && !trimmed.startsWith(`\\begin{${matrix}}`)) {
			return `\\begin{${matrix}}\n${trimmed}\n\\end{${matrix}}`;
		}

		// If user explicitly requests cases environment and expression is not already wrapped
		if (cases && !trimmed.startsWith("\\begin{cases}")) {
			return `\\begin{cases}\n${trimmed}\n\\end{cases}`;
		}

		// If user explicitly requests aligned environment and expression is not already wrapped
		if (aligned && !trimmed.startsWith("\\begin{aligned}")) {
			return `\\begin{aligned}\n${trimmed}\n\\end{aligned}`;
		}

		// If user explicitly requests gathered environment and expression is not already wrapped
		if (gathered && !trimmed.startsWith("\\begin{gathered}")) {
			return `\\begin{gathered}\n${trimmed}\n\\end{gathered}`;
		}

		return trimmed;
	}

	// Reactive derived value for formatted math string
	let formattedMath = $derived(getFormattedMath(math));

	/**
	 * Copies processed LaTeX code to clipboard and shows brief success indication.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleCopy(): void {
		if (!formattedMath) return;
		navigator.clipboard.writeText(formattedMath).then(() => {
			copied = true;
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				copied = false;
			}, 1500);
		});
	}

	/**
	 * Renders LaTeX expression synchronously using KaTeX.
	 * @param {string} expr LaTeX expression
	 * @returns {string} Rendered HTML string
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function renderMath(expr: string): string {
		try {
			return katex.renderToString(expr || "", {
				displayMode: true,
				throwOnError: false,
			});
		} catch {
			return `<span class="katex-error">${expr}</span>`;
		}
	}
</script>

{#if formattedMath}
	<div
		class="math-block {className} {compact ? 'is-compact' : ''}"
		class:math-block-responsive={responsive}
		role="region"
		aria-label="Mathematical formula block"
	>
		{#if !hideHeader}
			<div class="math-block-header">
				<button
					type="button"
					class="copy-btn"
					onclick={handleCopy}
					aria-label="Copy LaTeX string to clipboard"
				>
					{#if copied}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><polyline points="20 6 9 17 4 12"></polyline></svg
						>
						<span>Copied!</span>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><rect
								x="9"
								y="9"
								width="13"
								height="13"
								rx="2"
								ry="2"
							></rect><path
								d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
							></path></svg
						>
						<span>LaTeX</span>
					{/if}
				</button>
			</div>
		{/if}
		<div class="math-block-content">
			{@html renderMath(formattedMath)}
		</div>
	</div>
{/if}

<style>
	.math-block {
		margin: 0.6rem 0;
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		max-width: 100%;
		min-width: 0;
		font-size: 1.1em;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
		z-index: 1;
	}

	.math-block.is-compact {
		font-size: 0.9em;
		margin: 0.35rem 0;
	}

	.math-block-header {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 0.4rem 0.65rem 0.3rem 0.65rem;
		background-color: rgba(0, 0, 0, 0.12);
		border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.05));
	}

	.math-block.is-compact .math-block-header {
		padding: 0.2rem 0.45rem 0.15rem 0.45rem;
	}

	.copy-btn {
		position: relative;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.15rem 0.45rem;
		font-size: var(--text-2xs);
		font-family: inherit;
		color: var(--text-secondary, #a1a1aa);
		background-color: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm, 4px);
		cursor: pointer;
		opacity: 1;
		transition:
			opacity 0.15s ease,
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.math-block:hover .copy-btn {
		opacity: 1;
		color: var(--text-primary, #f8fafc);
	}

	.copy-btn:focus-visible {
		opacity: 1;
		color: var(--text-primary, #f8fafc);
		outline: 2px solid var(--accent-primary, #06b6d4);
		outline-offset: 2px;
	}

	.copy-btn:hover {
		border-color: var(--border-color, rgba(255, 255, 255, 0.15));
		background-color: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
		color: var(--accent-primary, #6366f1);
	}

	.math-block-content {
		padding: 1.25rem 1.25rem 1.5rem 1.25rem;
		width: 100%;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.math-block.is-compact .math-block-content {
		padding: 0.65rem 0.65rem 0.85rem 0.65rem;
	}

	.math-block :global(.katex-display) {
		margin: 0;
		padding: 0.5rem 0.5rem 0.75rem 0.5rem;
		max-width: 100%;
		text-align: center;
	}

	.math-block.is-compact :global(.katex-display) {
		padding: 0.25rem 0.25rem 0.4rem 0.25rem;
	}

	/* Custom slim overlay scrollbar floating at the very bottom edge of the block container */
	.math-block-content::-webkit-scrollbar {
		height: 5px;
	}

	.math-block-content::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
	}

	.math-block-content::-webkit-scrollbar-thumb {
		background: var(--border-color);
		border-radius: 4px;
	}

	.math-block-content::-webkit-scrollbar-thumb:hover {
		background: var(--accent-primary);
	}
</style>
