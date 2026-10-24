/** Safe fallback presentation shared by the mathematical renderers. */

/**
 * Render failed mathematical input as literal text, never executable markup.
 * @param source - Original mathematical source that KaTeX could not render.
 * @returns An HTML error span containing only escaped source text.
 */
export function renderMathError(source: string): string {
	const escaped = source
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
	return `<span class="katex-error">${escaped}</span>`;
}
