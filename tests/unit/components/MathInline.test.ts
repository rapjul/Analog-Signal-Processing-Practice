/**
 * @file Unit tests for MathInline.svelte component mounting and interaction.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import MathInline from "$lib/components/math/MathInline.svelte";

describe("MathInline.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders rendered KaTeX HTML for inline math expressions", () => {
		const { container } = render(MathInline, {
			props: {
				math: "\\omega_0 t + \\phi",
			},
		});

		const btn = container.querySelector("button.math-inline");
		expect(btn).toBeTruthy();

		// KaTeX outputs math in a .katex element
		const katexElement = container.querySelector(".katex");
		expect(katexElement).toBeTruthy();
	});

	it("renders fallback text gracefully on malformed LaTeX strings", () => {
		const { container } = render(MathInline, {
			props: {
				math: "\\frac{incomplete",
			},
		});

		const btn = container.querySelector("button.math-inline");
		expect(btn).toBeTruthy();
		// Should still render without throwing
		expect(container.textContent).toContain("incomplete");
	});

	it("applies optional custom class names and default copy accessibility attributes", () => {
		const { container } = render(MathInline, {
			props: {
				math: "e^{-\\sigma t}",
				class: "custom-math-class",
			},
		});

		const btn = container.querySelector("button.math-inline");
		expect(btn?.classList.contains("custom-math-class")).toBe(true);
		expect(btn?.getAttribute("aria-label")).toBe(
			"Click to copy LaTeX code",
		);
	});
});
