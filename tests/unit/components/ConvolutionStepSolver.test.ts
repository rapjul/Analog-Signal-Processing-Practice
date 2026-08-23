import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ConvolutionStepSolver from "$lib/components/solvers/ConvolutionStepSolver.svelte";
import { generateConvolutionProblem } from "$lib/math-engine/convolution";

describe("ConvolutionStepSolver", () => {
	afterEach(() => cleanup());

	it("renders seven parent cards and advances each typed timing substep", async () => {
		const problem = generateConvolutionProblem("rect_rect", { seed: 12 });
		const view = render(ConvolutionStepSolver, { problem });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(7);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);
		expect(view.getByText(/support is the time range/i)).toBeTruthy();

		for (const part of problem.itsData.step1.parts) {
			const inputs =
				view.container.querySelectorAll<HTMLInputElement>(
					".timing-grid input",
				);
			expect(inputs).toHaveLength(3);
			await fireEvent.input(inputs[0], {
				target: { value: String(part.start) },
			});
			await fireEvent.input(inputs[1], {
				target: { value: String(part.end) },
			});
			await fireEvent.input(inputs[2], {
				target: { value: String(part.width) },
			});
			await fireEvent.click(
				view.getByRole("button", { name: "Check timing and width" }),
			);
		}

		expect(view.getByText("Define the Convolution Integral")).toBeTruthy();
		expect(
			view.container.querySelectorAll(".step-card.completed"),
		).toHaveLength(1);
		expect(
			view.container.querySelectorAll(".katex").length,
		).toBeGreaterThan(0);
	});

	it("shows timing validation and resets when the problem identifier changes", async () => {
		const first = generateConvolutionProblem("rect_exp", { seed: 1 });
		const view = render(ConvolutionStepSolver, { problem: first });
		await fireEvent.click(
			view.getByRole("button", { name: "Check timing and width" }),
		);
		expect(view.getByRole("alert").textContent).toMatch(
			/enter the start time/i,
		);
		const input =
			view.container.querySelector<HTMLInputElement>(
				".timing-grid input",
			);
		if (!input) throw new Error("Expected timing input.");
		await fireEvent.input(input, { target: { value: "123" } });
		await view.rerender({
			problem: generateConvolutionProblem("tri_shifted_tri", { seed: 2 }),
		});
		await waitFor(() =>
			expect(
				view.container.querySelector<HTMLInputElement>(
					".timing-grid input",
				)?.value,
			).toBe(""),
		);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);
	});

	it("keeps Step 3's signal choice binary and Step 2 at four choices", async () => {
		const problem = generateConvolutionProblem("rect_rect", { seed: 9 });
		const view = render(ConvolutionStepSolver, { problem });
		for (const part of problem.itsData.step1.parts) {
			const inputs =
				view.container.querySelectorAll<HTMLInputElement>(
					".timing-grid input",
				);
			for (const [index, value] of [
				part.start,
				part.end,
				part.width,
			].entries())
				await fireEvent.input(inputs[index], {
					target: { value: String(value) },
				});
			await fireEvent.click(
				view.getByRole("button", { name: "Check timing and width" }),
			);
		}
		const definitionButtons = view
			.getByTestId("convolution-step2-options")
			.querySelectorAll("button");
		expect(definitionButtons).toHaveLength(4);
		const correctIndex = problem.itsData.step2.options.findIndex(
			({ isCorrect }) => isCorrect,
		);
		await fireEvent.click(definitionButtons[correctIndex]);
		const pathButtons = view.container.querySelectorAll<HTMLButtonElement>(
			".binary-grid button",
		);
		expect(pathButtons).toHaveLength(2);
		expect(pathButtons[0].textContent).toContain("Move");
		expect(pathButtons[1].textContent).toContain("Move");
	});

	it("renders every multipart visual state for the broad multi-pulse problem", async () => {
		const problem = generateConvolutionProblem("multi_rect", { seed: 15 });
		const view = render(ConvolutionStepSolver, { problem });
		const states = window.__signalLabDev?.getVisualStates() ?? [];
		let sawBounds = false;
		let sawEvaluation = false;
		expect(states.length).toBeGreaterThan(20);
		for (const state of states) {
			let navigated = false;
			await act(() => {
				navigated =
					window.__signalLabDev?.goToVisualState(state.id) ?? false;
			});
			expect(navigated).toBe(true);
			await waitFor(() => {
				const active =
					view.container.querySelector(".step-card.active");
				expect(active).toBeTruthy();
			});
			if (state.step === 5) {
				const yes = Array.from(
					view.container.querySelectorAll<HTMLButtonElement>(
						"button",
					),
				).find((button) =>
					button.textContent?.includes("Yes, there is overlap"),
				);
				if (yes) await fireEvent.click(yes);
			}
			sawBounds ||=
				view.container.textContent?.includes("Connected overlap") ??
				false;
			sawEvaluation ||=
				view.container.textContent?.includes("Live preview") ?? false;
		}
		expect(sawBounds).toBe(true);
		expect(sawEvaluation).toBe(true);
	});
});
