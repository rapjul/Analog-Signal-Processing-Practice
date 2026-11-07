/**
 * @file Unit tests for MathInline.svelte component mounting, clipboard interactions, and KaTeX rendering.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import katex from "katex";
import { afterEach, describe, expect, it, vi } from "vitest";
import MathInline from "$lib/components/math/MathInline.svelte";

describe("MathInline.svelte Component", () => {
	/** Clipboard rejection remains recoverable and is announced. */
	it("announces clipboard failures without hiding mathematics", async () => {
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockRejectedValue(new Error("Denied")),
			},
		});
		const view = render(MathInline, { math: "x", copyText: "x" });
		const button = view.getByRole("button");
		const status = view.getByRole("status");
		await fireEvent.click(button);
		const firstMessage = status.firstElementChild;
		expect(firstMessage?.textContent).toContain("Copy unavailable");
		await fireEvent.click(button);
		expect(view.getByRole("status")).toBe(status);
		expect(status.firstElementChild).not.toBe(firstMessage);
		expect(status.textContent).toContain("Copy unavailable");
		expect(view.container.querySelector("math")).toBeTruthy();
	});

	/** The standalone copy control copies raw LaTeX and reports success. */
	it("copies raw LaTeX when explicitly enabled", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		const math = String.raw`\frac{1}{2}`;
		const view = render(MathInline, { math, copyLatex: true });
		await fireEvent.click(view.getByRole("button", { name: "Copy LaTeX" }));
		expect(writeText).toHaveBeenCalledWith(math);
		expect(view.getByRole("status").textContent).toContain(
			"Copied LaTeX code",
		);
	});
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
				view.getByRole("button", {
					name: `Copy input notation: ${copyText}`,
				}),
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
				math: String.raw`\omega_0 t + \phi`,
			},
		});

		const btn = container.querySelector("span.math-inline");
		expect(btn).toBeTruthy();
		expect(container.querySelector("button")).toBeNull();
		expect(container.querySelector("math")).toBeTruthy();

		// KaTeX outputs math in a .katex element
		const katexElement = container.querySelector(".katex");
		expect(katexElement).toBeTruthy();
	});

	it("supports displayStyle formatting option", () => {
		const { container } = render(MathInline, {
			props: {
				math: String.raw`\frac{1}{2}`,
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
				copyText: "e^{-2t}",
			},
		});

		const btn = container.querySelector(
			"button.math-inline",
		) as HTMLButtonElement;
		expect(btn).toBeTruthy();

		// Trigger click to copy
		await fireEvent.click(btn);
		expect(writeTextMock).toHaveBeenCalledWith("e^{-2t}");
		expect(btn.getAttribute("aria-label")).toBe(
			"Copy input notation: e^{-2t}",
		);

		const badge = container.querySelector(".copy-badge");
		expect(badge?.classList.contains("copied-state")).toBe(true);

		// Advance timer to trigger copyDismissed state
		vi.advanceTimersByTime(1500);

		// Feedback resets even when reduced motion suppresses transition events.
		await vi.advanceTimersByTimeAsync(0);
		expect(
			container.querySelector('[role="status"]')?.textContent.trim(),
		).toBe("");
		await fireEvent.click(btn);
		expect(
			container.querySelector('[role="status"]')?.textContent,
		).toContain("Copied input notation");

		// Trigger mouseleave to reset copyDismissed state
		await fireEvent.mouseLeave(btn);
		expect(btn.classList.contains("dismissed")).toBe(false);
	});

	/** Unmounting cancels a pending copy feedback reset. */
	it("clears its feedback timer on unmount", async () => {
		vi.useFakeTimers();
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
		const view = render(MathInline, { math: "x", copyText: "x" });
		await fireEvent.click(view.getByRole("button"));
		expect(vi.getTimerCount()).toBe(1);
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
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
				copyText: "",
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
				math: String.raw`e^{-\sigma t}`,
				class: "custom-math-class",
			},
		});

		const btn = container.querySelector("span.math-inline");
		expect(btn?.classList.contains("custom-math-class")).toBe(true);
		expect(btn?.getAttribute("aria-label")).toBeNull();
		expect(container.querySelector("button")).toBeNull();
	});
});
