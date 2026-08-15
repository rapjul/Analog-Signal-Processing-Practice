<script lang="ts">
	/**
	 * MathText Svelte 5 Component.
	 * Parses text containing inline ($...$) and block ($$...$$) LaTeX expressions and renders them with KaTeX.
	 */
	import katex from "katex";

	interface Props {
		/** Text content containing optional LaTeX math delimiters ($...$ or $$...$$) */
		text: string;
		/** Optional additional CSS class */
		class?: string;
	}

	let {
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		text = "",
		// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
		class: className = "",
	}: Props = $props();

	/**
	 * Escapes raw HTML special characters in plain text segments to prevent markup injection.
	 * @param {string} str Plain text to escape
	 * @returns {string} Escaped HTML string
	 */
	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	/**
	 * Parses text with LaTeX delimiters and compiles math using KaTeX.
	 * Also defensively compiles standalone un-enclosed LaTeX macros (e.g. \text{...}, \frac{...}{...}, \omega_0).
	 * @param {string} content Input string potentially containing LaTeX math
	 * @returns {string} Safe HTML string containing rendered KaTeX elements
	 */
	// biome-ignore lint/correctness/noUnusedVariables: Used in the Svelte HTML template markup.
	function renderFormattedMathText(content: string): string {
		if (!content) return "";

		// Match $$...$$ (display), $...$ (inline), or standalone LaTeX commands
		const parts = content.split(
			/(\$\$[\s\S]+?\$\$|\$(?:\\\$|[^$\n])+?\$|\\(?:text|mathrm|operatorname|mathbf|frac)\{[^}]*\}(?:\{[^}]*\})?|\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega|Omega|Gamma|Delta|Theta|Lambda|Sigma|Phi|Psi|int|sum|prod|pm|mp|cdot|times|infty)\b(?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?)/g,
		);

		return parts
			.map((part) => {
				if (!part) return "";

				if (
					part.startsWith("$$") &&
					part.endsWith("$$") &&
					part.length >= 4
				) {
					const math = part.slice(2, -2).trim();
					try {
						return katex.renderToString(math, {
							displayMode: true,
							throwOnError: false,
						});
					} catch {
						return `<span class="katex-error">${escapeHtml(math)}</span>`;
					}
				}

				if (
					part.startsWith("$") &&
					part.endsWith("$") &&
					part.length >= 2
				) {
					const math = part.slice(1, -1).trim();
					try {
						return katex.renderToString(math, {
							displayMode: false,
							throwOnError: false,
						});
					} catch {
						return `<span class="katex-error">${escapeHtml(math)}</span>`;
					}
				}

				if (part.startsWith("\\")) {
					try {
						return katex.renderToString(part, {
							displayMode: false,
							throwOnError: false,
						});
					} catch {
						return `<span class="katex-error">${escapeHtml(part)}</span>`;
					}
				}

				return escapeHtml(part);
			})
			.join("");
	}
</script>

<span class="math-text {className}">
	{@html renderFormattedMathText(text)}
</span>

<style>
	.math-text {
		display: inline;
	}

	:global(.math-text .katex) {
		font-size: 1.02em;
	}
</style>
