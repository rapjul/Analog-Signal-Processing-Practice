import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceCompletion from "$lib/components/canvas/LaplaceCompletion.svelte";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";

describe("signed completion distributions", () => {
	afterEach(() => cleanup());
	/** Checks SVG direction, exact accessible weight, and honest constant-zero information. */
	it("draws negative impulses below the axis with their exact weight", () => {
		const problem = createLaplaceExercise({
			workflow: "inverse",
			seed: 73,
			system: true,
			rational: {
				gain: "-1",
				zeros: [],
				poles: [],
				delay: "0",
				region: -1,
			},
		});
		const view = render(LaplaceCompletion, { problem });
		const impulse =
			view.container.querySelector("path title")!.parentElement!;
		expect(impulse.getAttribute("d")).toContain(",138");
		expect(impulse.textContent).toContain("impulse weight -1");
		expect(view.getByText(/No finite zeros/)).toBeTruthy();
		expect(view.container.querySelector(".katex-error")).toBeNull();
	});
});
