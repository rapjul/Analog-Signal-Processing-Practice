/**
 * @file Unit tests for StepBreadcrumb.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import StepBreadcrumb from "$lib/components/ui/StepBreadcrumb.svelte";

describe("StepBreadcrumb.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});
	const sampleSteps = [
		{ number: 1, title: "Characteristic Roots", shortTitle: "Roots" },
		{ number: 2, title: "Natural Response", shortTitle: "$y_h(t)$" },
		{ number: 3, title: "Particular Response", shortTitle: "$y_p(t)$" },
		{ number: 4, title: "Initial Conditions", shortTitle: "Constants" },
	];

	it("renders all step items and marks active step with aria-current", () => {
		const { container } = render(StepBreadcrumb, {
			props: {
				steps: sampleSteps,
				currentStep: 2,
				totalSteps: 4,
			},
		});

		const nav = container.querySelector("nav.step-breadcrumb");
		expect(nav).toBeTruthy();

		// Step 1 should be completed
		const step1 = container.querySelector("#step-crumb-1");
		expect(step1?.classList.contains("crumb-pill--completed")).toBe(true);

		// Step 2 should be active with aria-current="step"
		const step2 = container.querySelector("#step-crumb-2");
		expect(step2?.classList.contains("crumb-pill--active")).toBe(true);
		expect(step2?.getAttribute("aria-current")).toBe("step");

		// Step 3 & 4 should be locked
		const step3 = container.querySelector("#step-crumb-3");
		expect(step3?.classList.contains("crumb-pill--locked")).toBe(true);
	});

	it("calls onSelectStep callback when a completed step button is clicked", async () => {
		const handleSelect = vi.fn();
		const { container } = render(StepBreadcrumb, {
			props: {
				steps: sampleSteps,
				currentStep: 3,
				totalSteps: 4,
				onSelectStep: handleSelect,
			},
		});

		// Step 1 is completed and should be rendered as an interactive button
		const step1Button = container.querySelector("button#step-crumb-1");
		expect(step1Button).toBeTruthy();

		if (step1Button) {
			await fireEvent.click(step1Button);
			expect(handleSelect).toHaveBeenCalledWith(1);
		}
	});

	it("renders locked steps as non-interactive elements", () => {
		const handleSelect = vi.fn();
		const { container } = render(StepBreadcrumb, {
			props: {
				steps: sampleSteps,
				currentStep: 1,
				totalSteps: 4,
				onSelectStep: handleSelect,
			},
		});

		// Step 4 is locked and should NOT be a button
		const step4 = container.querySelector("#step-crumb-4");
		expect(step4?.tagName.toLowerCase()).toBe("div");
		expect(step4?.classList.contains("crumb-pill--locked")).toBe(true);
	});
});
