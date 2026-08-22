import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FourierCanvas from "$lib/components/canvas/FourierCanvas.svelte";
import { computeFourierCoefficients } from "$lib/math-engine/fourier-series";

describe("FourierCanvas", () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			null,
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("uses threshold-safe Parseval labels and semantic metric layouts", async () => {
		const coefficients = computeFourierCoefficients("square", {
			A: 5,
			T0: 2,
		});
		const view = render(FourierCanvas, {
			coefficients,
			waveformType: "square",
			harmonicCount: 39,
		});

		expect(view.container.querySelectorAll(".power-stat")).toHaveLength(3);
		expect(view.container.querySelector(".power-value")).toBeNull();
		expect(
			view.container.querySelector(".capture-ratio")?.textContent,
		).toContain("98.99%");
		expect(
			view.container.querySelectorAll(".power-stat")[2].textContent,
		).toContain("98.99");
		const thresholdSummary = view.container.querySelector(
			".power-threshold-summary",
		);
		expect(thresholdSummary?.textContent).toContain("41");
		expect(thresholdSummary?.textContent).toContain(
			"highest included harmonic",
		);
		expect(
			thresholdSummary?.querySelector(":scope > .math-text"),
		).toBeTruthy();

		await fireEvent.input(view.getByLabelText("Harmonic Limit:"), {
			target: { value: "41" },
		});
		await waitFor(() =>
			expect(
				view.container.querySelector(".capture-ratio")?.textContent,
			).toContain("99.04%"),
		);
	});
});
