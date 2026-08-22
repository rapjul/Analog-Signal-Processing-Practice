/**
 * @file Unit DOM tests for SubStepBlock.svelte component mounting, branch coverage, and states.
 */

import { cleanup, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import SubStepBlock from "$lib/components/ui/SubStepBlock.svelte";

describe("SubStepBlock.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders active state with badge, title, and children content", () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<button class="test-btn">Select Option</button>',
		}));

		const { container, getByText } = render(SubStepBlock, {
			props: {
				badge: "Part 2A",
				title: "Classify Origin Parity",
				isCompleted: false,
				children: childSnippet,
			},
		});

		const block = container.querySelector(".subpart-block");
		expect(block).toBeTruthy();
		expect(block?.classList.contains("subpart-done")).toBe(false);

		const badge = container.querySelector(".subpart-badge");
		expect(badge).toBeTruthy();
		expect(badge?.textContent).toBe("Part 2A");

		const title = container.querySelector(".subpart-title");
		expect(title).toBeTruthy();
		expect(getByText("Classify Origin Parity")).toBeTruthy();

		// Checkmark badge should NOT be present when isCompleted is false
		expect(container.querySelector(".substep-check-badge")).toBeNull();

		// Child content should be rendered
		expect(container.querySelector(".test-btn")).toBeTruthy();
	});

	it("renders verified completed state with checkmark and summary snippet", () => {
		const summarySnippet = createRawSnippet(() => ({
			render: () =>
				'<div class="verified-summary">Even Parity Confirmed</div>',
		}));
		const activeSnippet = createRawSnippet(() => ({
			render: () => '<div class="active-content">Active Selector</div>',
		}));

		const { container, getByText } = render(SubStepBlock, {
			props: {
				badge: "Part 2B",
				title: "Half-Wave Symmetry",
				isCompleted: true,
				summarySnippet,
				activeSnippet,
			},
		});

		const block = container.querySelector(".subpart-block");
		expect(block?.classList.contains("subpart-done")).toBe(true);

		const checkBadge = container.querySelector(".substep-check-badge");
		expect(checkBadge).toBeTruthy();
		expect(checkBadge?.textContent).toContain("✓");
		expect(checkBadge?.textContent).toContain("Verified");

		// Summary snippet should be rendered instead of active snippet
		expect(container.querySelector(".verified-summary")).toBeTruthy();
		expect(getByText("Even Parity Confirmed")).toBeTruthy();
		expect(container.querySelector(".active-content")).toBeNull();
	});

	it("falls back gracefully to children when isCompleted is true but summarySnippet is omitted", () => {
		const childSnippet = createRawSnippet(() => ({
			render: () =>
				'<div class="fallback-content">Fallback Content</div>',
		}));

		const { container } = render(SubStepBlock, {
			props: {
				badge: "Part 1",
				title: "Initial Check",
				isCompleted: true,
				children: childSnippet,
			},
		});

		expect(container.querySelector(".subpart-done")).toBeTruthy();
		expect(container.querySelector(".substep-check-badge")).toBeTruthy();
		expect(container.querySelector(".fallback-content")).toBeTruthy();
	});

	it("renders custom titleSnippet when provided instead of default title", () => {
		const titleSnippet = createRawSnippet(() => ({
			render: () => '<h3 class="custom-title">Custom Title Heading</h3>',
		}));

		const { container } = render(SubStepBlock, {
			props: {
				badge: "Part 3",
				titleSnippet,
			},
		});

		expect(container.querySelector(".custom-title")).toBeTruthy();
		expect(container.querySelector(".subpart-title")).toBeNull();
	});

	it("omits badge and title elements when not provided", () => {
		const childSnippet = createRawSnippet(() => ({
			render: () => '<div class="content-only">Just Content</div>',
		}));

		const { container } = render(SubStepBlock, {
			props: {
				children: childSnippet,
			},
		});

		expect(container.querySelector(".subpart-badge")).toBeNull();
		expect(container.querySelector(".subpart-title")).toBeNull();
		expect(container.querySelector(".subpart-header")).toBeNull();
		expect(container.querySelector(".content-only")).toBeTruthy();
	});

	it("applies custom CSS class names to the root subpart-block container", () => {
		const { container } = render(SubStepBlock, {
			props: {
				badge: "Part A",
				class: "custom-modifier-class",
			},
		});

		const block = container.querySelector(".subpart-block");
		expect(block?.classList.contains("custom-modifier-class")).toBe(true);
	});
});
