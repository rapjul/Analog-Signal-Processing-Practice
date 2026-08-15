import katex from "katex";
import { describe, expect, it } from "vitest";

/**
 * Escapes raw HTML special characters in plain text segments.
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
 * Mirror of renderFormattedMathText logic from MathText.svelte.
 * @param {string} content Input string potentially containing LaTeX math
 * @returns {string} Safe HTML string containing rendered KaTeX elements
 */
function renderFormattedMathText(content: string): string {
	if (!content) return "";

	const parts = content.split(
		/(\$\$[\s\S]+?\$\$|\$(?:\\\$|[^$\n])+?\$|\\(?:text|mathrm|operatorname|mathbf|frac)\{[^}]*\}(?:\{[^}]*\})?|\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega|Omega|Gamma|Delta|Theta|Lambda|Sigma|Phi|Psi|int|sum|prod|pm|mp|cdot|times|infty)\b(?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?)/g,
	);

	return parts
		.map((part) => {
			if (!part) return "";

			if (part.startsWith("$$") && part.endsWith("$$") && part.length >= 4) {
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

			if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
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

describe("MathText Parser and KaTeX Compilation", () => {
	it("renders plain text without dollar signs unchanged (except HTML escaping)", () => {
		const text = "Check symmetry around the vertical axis.";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toBe("Check symmetry around the vertical axis.");
	});

	it("compiles inline LaTeX expressions enclosed in single dollar signs", () => {
		const text = "Even signals mirror across the vertical axis ($x(-t) = x(t)$).";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toContain('class="katex"');
		expect(rendered).not.toContain("$x(-t) = x(t)$");
		expect(rendered).toContain("Even signals mirror across the vertical axis (");
	});

	it("compiles multiple inline math expressions in a single sentence", () => {
		const text = "Check algebraically if $x(-t) = x(t)$ (even) or $x(-t) = -x(t)$ (odd).";
		const rendered = renderFormattedMathText(text);
		// Should have two katex blocks
		const matches = rendered.match(/class="katex"/g);
		expect(matches?.length).toBe(2);
	});

	it("escapes raw HTML inside plain text to prevent injection", () => {
		const text = "Value must be < 5 & > 2 with parameter $t = 0$.";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toContain("&lt; 5 &amp; &gt; 2");
		expect(rendered).toContain('class="katex"');
	});

	it("defensively compiles standalone un-enclosed LaTeX macros like \\text{s} or \\text{rad/s}", () => {
		const text = "Ensure units are \\text{s} and \\text{rad/s}.";
		const rendered = renderFormattedMathText(text);
		// Should compile both macros into KaTeX elements
		const matches = rendered.match(/class="katex"/g);
		expect(matches?.length).toBe(2);
		expect(rendered).toContain('<span class="mord text"><span class="mord">s</span></span>');
		expect(rendered).toContain('<span class="mord text"><span class="mord">rad/s</span></span>');
	});
});
