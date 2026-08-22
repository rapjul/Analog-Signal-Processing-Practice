import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierSeriesStepSolver from "$lib/components/solvers/FourierSeriesStepSolver.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series/index";

describe("FourierSeriesStepSolver", () => {
	afterEach(() => cleanup());

	it("renders and advances multi-part steps with standardized StepCard and PartProgressPill hierarchy", async () => {
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const onComplete = vi.fn();
		const view = render(FourierSeriesStepSolver, { problem, onComplete });

		// Step 1
		const periodInput = view.container.querySelector(
			"#fourier-period-input",
		);
		const freqInput = view.container.querySelector("#fourier-freq-input");
		expect(periodInput).toBeTruthy();
		expect(freqInput).toBeTruthy();

		if (periodInput && freqInput) {
			await fireEvent.input(periodInput, { target: { value: "2" } });
			await fireEvent.input(freqInput, { target: { value: "pi" } });
		}
		await fireEvent.click(view.getByText("Check Period & Frequency →"));

		// Step 2 Part 2A
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		expect(
			view.container.querySelector(".part-progress-pill"),
		).toBeTruthy();
		expect(view.getByText("Part 2A")).toBeTruthy();
		expect(view.getByText("Classify Origin Parity")).toBeTruthy();

		const evenButton = view.getByText("Even Symmetry").closest("button");
		expect(evenButton).toBeTruthy();
		if (evenButton) {
			await fireEvent.click(evenButton);
		}
		await fireEvent.click(view.getByText("Check Origin Parity →"));

		// Step 2 Part 2B (with verified Part 2A summary)
		expect(view.getByText("Part 2 of 2")).toBeTruthy();
		expect(view.getByText("Part 2B")).toBeTruthy();
		expect(view.getByText("Test Half-Wave Symmetry")).toBeTruthy();
		expect(
			view.container.querySelector(".substep-check-badge"),
		).toBeTruthy();

		const halfWaveButton = view
			.getByText("Has Half-Wave Symmetry")
			.closest("button");
		expect(halfWaveButton).toBeTruthy();
		if (halfWaveButton) {
			await fireEvent.click(halfWaveButton);
		}
		await fireEvent.click(view.getByText("Check Half-Wave Symmetry →"));

		// Step 3
		let buttons = view.getAllByRole("button");
		await fireEvent.click(buttons[0]);

		// Step 4
		buttons = view.getAllByRole("button");
		await fireEvent.click(buttons[0]);

		// Step 5 Part 5A
		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		expect(view.getByText("Part 5A")).toBeTruthy();
		expect(view.getByText("Set Up DC Coefficient")).toBeTruthy();
		const firstOptions = view.getByTestId("fourier-step5-options");
		const firstCorrectIndex =
			problem.itsData.step5.parts[0].options.findIndex(
				({ isCorrect }) => isCorrect,
			);
		const optionButtons = firstOptions.querySelectorAll("button");
		const targetButton = optionButtons[firstCorrectIndex];
		expect(targetButton).toBeTruthy();
		if (targetButton) {
			await fireEvent.click(targetButton);
		}

		// Step 5 Part 5B
		expect(view.getByText("Part 2 of 2")).toBeTruthy();
		expect(view.getByText("Part 5B")).toBeTruthy();
		expect(view.getByText("Set Up Cosine Coefficients")).toBeTruthy();
		expect(onComplete).not.toHaveBeenCalled();
	});
});
