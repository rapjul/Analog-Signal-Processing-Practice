/**
 * @file Unit tests for MathBlock.svelte component mounting, LaTeX environments, and copy interactions.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import MathBlock from "$lib/components/math/MathBlock.svelte";

describe("MathBlock.svelte Component", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders display-mode KaTeX math expression inside a region container", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "y(t) = e^{-2t} \\cos(3t) u(t)",
			},
		});

		const block = container.querySelector(".math-block");
		expect(block).toBeTruthy();
		expect(block?.getAttribute("role")).toBe("region");
		expect(block?.getAttribute("aria-label")).toBe(
			"Mathematical formula block",
		);

		const katexDisplay = container.querySelector(".katex-display");
		expect(katexDisplay).toBeTruthy();
	});

	it("wraps multi-line expressions in aligned environment when aligned prop is true", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "y_{ZI}(t) &= 2e^{-t} \\\\\ny_{ZS}(t) &= 3e^{-2t}",
				aligned: true,
			},
		});

		const copyBtn = container.querySelector("button.copy-btn");
		expect(copyBtn).toBeTruthy();
		const katex = container.querySelector(".katex-display");
		expect(katex).toBeTruthy();
	});

	it("wraps piecewise expressions in cases environment when cases prop is true", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "t & 0 \\le t < 1 \\\\\n2 - t & 1 \\le t \\le 2",
				cases: true,
			},
		});

		const katex = container.querySelector(".katex-display");
		expect(katex).toBeTruthy();
	});

	it("wraps matrix expressions in bmatrix environment when matrix prop is specified", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "1 & 2 \\\\\n3 & 4",
				matrix: "bmatrix",
			},
		});

		const katex = container.querySelector(".katex-display");
		expect(katex).toBeTruthy();
	});

	it("hides header bar when hideHeader is true", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "X(s) = \\frac{1}{s+2}",
				hideHeader: true,
			},
		});

		const header = container.querySelector(".math-block-header");
		expect(header).toBeNull();
		const copyBtn = container.querySelector("button.copy-btn");
		expect(copyBtn).toBeNull();
	});

	it("applies compact and custom class modifiers", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "H(s) = \\frac{s+1}{s^2+4}",
				compact: true,
				class: "custom-formula-class",
			},
		});

		const block = container.querySelector(".math-block");
		expect(block?.classList.contains("is-compact")).toBe(true);
		expect(block?.classList.contains("custom-formula-class")).toBe(true);
	});

	it("copies formatted LaTeX code to clipboard on button click", async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});

		const { container } = render(MathBlock, {
			props: {
				math: "c_1 e^{-t} + c_2 e^{-3t}",
			},
		});

		const copyBtn = container.querySelector("button.copy-btn");
		expect(copyBtn).toBeTruthy();

		if (copyBtn) {
			await fireEvent.click(copyBtn);
			expect(writeTextMock).toHaveBeenCalledWith(
				"c_1 e^{-t} + c_2 e^{-3t}",
			);
			expect(copyBtn.textContent).toContain("Copied!");
		}
	});

	it("renders nothing when math string is empty", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "",
			},
		});

		const block = container.querySelector(".math-block");
		expect(block).toBeNull();
	});
});
