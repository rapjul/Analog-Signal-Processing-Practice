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
 * Safe HTML tags permitted in MathText prose segments.
 */
const SAFE_TAGS_PATTERN =
	/<\/?(?:strong|em|b|i|code|br|hr|mark|u|kbd|del|s)(?:\s+[^>]*)?\/?>/gi;

/**
 * Formats non-math text segments by escaping unsafe HTML characters while preserving
 * safe HTML tags and translating Markdown bold, italic, and inline code formatting.
 * @param {string} str Raw plain text segment
 * @returns {string} Sanitized and formatted HTML string
 */
function formatTextSegment(str: string): string {
	if (!str) return "";

	// Tokenize safe HTML tags to protect them from character escaping
	const tokens: string[] = [];
	const tokenized = str.replace(SAFE_TAGS_PATTERN, (match) => {
		tokens.push(match);
		return `@@SAFE_TAG_${tokens.length - 1}@@`;
	});

	// Escape raw HTML characters to prevent XSS / markup injection
	let escaped = tokenized
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

	// Convert Markdown syntax:
	// 1. Inline code: `code`
	escaped = escaped.replace(/`([^`\n]+)`/g, "<code>$1</code>");
	// 2. Bold: **bold** or __bold__
	escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	escaped = escaped.replace(/__([^_]+)__/g, "<strong>$1</strong>");
	// 3. Italic: *italic* or _italic_
	escaped = escaped.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
	escaped = escaped.replace(
		/(?<![a-zA-Z0-9_])_([^_ \n][^_]*?[^_ \n]|[^_ \n])_(?![a-zA-Z0-9_])/g,
		"<em>$1</em>",
	);

	// Restore safe HTML tags
	return escaped.replace(
		/@@SAFE_TAG_(\d+)@@/g,
		(_, index) => tokens[Number.parseInt(index, 10)] ?? "",
	);
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

			return formatTextSegment(part);
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
		const matches = rendered.match(/class="katex"/g);
		expect(matches?.length).toBe(2);
	});

	it("escapes unsafe raw HTML inside plain text to prevent injection", () => {
		const text = "Value must be <script>alert(1)</script> < 5 & > 2 with parameter $t = 0$.";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(rendered).toContain("&lt; 5 &amp; &gt; 2");
		expect(rendered).toContain('class="katex"');
	});

	it("preserves safe HTML tags such as <strong>, <em>, <mark>, <u>, <code>, <br>, and <hr>", () => {
		const text =
			"<strong>Initial Conditions:</strong> $y(0^-) = 3$ <mark>Note</mark> <u>important</u> <code>var</code><br>";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toContain("<strong>Initial Conditions:</strong>");
		expect(rendered).toContain("<mark>Note</mark>");
		expect(rendered).toContain("<u>important</u>");
		expect(rendered).toContain("<code>var</code>");
		expect(rendered).toContain("<br>");
		expect(rendered).toContain('class="katex"');
	});

	it("converts Markdown formatting with asterisks and underscores", () => {
		const text =
			"**Bold 1** and __Bold 2__, *Italic 1* and _Italic 2_, `code_val` with $y_0 = 1$.";
		const rendered = renderFormattedMathText(text);
		expect(rendered).toContain("<strong>Bold 1</strong>");
		expect(rendered).toContain("<strong>Bold 2</strong>");
		expect(rendered).toContain("<em>Italic 1</em>");
		expect(rendered).toContain("<em>Italic 2</em>");
		expect(rendered).toContain("<code>code_val</code>");
		expect(rendered).toContain('class="katex"');
	});

	it("defensively compiles standalone un-enclosed LaTeX macros like \\text{s} or \\text{rad/s}", () => {
		const text = "Ensure units are \\text{s} and \\text{rad/s}.";
		const rendered = renderFormattedMathText(text);
		const matches = rendered.match(/class="katex"/g);
		expect(matches?.length).toBe(2);
		expect(rendered).toContain('<span class="mord text"><span class="mord">s</span></span>');
		expect(rendered).toContain('<span class="mord text"><span class="mord">rad/s</span></span>');
	});
});
