/**
 * @file Unit tests for HintDisclosure.svelte component mounting and interaction.
 */

import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import HintDisclosure from "$lib/components/ui/HintDisclosure.svelte";

describe("HintDisclosure.svelte Component", () => {
	afterEach(() => {
		cleanup();
	});
	const sampleHints = [
		"First find the characteristic roots $\\lambda_1, \\lambda_2$.",
		"Set up the homogeneous solution form $y_h(t) = c_1 e^{\\lambda_1 t} + c_2 e^{\\lambda_2 t}$.",
		"Substitute initial conditions $y(0)$ and $y'(0)$ to solve for $c_1$ and $c_2$.",
	];

	it("renders trigger button in initial unrevealed state", () => {
		const handleReveal = vi.fn();
		const { container } = render(HintDisclosure, {
			props: {
				hints: sampleHints,
				hintTier: 0,
				onRevealNextHint: handleReveal,
			},
		});

		const btn = container.querySelector("#hint-toggle-btn");
		expect(btn).toBeTruthy();
		expect(btn?.textContent).toContain("Get Hint");
		expect(btn?.getAttribute("aria-expanded")).toBe("false");

		// Content region should not be rendered yet
		const region = container.querySelector("#hint-content-region");
		expect(region).toBeNull();
	});

	it("renders revealed hints progressively and shows tier badge", () => {
		const handleReveal = vi.fn();
		const { container } = render(HintDisclosure, {
			props: {
				hints: sampleHints,
				hintTier: 2,
				onRevealNextHint: handleReveal,
			},
		});

		const btn = container.querySelector("#hint-toggle-btn");
		expect(btn?.textContent).toContain("Get Next Hint (2/3)");
		expect(btn?.getAttribute("aria-expanded")).toBe("true");

		const tierLabel = container.querySelector(".tier-label");
		expect(tierLabel?.textContent).toContain("Tier 2: Formula Setup");

		const hintLines = container.querySelectorAll(".hint-line");
		expect(hintLines.length).toBe(2);
	});

	it("disables trigger button when all hints are revealed", async () => {
		const handleReveal = vi.fn();
		const { container } = render(HintDisclosure, {
			props: {
				hints: sampleHints,
				hintTier: 3,
				onRevealNextHint: handleReveal,
			},
		});

		const btn = container.querySelector(
			"#hint-toggle-btn",
		) as HTMLButtonElement;
		expect(btn).toBeTruthy();
		expect(btn.disabled).toBe(true);
		expect(btn.textContent).toContain("All Hints Revealed (3/3)");

		await fireEvent.click(btn);
		expect(handleReveal).not.toHaveBeenCalled();
	});
});
