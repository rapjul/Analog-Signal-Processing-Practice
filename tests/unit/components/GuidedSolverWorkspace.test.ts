/** Solver-independent slot and accessible reading-order contracts. */
import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import GuidedSolverWorkspace from "$lib/components/ui/GuidedSolverWorkspace.svelte";

afterEach(cleanup);

/** @param text - Test content. @returns Safe static fixture snippet. */
function content(text: string) {
	return createRawSnippet(
		/** Creates static test content. */ () => ({
			render: /** Renders this fixture. */ () => `<p>${text}</p>`,
		}),
	);
}

describe("guided workspace", () => {
	/** Consumers may render an exercise without context or empty headings. */
	it("omits absent context sections", () => {
		const view = render(GuidedSolverWorkspace, {
			children: content("Current exercise"),
		});
		expect(view.getByText("Current exercise")).toBeTruthy();
		expect(view.queryByRole("complementary")).toBeNull();
	});
	/** DOM order remains suitable for mobile and screen readers independently of visual columns. */
	it("separates verified results and supplied identities before the exercise", () => {
		const view = render(GuidedSolverWorkspace, {
			children: content("Current exercise"),
			results: content("Accepted result"),
			identities: content("Supplied formula"),
		});
		expect(
			view.getByRole("region", { name: "Results so far" }).textContent,
		).toContain("Accepted result");
		expect(
			view.getByRole("region", { name: "Useful identity" }).textContent,
		).toContain("Supplied formula");
		expect(
			view.container.querySelector(".guided-workspace")?.firstElementChild
				?.tagName,
		).toBe("ASIDE");
	});
	/** Either supporting section can be independently supplied by another solver. */
	it("supports identity-only and results-only consumers", async () => {
		const view = render(GuidedSolverWorkspace, {
			children: content("Exercise"),
			identities: content("Identity"),
		});
		expect(
			view.queryByRole("region", { name: "Results so far" }),
		).toBeNull();
		await view.rerender({
			children: content("Exercise"),
			identities: undefined,
			results: content("Result"),
		});
		expect(
			view.queryByRole("region", { name: "Useful identity" }),
		).toBeNull();
		expect(view.getByText("Result")).toBeTruthy();
	});
});
