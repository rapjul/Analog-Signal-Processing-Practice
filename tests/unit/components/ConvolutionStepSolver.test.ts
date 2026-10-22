import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ConvolutionStepSolver from "$lib/components/solvers/ConvolutionStepSolver.svelte";
import { convolutionProblem } from "$lib/testing/convolution";

describe("ConvolutionStepSolver", () => {
	afterEach(() => cleanup());
	/** Infinite candidate values remain mathematical symbols in the step bounds recap. */
	it("renders infinite step candidates without spelling Infinity as variables", async () => {
		const problem = convolutionProblem("step", "step");
		const view = render(ConvolutionStepSolver, { problem });
		const part = problem.itsData.step5.parts.find(
			/** @param candidate - Setup region. @returns Whether it overlaps. */ (
				candidate,
			) => candidate.setupBySignal?.h.hasOverlap,
		);
		if (!part) throw new Error("Expected the active step overlap.");
		await act(
			/** Navigates through the real tutor to the selected overlap region. */ () => {
				expect(
					window.__signalLabDev?.goToVisualState(
						`convolution.step-05.${part.id}`,
					),
				).toBe(true);
			},
		);
		await fireEvent.click(
			view.getByRole("button", { name: "Yes, there is overlap" }),
		);
		const overlap = part.setupBySignal?.h.overlaps[0];
		if (!overlap) throw new Error("Expected concrete candidate values.");
		const inputs = view.container.querySelectorAll<HTMLInputElement>(
			".step-card.active form input",
		);
		for (const [index, value] of [
			...overlap.lowerCandidateValues,
			...overlap.upperCandidateValues,
		].entries())
			await fireEvent.input(inputs[index]!, {
				target: { value: String(value) },
			});
		const form = inputs[0]?.closest("form");
		if (!form) throw new Error("Expected the candidate form.");
		await fireEvent.submit(form);
		const recap = view.container.querySelector(".evaluated-summary-recap");
		expect(recap).toBeTruthy();
		expect(recap?.textContent).not.toContain("Infinity");
		expect(recap?.textContent).toContain("\\infty");
	});

	it("renders seven parent cards and advances each typed timing substep", async () => {
		const problem = convolutionProblem();
		const view = render(ConvolutionStepSolver, { problem });
		expect(view.container.querySelectorAll(".step-card")).toHaveLength(7);
		expect(
			view.container.querySelectorAll(".step-card.locked"),
		).toHaveLength(6);
		expect(view.getByText(/support is all times/i)).toBeTruthy();

		for (const part of problem.itsData.step1.parts) {
			const inputs =
				view.container.querySelectorAll<HTMLInputElement>(
					".timing-grid input",
				);
			expect(inputs).toHaveLength(3);
			await fireEvent.input(inputs[0]!, {
				target: { value: String(part.start) },
			});
			await fireEvent.input(inputs[1]!, {
				target: { value: String(part.end) },
			});
			await fireEvent.input(inputs[2]!, {
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
		const first = convolutionProblem("rect", "exponential", 1);
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
			problem: convolutionProblem("triangle", "triangle", 2),
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
		const problem = convolutionProblem("rect", "rect", 9);
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
				await fireEvent.input(inputs[index]!, {
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
		await fireEvent.click(definitionButtons[correctIndex]!);
		const pathButtons = view.container.querySelectorAll<HTMLButtonElement>(
			".binary-grid button",
		);
		expect(pathButtons).toHaveLength(2);
		expect(pathButtons[0]!.textContent).toContain("Move");
		expect(pathButtons[1]!.textContent).toContain("Move");
	});

	it("renders every multipart visual state for the broad multi-pulse problem", async () => {
		const problem = convolutionProblem("multi_rect", "rect", 15);
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
				view.container.textContent?.includes(
					"Concrete expanded integrand",
				) ?? false;
		}
		expect(sawBounds).toBe(true);
		expect(sawEvaluation).toBe(true);
	}, 20_000);

	it("uses native forms for Enter submission and renders Step 3C transformed edge inputs", async () => {
		const problem = convolutionProblem("rect", "rect", 21);
		const view = render(ConvolutionStepSolver, { problem });
		const firstPart = problem.itsData.step1.parts[0]!;
		const inputs =
			view.container.querySelectorAll<HTMLInputElement>(
				".timing-grid input",
			);
		for (const [index, value] of [
			firstPart.start,
			firstPart.end,
			firstPart.width,
		].entries())
			await fireEvent.input(inputs[index]!, {
				target: { value: String(value) },
			});
		const timingForm = inputs[0]!.closest("form");
		if (!timingForm) throw new Error("Expected the timing form.");
		await fireEvent.submit(timingForm);
		expect(view.getByText("Part 1B")).toBeTruthy();

		await act(() => {
			expect(
				window.__signalLabDev?.goToVisualState(
					"convolution.step-03.transform-edges",
				),
			).toBe(true);
		});
		await waitFor(() =>
			expect(
				view.getByText(/type the transformed left edge/i),
			).toBeTruthy(),
		);
		expect(
			view
				.getByRole("button", { name: "Check transformed edges" })
				.closest("form"),
		).toBeTruthy();
	});

	it("renders one inline t-equals answer and noninteractive static interval math", async () => {
		const problem = convolutionProblem();
		const view = render(ConvolutionStepSolver, { problem });
		const solveState = (
			window.__signalLabDev?.getVisualStates() ?? []
		).find(({ id }) => id.endsWith("-solve"));
		if (!solveState) throw new Error("Expected a contact solve state.");
		await act(() => {
			expect(window.__signalLabDev?.goToVisualState(solveState.id)).toBe(
				true,
			);
		});
		const contactInput = view.getByLabelText("Contact time after t equals");
		const contactLabel = contactInput.closest("label");
		expect(contactLabel?.textContent?.replace(/\s/g, "")).toContain("t=");
		expect(contactLabel?.classList.contains("equation-entry")).toBe(true);

		await act(() => {
			expect(
				window.__signalLabDev?.goToVisualState("convolution.step-06"),
			).toBe(true);
		});
		await waitFor(() =>
			expect(
				view.container.querySelector(".formula-ledger"),
			).toBeTruthy(),
		);
		const activeCard = view.container.querySelector(".step-card.active");
		expect(activeCard?.querySelectorAll("button.math-inline")).toHaveLength(
			0,
		);
		expect(activeCard?.textContent).toContain("Supplied primitive");
		expect(
			activeCard?.querySelector(".evaluation-form button[type='submit']"),
		).toBeTruthy();
	});

	it("builds Step 7 from interval-aligned typed rows with announced headings", async () => {
		const problem = convolutionProblem();
		const view = render(ConvolutionStepSolver, { problem });
		await act(() => {
			expect(
				window.__signalLabDev?.goToVisualState("convolution.step-07"),
			).toBe(true);
		});
		const rows = view.container.querySelectorAll(".piecewise-builder form");
		expect(rows).toHaveLength(problem.intervals.length);
		expect(
			view.container.querySelectorAll(
				".piecewise-builder [data-progress-heading][tabindex='-1']",
			),
		).toHaveLength(problem.intervals.length);
		expect(
			view.container.querySelectorAll(".piecewise-builder form.verified")
				.length,
		).toBeGreaterThan(0);
		expect(
			view.container.querySelectorAll(
				".piecewise-builder input:not([readonly])",
			).length,
		).toBeGreaterThan(0);
		const reference = view.getByText("Show verified Step 6 expressions");
		expect(reference.closest("details")?.hasAttribute("open")).toBe(false);
		const readonlyRows = view.container.querySelectorAll(
			".piecewise-builder input[readonly][aria-readonly='true']",
		);
		expect(readonlyRows.length).toBeGreaterThan(0);
		expect(readonlyRows[0]?.hasAttribute("disabled")).toBe(false);
		const editable = view.container.querySelector<HTMLInputElement>(
			".piecewise-builder input:not([readonly])",
		);
		if (!editable) throw new Error("Expected an editable piecewise row.");
		await fireEvent.input(editable, { target: { value: "999" } });
		const piecewiseForm = editable.closest("form");
		if (!piecewiseForm) throw new Error("Expected a piecewise row form.");
		await fireEvent.submit(piecewiseForm);
		expect(view.getByText(/different interval/i)).toBeTruthy();
	});
});
