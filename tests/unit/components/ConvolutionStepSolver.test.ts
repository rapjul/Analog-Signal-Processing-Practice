/**
 * @file DOM tests for the complete guided convolution solver and its dynamic interval parts.
 */

import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConvolutionStepSolver from "$lib/components/solvers/ConvolutionStepSolver.svelte";
import {
	type ConvolutionItsOption,
	generateConvolutionProblem,
} from "$lib/math-engine/convolution";

/** Returns the index of the expected option in a choice collection. */
function correctIndex(options: ConvolutionItsOption[]): number {
	const index = options.findIndex(({ isCorrect }) => isCorrect);
	if (index < 0) throw new Error("Expected a correct convolution choice.");
	return index;
}

/** Returns the index of a misconception option in a choice collection. */
function incorrectIndex(options: ConvolutionItsOption[]): number {
	const index = options.findIndex(({ isCorrect }) => !isCorrect);
	if (index < 0) throw new Error("Expected an incorrect convolution choice.");
	return index;
}

describe("ConvolutionStepSolver", () => {
	afterEach(() => cleanup());

	it("renders locked steps, diagnoses errors, reveals hints, and completes every interval", async () => {
		const problem = generateConvolutionProblem("rect_rect");
		const onComplete = vi.fn();
		const view = render(ConvolutionStepSolver, { problem, onComplete });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(5);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(4);

		await fireEvent.click(view.getByText(/Get Hint/));
		expect(view.getByText("Tier 1: Conceptual Nudge")).toBeTruthy();
		let buttons = view
			.getByTestId("convolution-step1-options")
			.querySelectorAll("button");
		await fireEvent.click(
			buttons[incorrectIndex(problem.itsData.step1.options)],
		);
		expect(view.getByRole("alert")).toBeTruthy();
		await fireEvent.click(
			buttons[correctIndex(problem.itsData.step1.options)],
		);

		buttons = view
			.getByTestId("convolution-step2-options")
			.querySelectorAll("button");
		await fireEvent.click(
			buttons[correctIndex(problem.itsData.step2.options)],
		);
		buttons = view
			.getByTestId("convolution-step3-options")
			.querySelectorAll("button");
		await fireEvent.click(
			buttons[correctIndex(problem.itsData.step3.options)],
		);

		for (const [index, part] of problem.itsData.step4.parts.entries()) {
			expect(
				view.getByText(
					`Part ${index + 1} of ${problem.itsData.step4.parts.length}`,
				),
			).toBeTruthy();
			buttons = view
				.getByTestId("convolution-step4-options")
				.querySelectorAll("button");
			if (index === 0) {
				await fireEvent.click(buttons[incorrectIndex(part.options)]);
				expect(view.getByRole("alert")).toBeTruthy();
			}
			await fireEvent.click(buttons[correctIndex(part.options)]);
		}

		buttons = view
			.getByTestId("convolution-step5-options")
			.querySelectorAll("button");
		await fireEvent.click(
			buttons[correctIndex(problem.itsData.step5.options)],
		);
		expect(onComplete).toHaveBeenCalledOnce();
		expect(
			view.container.querySelectorAll(".step-card.completed"),
		).toHaveLength(5);
	});

	it("resets to the first step when a new problem identifier is rendered", async () => {
		const firstProblem = generateConvolutionProblem("step_exp");
		const view = render(ConvolutionStepSolver, { problem: firstProblem });
		const firstOptions = view
			.getByTestId("convolution-step1-options")
			.querySelectorAll("button");
		await fireEvent.click(
			firstOptions[correctIndex(firstProblem.itsData.step1.options)],
		);
		expect(view.getByTestId("convolution-step2-options")).toBeTruthy();
		await view.rerender({ problem: firstProblem });
		expect(view.getByTestId("convolution-step2-options")).toBeTruthy();

		const secondProblem = {
			...generateConvolutionProblem("step_rect"),
			id: `${firstProblem.id}-replacement`,
		};
		await view.rerender({ problem: secondProblem });
		await waitFor(() =>
			expect(view.getByTestId("convolution-step1-options")).toBeTruthy(),
		);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(4);
	});
});
