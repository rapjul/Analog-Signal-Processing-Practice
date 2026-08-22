import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FourierPracticeCard from "$lib/components/ui/FourierPracticeCard.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series";

describe("FourierPracticeCard", () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			null,
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("keeps conversions optional and reveals them after both parts pass", async () => {
		const problem = generateFourierSeriesProblem("square", {
			seed: 21,
			A: 5,
			T0: 2,
		});
		const view = render(FourierPracticeCard, {
			problem,
			onNextProblem: vi.fn(),
		});

		window.__signalLabDev?.solveAll();
		await waitFor(() =>
			expect(
				view.container.querySelector(".conversion-challenge"),
			).toBeTruthy(),
		);
		expect(view.getByText("All 7 Steps")).toBeTruthy();
		await fireEvent.click(
			view.getByText(
				"Optional Step 8: Convert to the Other Fourier Forms",
			),
		);

		let optionButtons = view
			.getByTestId("fourier-conversion-options")
			.querySelectorAll("button");
		const wrongIndex =
			problem.conversionChallenge.parts[0].options.findIndex(
				({ isCorrect }) => !isCorrect,
			);
		await fireEvent.click(optionButtons[wrongIndex]);
		expect(view.getByRole("alert")).toBeTruthy();

		const firstCorrectIndex =
			problem.conversionChallenge.parts[0].options.findIndex(
				({ isCorrect }) => isCorrect,
			);
		await fireEvent.click(optionButtons[firstCorrectIndex]);
		expect(view.getByText("Part 2 of 2")).toBeTruthy();

		optionButtons = view
			.getByTestId("fourier-conversion-options")
			.querySelectorAll("button");
		const secondCorrectIndex =
			problem.conversionChallenge.parts[1].options.findIndex(
				({ isCorrect }) => isCorrect,
			);
		await fireEvent.click(optionButtons[secondCorrectIndex]);

		expect(view.getByText(/Optional conversions completed/)).toBeTruthy();
		expect(view.getByText("All 9 Steps")).toBeTruthy();
	});
});
