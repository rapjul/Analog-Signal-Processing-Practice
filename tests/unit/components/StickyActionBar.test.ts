/**
 * @file Unit DOM tests for StickyActionBar.svelte component mounting and interaction.
 */

import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import StickyActionBar from "$lib/components/ui/StickyActionBar.svelte";

describe("StickyActionBar.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders toolbar role when visible is true", () => {
		const { getByRole, container } = render(StickyActionBar, {
			props: {
				visible: true,
			},
		});

		const toolbar = getByRole("toolbar");
		expect(toolbar).toBeTruthy();
		expect(toolbar.getAttribute("aria-label")).toBe("Problem actions");
		expect(container.querySelector(".action-bar-inner")).toBeTruthy();
	});

	it("does not render element when visible is false", () => {
		const { queryByRole, container } = render(StickyActionBar, {
			props: {
				visible: false,
			},
		});

		expect(queryByRole("toolbar")).toBeNull();
		expect(container.querySelector(".sticky-action-bar")).toBeNull();
	});
});
