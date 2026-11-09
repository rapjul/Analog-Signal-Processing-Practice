/** Overflow-only keyboard focus for both display-math renderers. */
import { cleanup, render } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import MathBlock from "$lib/components/math/MathBlock.svelte";
import MathText from "$lib/components/math/MathText.svelte";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/** Layout changes add or remove focusability while inline mathematics stays passive. */
it("tracks overflow, resizing, hidden content, and both rendering components", () => {
	let width = 100;
	let contentWidth = 100;
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
		() => width,
	);
	vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
		() => contentWidth,
	);
	const block = render(MathBlock, { math: "x=1" });
	const prose = render(MathText, { text: "$y$ and $$x=1$$" });
	for (const view of [block, prose])
		expect(
			view.container
				.querySelector(".katex-display")
				?.hasAttribute("tabindex"),
		).toBe(false);
	contentWidth = 200;
	window.dispatchEvent(new Event("resize"));
	for (const view of [block, prose])
		expect(
			view.container
				.querySelector(".katex-display")
				?.getAttribute("tabindex"),
		).toBe("0");
	width = 250;
	window.dispatchEvent(new Event("resize"));
	for (const view of [block, prose])
		expect(
			view.container
				.querySelector(".katex-display")
				?.hasAttribute("tabindex"),
		).toBe(false);
	width = 0;
	window.dispatchEvent(new Event("resize"));
	expect(block.container.querySelector("[tabindex]")).toBeNull();
	expect(
		prose.container
			.querySelector(".katex:not(.katex-display .katex)")
			?.hasAttribute("tabindex"),
	).toBe(false);
});
