import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConvolutionStepSolver from "$lib/components/solvers/ConvolutionStepSolver.svelte";
import {
	type ConvolutionItsOption,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution";

/** Returns the option index matching the requested correctness. */
function optionIndex(
	options: ConvolutionItsOption[],
	isCorrect: boolean,
): number {
	const index = options.findIndex((option) => option.isCorrect === isCorrect);
	if (index < 0) throw new Error("Expected convolution choice.");
	return index;
}

describe("ConvolutionStepSolver", () => {
	afterEach(() => cleanup());

	it("renders seven cards, compiles summaries, and completes both interval stages", async () => {
		const problem = generateConvolutionProblem("tri_rect", { seed: 12 });
		const onComplete = vi.fn();
		const view = render(ConvolutionStepSolver, { problem, onComplete });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(7);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);

		for (const step of [1, 2, 3, 4] as const) {
			const data = problem.itsData[`step${step}`];
			const buttons = view
				.getByTestId(`convolution-step${step}-options`)
				.querySelectorAll("button");
			if (step === 1) {
				await fireEvent.click(
					buttons[optionIndex(data.options, false)],
				);
				expect(view.getByRole("alert")).toBeTruthy();
			}
			await fireEvent.click(buttons[optionIndex(data.options, true)]);
		}

		for (const step of [5, 6] as const) {
			const parts = problem.itsData[step === 5 ? "step5" : "step6"].parts;
			for (const [index, part] of parts.entries()) {
				expect(
					view.getByText(`Part ${index + 1} of ${parts.length}`),
				).toBeTruthy();
				const buttons = view
					.getByTestId(`convolution-step${step}-options`)
					.querySelectorAll("button");
				await fireEvent.click(buttons[optionIndex(part.options, true)]);
			}
		}

		const finalButtons = view
			.getByTestId("convolution-step7-options")
			.querySelectorAll("button");
		await fireEvent.click(
			finalButtons[optionIndex(problem.itsData.step7.options, true)],
		);
		expect(onComplete).toHaveBeenCalledWith("h");
		expect(
			view.container.querySelectorAll(".step-card.completed"),
		).toHaveLength(7);
		expect(
			view.container.querySelectorAll(".katex").length,
		).toBeGreaterThan(0);
		expect(view.container.textContent).not.toContain("\\longrightarrow");
	});

	it("resets to support analysis when the problem identifier changes", async () => {
		const first = generateConvolutionProblem("rect_exp", { seed: 1 });
		const view = render(ConvolutionStepSolver, { problem: first });
		const buttons = view
			.getByTestId("convolution-step1-options")
			.querySelectorAll("button");
		await fireEvent.click(
			buttons[optionIndex(first.itsData.step1.options, true)],
		);
		await view.rerender({
			problem: generateConvolutionProblem("tri_shifted_tri", { seed: 2 }),
		});
		await waitFor(() =>
			expect(view.getByTestId("convolution-step1-options")).toBeTruthy(),
		);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);
	});
});
