<script lang="ts">
	/**
	 * MathInline Svelte 5 Component.
	 * Renders inline-mode LaTeX math using KaTeX.
	 */
	import katex from "katex";
	import { onDestroy } from "svelte";
	import { renderMathError } from "./math-error";

	interface Props {
		/** LaTeX expression to render */
		math: string;
		/** Optional literal input notation to copy instead of its display LaTeX. */
		copyText?: string | undefined;
		/** Whether to offer a separate copy button for the LaTeX source. */
		copyLatex?: boolean | undefined;
		/** Optional additional CSS class */
		class?: string | undefined;
		/** Optional flag to force KaTeX display style sizing for inline math */
		displayStyle?: boolean | undefined;
	}

	let {
		math = "",
		copyText,
		copyLatex = false,
		class: className = "",
		displayStyle = false,
	}: Props = $props();

	let copied = $state(false);
	let copyFailures = $state(0);
	let copyButtonText = $derived(
		copyText === undefined ? "Copy LaTeX" : "Copy input",
	);
	let copyDismissed = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});

	/**
	 * Copies literal input notation or the default LaTeX source and shows feedback.
	 */
	async function handleCopy(): Promise<void> {
		if (!math) return;
		try {
			await navigator.clipboard.writeText(copyText ?? math);
			copyFailures = 0;
			copied = true;
			copyDismissed = false;
			if (timeoutId) clearTimeout(timeoutId);

			timeoutId = setTimeout(() => {
				copyDismissed = true;
				copied = false;
			}, 1500);
		} catch {
			copied = false;
			copyFailures += 1;
		}
	}

	/**
	 * Resets copyDismissed state when mouse leaves component.
	 */
	function handleMouseLeave(): void {
		copyDismissed = false;
	}

	/**
	 * Renders LaTeX inline expression synchronously using KaTeX.
	 * @param {string} expr LaTeX expression
	 * @param {boolean} [useDisplayStyle] Whether to force displayStyle formatting
	 * @returns {string} Rendered HTML string
	 */
	function renderInlineMath(
		expr: string,
		useDisplayStyle: boolean = false,
	): string {
		try {
			const formattedExpr = useDisplayStyle
				? String.raw`\displaystyle ${expr || ""}`
				: expr || "";
			return katex.renderToString(formattedExpr, {
				displayMode: false,
				throwOnError: false,
			});
		} catch {
			return renderMathError(expr);
		}
	}
</script>

<span class="math-inline {className}">
	{@html renderInlineMath(math, displayStyle)}
</span>
{#if copyText !== undefined || (copyLatex && math)}
	<button
		type="button"
		class="math-inline {className} {copied ? 'copied' : ''} {copyDismissed
			? 'dismissed'
			: ''}"
		onclick={handleCopy}
		onmouseleave={handleMouseLeave}
		aria-label={copyText === undefined
			? "Copy LaTeX"
			: `Copy input notation: ${copyText}`}
	>
		{copyButtonText}
		<span class="copy-badge {copied ? 'copied-state' : ''}">
			{copied ? "Copied!" : copyButtonText}
		</span>
	</button>
	<span
		class="sr-only"
		role="status"
	>
		{#if copyFailures}
			{#key copyFailures}
				<span
					>Copy unavailable. Select the {copyText === undefined
						? "formula"
						: "input notation"} manually.</span
				>
			{/key}
		{:else if copied}
			{copyText === undefined
				? "Copied LaTeX code"
				: "Copied input notation"}
		{/if}
	</span>
{/if}

<style>
	/* ── Inline math trigger button ────────────────────────── */

	.math-inline {
		display: inline-block;
		vertical-align: var(--math-inline-valign, 0.04em);
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

	/* ── Copy tooltip badge ────────────────────────────────── */
	span.math-inline {
		cursor: text;
	}
	span.math-inline:hover {
		background: transparent;
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

	/* Copied state — active primary accent badge */
	.math-inline:not(.dismissed) .copy-badge.copied-state {
		display: block;
		transform: translateX(-50%) scale(1);
		background-color: var(--accent-primary, #6366f1);
		color: var(--accent-contrast);
		border-color: var(--accent-primary, #6366f1);
		padding: 0.1rem 0.55rem;
	}
</style>
