import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import StepReveal from "$lib/components/ui/StepReveal.svelte";

const sampleSteps = [
	{
		title: "Characteristic Equation",
		latex: "s^2+5s+6=0",
		description: "Set $Q(s)=0$.",
	},
	{
		title: "Factored Roots",
		latex: "(s+2)(s+3)=0",
		description: "Find both roots.",
	},
	{
		title: "Natural Form",
		latex: "y_n(t)=c_1e^{-2t}+c_2e^{-3t}",
		description: "Combine the modes.",
	},
];

describe("StepReveal", () => {
	afterEach(() => cleanup());

	it("uses a native details element that is closed by default", () => {
		const view = render(StepReveal, { steps: sampleSteps });
		const details = view.container.querySelector("details");
		expect(details).toBeTruthy();
		expect(details?.open).toBe(false);
		expect(view.getByText("Solution Breakdown (3 steps)")).toBeTruthy();
	});

	it("places the complete solution in the disclosure immediately", () => {
		const view = render(StepReveal, { steps: sampleSteps });
		expect(
			view.container.querySelectorAll(".steps-list .step-card"),
		).toHaveLength(3);
		expect(view.getByText("Step 1: Characteristic Equation")).toBeTruthy();
		expect(view.getByText("Step 3: Natural Form")).toBeTruthy();
		expect(
			view.container.querySelectorAll(".btn-step, .btn-step-secondary"),
		).toHaveLength(0);
	});

	it("can be opened and closed freely with the native summary", async () => {
		const view = render(StepReveal, { steps: sampleSteps });
		const details = view.container.querySelector("details");
		const summary = view.container.querySelector("summary");
		if (!details || !summary)
			throw new Error("Expected disclosure controls.");
		await fireEvent.click(summary);
		expect(details.open).toBe(true);
		await fireEvent.click(summary);
		expect(details.open).toBe(false);
	});

	it("renders sparse prose-only and math-only steps without mixed raw LaTeX", () => {
		const view = render(StepReveal, {
			steps: [
				{ title: "Pure Text", description: "Only prose.", latex: "" },
				{
					title: "Pure Math",
					description: "",
					latex: "x(t)=e^{-t}u(t)",
					responsive: true,
				},
			],
		});
		expect(view.getByText("Only prose.")).toBeTruthy();
		expect(view.container.querySelectorAll(".math-block")).toHaveLength(1);
		expect(view.container.querySelector(".katex")).toBeTruthy();
	});
});
