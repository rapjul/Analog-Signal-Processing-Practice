/**
 * @file Unit DOM tests for StepCard.svelte component mounting and interaction.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import StepCard from "$lib/components/ui/StepCard.svelte";

describe("StepCard.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders active state with badge, title, and body container", () => {
		const { container, getByText } = render(StepCard, {
			props: {
				stepNumber: 1,
				badgeText: "Step 1",
				title: "Find Characteristic Roots",
				status: "active",
			},
		});

		const card = container.querySelector(".step-card");
		expect(card).toBeTruthy();
		expect(card?.classList.contains("step-card--active")).toBe(true);
		expect(getByText("Step 1")).toBeTruthy();
		expect(getByText("Find Characteristic Roots")).toBeTruthy();
	});

	it("renders completed state with summary row and status class", () => {
		const { container, getByText } = render(StepCard, {
			props: {
				stepNumber: 2,
				title: "Zero-Input Response",
				status: "completed",
				summaryLatex: "y_{zi}(t) = 3e^{-2t}",
			},
		});

		const card = container.querySelector(".step-card");
		expect(card?.classList.contains("step-card--completed")).toBe(true);
		expect(container.querySelector(".step-summary")).toBeTruthy();
		expect(getByText("✓")).toBeTruthy();
	});

	it("renders locked state with dimmed modifier class", () => {
		const { container, getByText } = render(StepCard, {
			props: {
				stepNumber: 3,
				title: "Total Response",
				status: "locked",
			},
		});

		const card = container.querySelector(".step-card");
		expect(card?.classList.contains("step-card--locked")).toBe(true);
		expect(getByText("Total Response")).toBeTruthy();
		// Body should not be rendered for locked steps
		expect(container.querySelector(".step-card-body")).toBeNull();
	});
});
