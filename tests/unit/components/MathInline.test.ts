/**
 * @file Unit tests for MathInline.svelte component mounting, clipboard interactions, and KaTeX rendering.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import katex from "katex";
import { afterEach, describe, expect, it, vi } from "vitest";
import MathInline from "$lib/components/math/MathInline.svelte";

describe("MathInline.svelte Component", () => {
	for (const [copyText, math] of [
		["e^(-j*omega)", String.raw`\texttt{e\textasciicircum(-j*omega)}`],
		["e^{-j*omega}", String.raw`\texttt{e\textasciicircum\{-j*omega\}}`],
	]) {
		/** Literal notation is displayed and copied without its presentation wrapper. */
		it(`copies literal input ${copyText}`, async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			Object.assign(navigator, { clipboard: { writeText } });
			const view = render(MathInline, {
				math: math!,
				copyText: copyText!,
			});
			expect(
				view.container.querySelector(".katex-html")?.textContent,
			).toBe(copyText);
			expect(view.container.querySelector(".katex-error")).toBeNull();
			await fireEvent.click(
				view.getByRole("button", {
					name: `Copy input notation: ${copyText}`,
				}),
			);
			expect(writeText).toHaveBeenCalledWith(copyText);
			expect(
				view.getByRole("button", { name: "Copied input notation" }),
			).toBeTruthy();
		});
	}
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
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

	it("supports displayStyle formatting option", () => {
		const { container } = render(MathInline, {
			props: {
				math: "\\frac{1}{2}",
				displayStyle: true,
			},
		});

		const katexElement = container.querySelector(".katex");
		expect(katexElement).toBeTruthy();
	});

	it("renders fallback span when KaTeX throws an error", () => {
		vi.spyOn(katex, "renderToString").mockImplementationOnce(() => {
			throw new Error("KaTeX error");
		});

		const { container } = render(MathInline, {
			props: {
				math: "\\broken{math}",
			},
		});

		const errorSpan = container.querySelector(".katex-error");
		expect(errorSpan).toBeTruthy();
		expect(errorSpan?.textContent).toBe("\\broken{math}");
	});

	/** Inline fallback source remains literal even when rendering fails unexpectedly. */
	it("escapes markup when the inline renderer throws", () => {
		vi.spyOn(katex, "renderToString").mockImplementationOnce(() => {
			throw new RangeError("Maximum call stack size exceeded");
		});
		const source = '<img src=x onerror="alert(1)">&\'text';
		const { container } = render(MathInline, { props: { math: source } });
		expect(container.querySelector(".katex-error")?.textContent).toBe(
			source,
		);
		expect(container.querySelector("img, script, svg")).toBeNull();
	});

	it("handles clipboard copying, dismiss timers, and mouse leave transitions", async () => {
		vi.useFakeTimers();
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});

		const { container } = render(MathInline, {
			props: {
				math: "e^{-2t}",
			},
		});

		const btn = container.querySelector(
			"button.math-inline",
		) as HTMLButtonElement;
		expect(btn).toBeTruthy();

		// Trigger click to copy
		await fireEvent.click(btn);
		expect(writeTextMock).toHaveBeenCalledWith("e^{-2t}");
		expect(btn.getAttribute("aria-label")).toBe("Copied LaTeX code");

		const badge = container.querySelector(".copy-badge");
		expect(badge?.classList.contains("copied-state")).toBe(true);

		// Advance timer to trigger copyDismissed state
		vi.advanceTimersByTime(1500);

		// Trigger transitionend to reset copied state
		if (badge) {
			fireEvent(
				badge,
				new TransitionEvent("transitionend", {
					propertyName: "opacity",
				}),
			);
		}

		// Trigger mouseleave to reset copyDismissed state
		await fireEvent.mouseLeave(btn);
		expect(btn.classList.contains("dismissed")).toBe(false);
	});

	it("does not invoke clipboard copy when math prop is empty", async () => {
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});

		const { container } = render(MathInline, {
			props: {
				math: "",
			},
		});

		const btn = container.querySelector(
			"button.math-inline",
		) as HTMLButtonElement;
		expect(btn).toBeTruthy();

		await fireEvent.click(btn);
		expect(writeTextMock).not.toHaveBeenCalled();
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
