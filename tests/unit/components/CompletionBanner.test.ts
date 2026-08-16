/**
 * @file Unit tests for CompletionBanner.svelte component mounting and stat display.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import CompletionBanner from "$lib/components/ui/CompletionBanner.svelte";

describe("CompletionBanner.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders title, description, and status role", () => {
		const { container } = render(CompletionBanner, {
			props: {
				title: "Differential Equation Solved!",
				description:
					"Complete 2nd-order response $y(t)$ verified accurately.",
				icon: "🌟",
			},
		});

		const banner = container.querySelector(".completion-banner");
		expect(banner).toBeTruthy();
		expect(banner?.getAttribute("role")).toBe("status");

		const icon = container.querySelector(".banner-icon");
		expect(icon?.textContent).toBe("🌟");

		const title = container.querySelector(".banner-title");
		expect(title?.textContent).toContain("Differential Equation Solved!");

		const desc = container.querySelector(".banner-description");
		expect(desc?.textContent).toContain("Complete 2nd-order response");
	});

	it("renders statistics pills when stats prop is provided", () => {
		const { container } = render(CompletionBanner, {
			props: {
				stats: [
					{ label: "Steps Completed", value: "7 / 7" },
					{ label: "Hints Used", value: 1 },
					{ label: "Accuracy", value: "100%" },
				],
			},
		});

		const statPills = container.querySelectorAll(".stat-pill");
		expect(statPills.length).toBe(3);

		const labels = Array.from(
			container.querySelectorAll(".stat-label"),
		).map((el) => el.textContent);
		const values = Array.from(
			container.querySelectorAll(".stat-value"),
		).map((el) => el.textContent);

		expect(labels).toEqual(["Steps Completed", "Hints Used", "Accuracy"]);
		expect(values).toEqual(["7 / 7", "1", "100%"]);
	});
});
