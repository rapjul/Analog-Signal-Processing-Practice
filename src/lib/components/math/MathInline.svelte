<script lang="ts">
	/**
	 * MathInline Svelte 5 Component.
	 * Renders inline-mode LaTeX math using KaTeX.
	 */
	import katex from "katex";

	interface Props {
		/** LaTeX expression to render */
		math: string;
		/** Optional additional CSS class */
		class?: string;
		/** Optional flag to force KaTeX display style sizing for inline math */
		displayStyle?: boolean;
	}

	let {
		math = "",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		class: className = "",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		displayStyle = false,
	}: Props = $props();

	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	let copied = $state(false);
	let copyDismissed = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Copies LaTeX expression to system clipboard and triggers visual feedback.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleCopy(): void {
		if (!math) return;
		navigator.clipboard.writeText(math).then(() => {
			copied = true;
			copyDismissed = false;
			if (timeoutId) clearTimeout(timeoutId);

			timeoutId = setTimeout(() => {
				copyDismissed = true;
			}, 1500);
		});
	}

	/**
	 * Resets copied state when fade-out opacity transition completes.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleTransitionEnd(event: TransitionEvent): void {
		if (event.propertyName === "opacity" && copyDismissed) {
			copied = false;
		}
	}

	/**
	 * Resets copyDismissed state when mouse leaves component.
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function handleMouseLeave(): void {
		copyDismissed = false;
	}

	/**
	 * Renders LaTeX inline expression synchronously using KaTeX.
	 * @param {string} expr LaTeX expression
	 * @param {boolean} [useDisplayStyle] Whether to force displayStyle formatting
	 * @returns {string} Rendered HTML string
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function renderInlineMath(
		expr: string,
		useDisplayStyle: boolean = false,
	): string {
		try {
			const formattedExpr = useDisplayStyle
				? `\\displaystyle ${expr || ""}`
				: expr || "";
			return katex.renderToString(formattedExpr, {
				displayMode: false,
				throwOnError: false,
			});
		} catch {
			return `<span class="katex-error">${expr}</span>`;
		}
	}
</script>

<button
	type="button"
	class="math-inline {className} {copied ? 'copied' : ''} {copyDismissed
		? 'dismissed'
		: ''}"
	onclick={handleCopy}
	onmouseleave={handleMouseLeave}
	aria-label={copied ? "Copied LaTeX code" : "Click to copy LaTeX code"}
>
	{@html renderInlineMath(math, displayStyle)}
	<span
		class="copy-badge {copied ? 'copied-state' : ''}"
		ontransitionend={handleTransitionEnd}
	>
		{copied ? "Copied!" : "Copy LaTeX"}
	</span>
</button>

<style>
	.math-inline {
		display: inline-block;
		vertical-align: baseline;
		font-size: inherit;
		background: transparent;
		border: none;
		padding: 0 0.15rem;
		margin: 0;
		font-family: inherit;
		color: inherit;
		cursor: pointer;
		border-radius: var(--radius-sm, 4px);
		transition:
			background-color 0.15s ease,
			box-shadow 0.15s ease;
		position: relative;
		z-index: 1;
	}

	.math-inline:hover,
	.math-inline:focus-within {
		background-color: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
		z-index: 50;
	}

	.math-inline:focus-visible {
		outline: 2px solid var(--accent-primary, #6366f1);
		outline-offset: 1px;
	}

	.copy-badge {
		display: none;
		position: absolute;
		top: -2.2em;
		left: 50%;
		transform: translateX(-50%) scale(0.92);
		font-size: 0.72rem;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		white-space: nowrap;
		pointer-events: none;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
		z-index: 100;
		background-color: var(--bg-card, #1e293b);
		color: var(--text-primary, #f8fafc);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
		transition:
			transform 0.15s ease,
			background-color 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease,
			padding 0.15s ease;
	}

	.math-inline:hover:not(.dismissed) .copy-badge,
	.math-inline:focus-visible:not(.dismissed) .copy-badge {
		display: block;
		transform: translateX(-50%) scale(1);
	}

	.math-inline:not(.dismissed) .copy-badge.copied-state {
		display: block;
		transform: translateX(-50%) scale(1);
		background-color: var(--accent-primary, #6366f1);
		color: #111111;
		border-color: var(--accent-primary, #6366f1);
		padding: 0.1rem 0.55rem;
	}
</style>
