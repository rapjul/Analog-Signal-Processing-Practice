import { act, cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import LaplaceStepSolver from "$lib/components/solvers/LaplaceStepSolver.svelte";
import type { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";

describe("Laplace field controls", () => {
	afterEach(() => cleanup());
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
