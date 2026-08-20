/**
 * @file Unit DOM tests for PartProgressPill.svelte component mounting and interaction.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import PartProgressPill from "$lib/components/ui/PartProgressPill.svelte";

describe("PartProgressPill.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders with custom label prop", () => {
		const { getByText, container } = render(PartProgressPill, {
			props: {
				label: "Sub-step A",
			},
		});

		expect(getByText("Sub-step A")).toBeTruthy();
		expect(container.querySelector(".part-progress-pill")).toBeTruthy();
	});

	it("renders formatted label from current and total props", () => {
		const { getByText } = render(PartProgressPill, {
			props: {
				current: 2,
				total: 5,
			},
		});

		expect(getByText("Part 2 of 5")).toBeTruthy();
	});

	it("renders formatted label from progress object", () => {
		const { getByText } = render(PartProgressPill, {
			props: {
				progress: {
					current: 1,
					total: 3,
					label: "Part 1 of 3 (Roots)",
				},
			},
		});

		expect(getByText("Part 1 of 3 (Roots)")).toBeTruthy();
	});

	it("does not render element when no label or progress is supplied", () => {
		const { container } = render(PartProgressPill, {
			props: {},
		});

		expect(container.querySelector(".part-progress-pill")).toBeNull();
	});
});
