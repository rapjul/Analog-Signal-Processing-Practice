import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import WorkedSolution from "$lib/components/ui/WorkedSolution.svelte";

/** Static content used to detect premature mounting of worked answers. */
const children = createRawSnippet(() => ({
	render: () => "<p>Private worked answer</p>",
}));

afterEach(cleanup);

describe("explicit worked-solution access", () => {
	/** Initial disclosure must omit the answer from the document. */
	it("mounts no answer before verification or an explicit opening", () => {
		const { container } = render(WorkedSolution, { props: { children } });
		expect(container.textContent).not.toContain("Private worked answer");
		expect(container.querySelector("summary")?.textContent).toContain(
			"assisted",
		);
	});
	/** Deliberate native opening must record assistance without granting correctness. */
	it("marks revealed practice assisted even after subsequent verification", async () => {
		const view = render(WorkedSolution, { props: { children } });
		const details = view.container.querySelector("details");
		if (!details) throw new Error("Disclosure is missing");
		details.open = true;
		await fireEvent(details, new Event("toggle"));
		expect(view.container.textContent).toContain("Private worked answer");
		expect(view.container.textContent).toContain("Assisted practice");
		await view.rerender({ verified: true, children });
		expect(view.container.textContent).toContain("Assisted practice");
	});
	/** Independent success enables review without retroactively recording assistance. */
	it("allows verified solution review without an assisted label", async () => {
		const { container } = render(WorkedSolution, {
			props: { children, verified: true },
		});
		const details = container.querySelector("details");
		if (!details) throw new Error("Disclosure is missing");
		details.open = true;
		await fireEvent(details, new Event("toggle"));
		expect(container.textContent).toContain("Private worked answer");
		expect(container.textContent).not.toContain("Assisted practice");
	});
});
