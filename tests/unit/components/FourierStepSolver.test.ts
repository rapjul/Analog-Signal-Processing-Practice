import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FourierStepSolver from "$lib/components/solvers/FourierStepSolver.svelte";
import { generateFourierSeriesProblem } from "$lib/math-engine/fourier-series";

describe("FourierStepSolver", () => {
	afterEach(() => cleanup());

	it("renders and advances coefficient setup as separate sub-steps", async () => {
		const problem = generateFourierSeriesProblem("square_even", {
			seed: 10,
			A: 5,
			T0: 2,
		});
		const onComplete = vi.fn();
		const view = render(FourierStepSolver, { problem, onComplete });

		await fireEvent.input(
			view.container.querySelector("#fourier-period-input")!,
			{ target: { value: "2" } },
		);
		await fireEvent.input(
			view.container.querySelector("#fourier-freq-input")!,
			{ target: { value: "pi" } },
		);
		await fireEvent.click(view.getByText("Check Period & Frequency →"));
		let buttons = view.getAllByRole("button");
		await fireEvent.click(buttons[0]);
		await fireEvent.click(buttons[3]);
		await fireEvent.click(buttons[5]);
		buttons = view.getAllByRole("button");
		await fireEvent.click(buttons[0]);
		buttons = view.getAllByRole("button");
		await fireEvent.click(buttons[0]);

		expect(view.getByText("Part 1 of 2")).toBeTruthy();
		expect(view.getByText("Set Up DC Coefficient")).toBeTruthy();
		const firstOptions = view.getByTestId("fourier-step5-options");
		const firstCorrectIndex =
			problem.itsData.step5.parts[0].options.findIndex(
				({ isCorrect }) => isCorrect,
			);
		await fireEvent.click(
			firstOptions.querySelectorAll("button")[firstCorrectIndex],
		);

		expect(view.getByText("Part 2 of 2")).toBeTruthy();
		expect(view.getByText("Set Up Cosine Coefficients")).toBeTruthy();
		expect(onComplete).not.toHaveBeenCalled();
	});
});
