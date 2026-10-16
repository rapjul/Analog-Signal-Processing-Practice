import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import OdeFullSolutionView from "$lib/components/solvers/OdeFullSolutionView.svelte";
import { generateOdeProblem } from "$lib/math-engine/odes/index";

afterEach(cleanup);

describe("OdeFullSolutionView — Native Worked-Solution Disclosure", () => {
	/**
	 * Generates a deterministic second-order ODE problem for component tests.
	 *
	 * @returns {import("$lib/math-engine/odes/index").OdeProblem} Active problem instance.
	 */
	function createSecondOrderProblem() {
		return generateOdeProblem({
			order: 2,
			rootType: "distinct_real",
			forcingType: "constant",
			leadingCoefficient: "monic",
			resonance: "none",
			seed: 42,
		});
	}

	/**
	 * Generates a deterministic first-order ODE problem for component tests.
	 *
	 * @returns {import("$lib/math-engine/odes/index").OdeProblem} Active problem instance.
	 */
	function createFirstOrderProblem() {
		return generateOdeProblem({
			order: 1,
			rootType: "distinct_real",
			forcingType: "constant",
			leadingCoefficient: "monic",
			resonance: "none",
			seed: 101,
		});
	}

	it("renders a native details element with summary collapsed by default", () => {
		const problem = createSecondOrderProblem();
		const { container } = render(OdeFullSolutionView, {
			props: { problem },
		});

		const details = container.querySelector<HTMLDetailsElement>(
			"details.full-solution-container",
		);
		expect(details).not.toBeNull();
		expect(details?.open).toBe(false);

		const summary = container.querySelector<HTMLElement>(
			"summary.full-solution-summary",
		);
		expect(summary).not.toBeNull();
		expect(summary?.textContent).toContain("View Complete Worked Solution");
		expect(summary?.textContent).toContain("Zero-Guesswork Derivation");
	});

	it("contains all 7 solution step cards in the DOM", () => {
		const problem = createSecondOrderProblem();
		const { container } = render(OdeFullSolutionView, {
			props: { problem },
		});

		const stepCards = container.querySelectorAll(".solution-step-card");
		expect(stepCards.length).toBe(7);

		const badges = Array.from(stepCards).map((card) =>
			card.querySelector(".step-badge")?.textContent?.trim(),
		);
		expect(badges).toEqual([
			"Step 1",
			"Step 2",
			"Step 3",
			"Step 4",
			"Step 5",
			"Step 6",
			"Step 7",
		]);
	});

	it("updates summary text when details is opened and closed", async () => {
		const problem = createSecondOrderProblem();
		const { container } = render(OdeFullSolutionView, {
			props: { problem },
		});

		const details = container.querySelector<HTMLDetailsElement>(
			"details.full-solution-container",
		);
		if (!details) throw new Error("Missing details element");

		const summary = container.querySelector<HTMLElement>(
			"summary.full-solution-summary",
		);
		if (!summary) throw new Error("Missing summary element");

		// Simulate user interaction via summary click.
		// In jsdom, clicking <summary> does not natively mutate details.open or
		// dispatch the native toggle event, so details.open and the toggle event
		// are explicitly updated to verify Svelte's bind:open reactivity.
		await fireEvent.click(summary);
		details.open = true;
		await fireEvent(details, new Event("toggle"));
		expect(summary.textContent).toContain("Hide Complete Worked Solution");

		// Simulate user closing the disclosure
		await fireEvent.click(summary);
		details.open = false;
		await fireEvent(details, new Event("toggle"));
		expect(summary.textContent).toContain("View Complete Worked Solution");
	});

	it("renders first-order ODE worked solutions correctly", () => {
		const problem = createFirstOrderProblem();
		const { container } = render(OdeFullSolutionView, {
			props: { problem },
		});

		const details = container.querySelector<HTMLDetailsElement>(
			"details.full-solution-container",
		);
		expect(details).not.toBeNull();

		const step2Card = container.querySelectorAll(".solution-step-card")[1];
		expect(step2Card?.textContent).toContain(
			"Solving the linear characteristic equation",
		);
	});
});
