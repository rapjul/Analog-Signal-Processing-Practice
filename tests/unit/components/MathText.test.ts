/**
 * @file Unit tests for MathText.svelte component mounting, delimiter parsing, and safe HTML rendering.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import MathText from "$lib/components/math/MathText.svelte";

describe("MathText.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders plain text without math delimiters", () => {
		const { container } = render(MathText, {
			props: {
				text: "Find the homogeneous response of the system.",
			},
		});

		const span = container.querySelector("span.math-text");
		expect(span).toBeTruthy();
		expect(span?.textContent).toBe(
			"Find the homogeneous response of the system.",
		);
	});

	it("parses and renders inline $...$ LaTeX math with KaTeX", () => {
		const { container } = render(MathText, {
			props: {
				text: "Given the differential equation with roots $\\lambda_1 = -1$ and $\\lambda_2 = -3$.",
			},
		});

		const katexElements = container.querySelectorAll(".katex");
		expect(katexElements.length).toBe(2);
		expect(container.textContent).toContain(
			"Given the differential equation with roots",
		);
	});

	it("parses and renders display $$...$$ LaTeX math blocks with KaTeX", () => {
		const { container } = render(MathText, {
			props: {
				text: "The final total response is:\n$$y(t) = 2e^{-t} + 3e^{-2t}$$",
			},
		});

		const katexDisplay = container.querySelector(".katex-display");
		expect(katexDisplay).toBeTruthy();
		expect(container.textContent).toContain("The final total response is:");
	});

	it("renders markdown bold, italic, inline code, and safe HTML tags", () => {
		const { container } = render(MathText, {
			props: {
				text: "This is **bold**, *italic*, and `code` with a <strong>safe tag</strong>.",
			},
		});

		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("italic");
		expect(container.querySelector("code")?.textContent).toBe("code");
		// Check that the safe tag was preserved
		const strongs = container.querySelectorAll("strong");
		expect(strongs.length).toBe(2);
	});

	it("escapes unsafe HTML characters to prevent XSS", () => {
		const { container } = render(MathText, {
			props: {
				text: '<script>alert("xss")</script> & <img src=x onerror=alert(1)>',
			},
		});

		expect(container.querySelector("script")).toBeNull();
		expect(container.querySelector("img")).toBeNull();
		expect(container.innerHTML).toContain("&amp;");
	});

	it("defensively renders standalone un-enclosed LaTeX macros", () => {
		const { container } = render(MathText, {
			props: {
				text: "The angular frequency is \\omega_0 rad/s.",
			},
		});

		const katexElement = container.querySelector(".katex");
		expect(katexElement).toBeTruthy();
	});

	it("applies optional custom class names to wrapper span", () => {
		const { container } = render(MathText, {
			props: {
				text: "Sample text $t \\ge 0$",
				class: "custom-text-wrapper",
			},
		});

		const span = container.querySelector("span.math-text");
		expect(span?.classList.contains("custom-text-wrapper")).toBe(true);
	});
});
