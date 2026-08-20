/**
 * @file Unit DOM tests for StepReveal.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import StepReveal from "$lib/components/ui/StepReveal.svelte";

describe("StepReveal.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	const sampleSteps = [
		{
			title: "Characteristic Equation",
			latex: "s^2 + 5s + 6 = 0",
			description: "Set the differential operator $Q(s) = 0$.",
		},
		{
			title: "Factored Roots",
			latex: "(s + 2)(s + 3) = 0 \\implies s_1 = -2, s_2 = -3",
			description: "Roots are real and distinct.",
		},
		{
			title: "Natural Form",
			latex: "y_n(t) = c_1 e^{-2t} + c_2 e^{-3t}",
			description: "Linear combination of natural modes.",
		},
	];

	it("initially reveals the first step and shows count", () => {
		const { getByText, container } = render(StepReveal, {
			props: {
				steps: sampleSteps,
			},
		});

		expect(
			getByText("Solution Breakdown (1/3 Steps Revealed)"),
		).toBeTruthy();
		const renderedSteps = container.querySelectorAll(
			".steps-list .step-card",
		);
		expect(renderedSteps.length).toBe(1);
	});

	it("reveals next step on 'Reveal Step 2' click", async () => {
		const { getByText, container } = render(StepReveal, {
			props: {
				steps: sampleSteps,
			},
		});

		const nextBtn = getByText("Reveal Step 2");
		await fireEvent.click(nextBtn);

		expect(
			getByText("Solution Breakdown (2/3 Steps Revealed)"),
		).toBeTruthy();
		const renderedSteps = container.querySelectorAll(
			".steps-list .step-card",
		);
		expect(renderedSteps.length).toBe(2);
	});

	it("reveals all steps on 'Reveal All' click and hides control buttons", async () => {
		const { getByText, container } = render(StepReveal, {
			props: {
				steps: sampleSteps,
			},
		});

		const revealAllBtn = getByText("Reveal All");
		await fireEvent.click(revealAllBtn);

		expect(
			getByText("Solution Breakdown (3/3 Steps Revealed)"),
		).toBeTruthy();
		const renderedSteps = container.querySelectorAll(
			".steps-list .step-card",
		);
		expect(renderedSteps.length).toBe(3);

		// Buttons should no longer be rendered when all steps are revealed
		expect(container.querySelector("button.btn-step")).toBeNull();
	});

	it("renders steps with empty latex or description without crashing", () => {
		const sparseSteps = [
			{
				title: "Pure Text Step",
				latex: "",
				description: "Only a description here.",
			},
			{
				title: "Pure Math Step",
				latex: "x(t) = e^{-t} u(t)",
				description: "",
				aligned: true,
				cases: true,
			},
		];

		const { getByText, container } = render(StepReveal, {
			props: {
				steps: sparseSteps,
			},
		});

		expect(getByText("Step 1: Pure Text Step")).toBeTruthy();
		expect(getByText("Only a description here.")).toBeTruthy();
		expect(container.querySelector(".math-block")).toBeNull();
	});
});
