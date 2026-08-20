/**
 * @file Unit tests for MathBlock.svelte component mounting, LaTeX environments, and copy interactions.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import katex from "katex";
import { afterEach, describe, expect, it, vi } from "vitest";
import MathBlock from "$lib/components/math/MathBlock.svelte";

describe("MathBlock.svelte Component", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
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

	it("does not doubly wrap environments if already wrapped", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "\\begin{aligned}\nx &= 1\n\\end{aligned}",
				aligned: true,
			},
		});

		const katex = container.querySelector(".katex-display");
		expect(katex).toBeTruthy();
	});

	it("supports pmatrix, matrix, and responsive formatting options", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "1 & 0 \\\\\n0 & 1",
				matrix: "pmatrix",
				responsive: true,
			},
		});

		const block = container.querySelector(".math-block");
		expect(block?.classList.contains("math-block-responsive")).toBe(true);
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

	it("wraps expressions in gathered environment when gathered prop is true", () => {
		const { container } = render(MathBlock, {
			props: {
				math: "a = b \\\\\n c = d",
				gathered: true,
			},
		});

		const katex = container.querySelector(".katex-display");
		expect(katex).toBeTruthy();
	});

	it("renders fallback span when KaTeX throws an error", () => {
		vi.spyOn(katex, "renderToString").mockImplementationOnce(() => {
			throw new Error("KaTeX error");
		});

		const { container } = render(MathBlock, {
			props: {
				math: "\\broken{math}",
			},
		});

		const errorSpan = container.querySelector(".katex-error");
		expect(errorSpan).toBeTruthy();
		expect(errorSpan?.textContent).toBe("\\broken{math}");
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

	it("copies formatted LaTeX code to clipboard on button click and resets copied state after timer", async () => {
		vi.useFakeTimers();
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

			// Advance timers and flush microtask queue to trigger copied = false reset
			await vi.advanceTimersByTimeAsync(1500);
			expect(copyBtn.textContent).toContain("LaTeX");
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
