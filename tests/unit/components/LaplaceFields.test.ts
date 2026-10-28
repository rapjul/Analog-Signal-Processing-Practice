import { act, cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceStepSolver from "$lib/components/solvers/LaplaceStepSolver.svelte";
import type { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { laplaceVisualFixtures } from "$lib/testing/laplace-visual-fixtures";

describe("Laplace field controls", () => {
	afterEach(() => cleanup());
	/** An undefined degree needs an explicit selection and a separate correct denominator degree. */
	it("checks zero-polynomial selection without showing a negative degree", async () => {
		const spec = generateLaplaceExercise("inverse", 73, "distinct").spec;
		if (spec.workflow !== "inverse")
			throw new Error("Expected inverse fixture");
		spec.rational.gain = "0";
		const problem = createLaplaceExercise(spec);
		const view = render(LaplaceStepSolver, { problem });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		const scene = solver
			.devGetVisualStates()
			.find(
				(state) =>
					state.taskId === "degrees-values" &&
					state.phase === "initial",
			)!;
		await act(() => solver.devGoToVisualState(scene.id));
		await fireEvent.change(
			view.getByRole("combobox", {
				name: "Reduced numerator degree polynomial case",
			}),
			{ target: { value: "zero" } },
		);
		const denominator = view.getByRole("textbox", {
			name: "Reduced denominator degree",
		});
		await fireEvent.input(denominator, { target: { value: "0" } });
		await fireEvent.keyDown(denominator, { key: "Enter" });
		expect(solver.awaitingContinue).toBe(true);
		expect(solver.preview).toContain("undefined");
		expect(solver.preview).not.toContain("-1");
	});
	/** Activity is a Boolean selection, while the interval sum remains independently checked. */
	it("checks activity checkboxes with the combined expression and preserves them through hints", async () => {
		const fixture = laplaceVisualFixtures().find(
			(item) => item.spec.workflow === "forward",
		)!;
		const problem = createLaplaceExercise(fixture.spec);
		const view = render(LaplaceStepSolver, { problem });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		const scene = solver
			.devGetVisualStates()
			.find(
				(state) =>
					state.taskId === "forward-support-interval-0-values" &&
					state.phase === "initial",
			)!;
		await act(() => solver.devGoToVisualState(scene.id));
		const checkboxes = view.container.querySelectorAll<HTMLInputElement>(
			'input[type="checkbox"]',
		);
		expect(checkboxes).toHaveLength(3);
		expect(checkboxes[0]!.closest("label")?.textContent).toContain(
			"Term 1",
		);
		await fireEvent.click(
			view.getByRole("button", { name: "Check Support Interval" }),
		);
		expect(solver.awaitingContinue).toBe(false);
		await fireEvent.click(checkboxes[1]!);
		await fireEvent.click(view.getByRole("button", { name: /Get Hint/ }));
		expect(solver.fieldInputs["active-1"]).toBe("1");
		expect(solver.awaitingContinue).toBe(false);
		const combined = view.container.querySelector<HTMLInputElement>(
			'[data-field-id="combined"]',
		)!;
		await fireEvent.input(combined, { target: { value: "1" } });
		await fireEvent.keyDown(combined, { key: "Enter" });
		expect(solver.awaitingContinue).toBe(true);
		expect(solver.fieldResults["active-0"]!.message).toContain("Inactive");
	});
	/** Derived conclusions must follow checked source work and explicit continuation. */
	it("records carried results only on continuation and clears them on reset", async () => {
		const problem = generateLaplaceExercise("inverse", 73, "distinct");
		render(LaplaceStepSolver, { problem });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		const index = problem.stages.findIndex(
			(stage) => stage.id === "analysis",
		);
		await act(() => {
			solver.currentStep = index + 1;
			solver.taskIndex = problem.stages[index]!.tasks.findIndex(
				(part) => part.id === "cancellation",
			);
			solver.input = "No common factors";
			solver.check();
		});
		expect(solver.carried).toEqual({});
		await act(() => solver.continue());
		expect(solver.carried.cancellation?.join(" ")).toContain(
			"remain the poles",
		);
		expect(solver.verified["surviving-poles"]).toBeUndefined();
		await act(() => solver.reset());
		expect(solver.carried).toEqual({});
	});
	it("keeps fields blank and preserves drafts through hints and feedback, then clears them on advancement and reset", async () => {
		const problem = generateLaplaceExercise("ode", 73, "repeated");
		const view = render(LaplaceStepSolver, { problem });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		const stage = problem.stages.findIndex(
			(part) => part.id === "derivatives",
		);
		await act(() => {
			solver.currentStep = stage + 1;
			solver.taskIndex = problem.stages[stage]!.tasks.findIndex(
				(task) => task.id === "ode-second-values",
			);
		});
		const y0 = view.container.querySelector<HTMLInputElement>(
			'[data-field-id="y0"]',
		)!;
		const dy0 = view.container.querySelector<HTMLInputElement>(
			'[data-field-id="dy0"]',
		)!;
		expect(y0.value).toBe("");
		expect(dy0.value).toBe("");
		await fireEvent.input(y0, { target: { value: "1/1" } });
		await fireEvent.click(view.getByRole("button", { name: /Get Hint/ }));
		expect(y0.value).toBe("1/1");
		expect(solver.verified["ode-second-values"]).toBeUndefined();
		await fireEvent.click(
			view.getByRole("button", {
				name: "Check Initial-Condition Substitution",
			}),
		);
		expect(solver.fieldResults.y0!.status).toBe("correct");
		expect(solver.fieldResults.dy0!.status).toBe("invalid");
		const drafts = { ...solver.fieldInputs };
		const step = solver.currentStep,
			taskIndex = solver.taskIndex;
		await act(() => {
			solver.reset();
			expect(solver.fieldResults).toEqual({});
			solver.currentStep = step;
			solver.taskIndex = taskIndex;
			solver.fieldInputs = drafts;
		});
		expect(y0.value).toBe("1/1");
		await fireEvent.input(dy0, { target: { value: "0/5" } });
		await fireEvent.keyDown(dy0, { key: "Enter" });
		expect(solver.awaitingContinue).toBe(true);
		expect(solver.verified["ode-second-values"]).toBeUndefined();
		await fireEvent.click(view.getByRole("button", { name: "Continue" }));
		expect(solver.verified["ode-second-values"]).toContain("0/5");
		expect(solver.fieldInputs).toEqual({});
		await act(() => solver.reset());
		expect(solver.fieldInputs).toEqual({});
		expect(solver.fieldResults).toEqual({});
		expect(solver.verified).toEqual({});
	});
});
