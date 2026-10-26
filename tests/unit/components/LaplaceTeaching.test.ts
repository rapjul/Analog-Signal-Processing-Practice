import { act, cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import LaplaceStepSolver from "$lib/components/solvers/LaplaceStepSolver.svelte";
import type { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";

describe("beginner Laplace teaching interactions", () => {
	afterEach(() => cleanup());
	it("associates expression validation feedback with its input for assistive technology", async () => {
		const problem = generateLaplaceExercise("inverse", 73);
		const view = render(LaplaceStepSolver, { problem });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		await act(() => {
			solver.currentStep =
				problem.stages.findIndex((stage) => stage.id === "assembly") +
				1;
		});
		const input = view.getByLabelText(
			"Enter an expression (standard math or LaTeX)",
		);
		await fireEvent.input(input, { target: { value: "123" } });
		await fireEvent.keyDown(input, { key: "Enter" });
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe("laplace-feedback");
		expect(
			view.container.querySelector("#laplace-feedback")?.textContent,
		).toMatch(/Recheck/);
		await fireEvent.input(input, { target: { value: "" } });
		expect(input.hasAttribute("aria-invalid")).toBe(false);
	});
	it("checks choice cards immediately, explains success, and waits for Continue without redundant parts", async () => {
		const problem = generateLaplaceExercise("inverse", 73),
			onComplete = vi.fn();
		const view = render(LaplaceStepSolver, { problem, onComplete });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		expect(view.container.querySelector('input[type="radio"]')).toBeNull();
		expect(
			view.container.querySelector(".step-card.active .subpart-block"),
		).toBeNull();
		const first = solver.task!;
		expect(view.container.querySelector(".lesson")).toBeNull();
		await fireEvent.click(view.getByRole("button", { name: /Get Hint/ }));
		expect(
			view.getByRole("region", { name: "Hints" }).textContent,
		).toContain("A Laplace transform rewrites a time signal");
		await fireEvent.click(view.getByRole("button", { name: first.answer }));
		expect(solver.result?.status).toBe("correct");
		expect(solver.task?.id).toBe(first.id);
		expect(solver.verified[first.id]).toBeUndefined();
		expect(onComplete).not.toHaveBeenCalled();
		await fireEvent.click(view.getByRole("button", { name: "Continue" }));
		expect(solver.verified[first.id]).toBe(first.answer);
		expect(
			view.container.querySelector("details.verified-result"),
		).toBeNull();
		expect(
			view.container.querySelector(".step-card.active .subpart-badge")
				?.textContent,
		).toBe("Part 2A");
		expect(
			view.container.querySelectorAll("[data-construction-row]"),
		).toHaveLength(0);
	});
	it("preserves constructed drafts during errors and shared hints, then clears them after continuation", async () => {
		const problem = generateLaplaceExercise("inverse", 73),
			onAssist = vi.fn();
		const view = render(LaplaceStepSolver, { problem, onAssist });
		const solver = window.__signalLabDev!
			.activeSolver as LaplaceStepSolverState;
		await act(() => {
			solver.input = solver.task!.answer;
			solver.check();
			solver.continue();
		});
		await fireEvent.click(view.getByRole("button", { name: "Add Factor" }));
		await fireEvent.input(view.getByLabelText("Outside gain"), {
			target: { value: "1" },
		});
		await fireEvent.input(view.getByLabelText("Row 1 coefficient b"), {
			target: { value: "999" },
		});
		await fireEvent.input(view.getByLabelText("Row 1 power"), {
			target: { value: "1" },
		});
		await fireEvent.click(
			view.getByRole("button", { name: "Check Factorization" }),
		);
		expect(solver.result?.status).toBe("incorrect");
		const coefficient = view.getByLabelText("Row 1 coefficient b");
		expect(coefficient.getAttribute("aria-invalid")).toBe("true");
		expect(coefficient.getAttribute("aria-describedby")).toBe(
			"construction-row-0-first",
		);
		expect(
			view.getByLabelText("Outside gain").getAttribute("aria-invalid"),
		).toBe("true");
		await fireEvent.click(view.getByRole("button", { name: /Get Hint/ }));
		expect(view.getByRole("region", { name: "Hints" })).toBeTruthy();
		expect(onAssist).toHaveBeenCalledTimes(1);
		expect(solver.construction.rows[0]!.first).toBe("999");
		expect(solver.verified[solver.task!.id]).toBeUndefined();
		await act(() => {
			if (!("construction" in solver.task!))
				throw new Error("Expected factor task.");
			solver.construction = structuredClone(solver.task!.construction);
			solver.check();
		});
		expect(solver.awaitingContinue).toBe(true);
		await fireEvent.click(view.getByRole("button", { name: "Continue" }));
		expect(solver.construction.rows).toEqual([]);
		expect(solver.hintTier).toBe(0);
		await act(() => solver.reset());
		expect(solver.decisions).toEqual({});
	});
	for (const method of [
		"Direct Transform Pairs",
		"Partial Fractions: Coefficient Matching",
		"Partial Fractions: Cover-Up",
	])
		it(`completes the supported ${method} path through real validators`, async () => {
			const problem = generateLaplaceExercise(
				"inverse",
				73,
				"cancellation",
			);
			const view = render(LaplaceStepSolver, { problem });
			const solver = window.__signalLabDev!
				.activeSolver as LaplaceStepSolverState;
			await act(() => {
				solver.currentStep =
					problem.stages.findIndex((stage) => stage.id === "setup") +
					1;
				solver.input = method;
				solver.check();
			});
			expect(solver.result?.status).toBe("correct");
			await act(() => solver.continue());
			expect(solver.decisions.method).toBe(method);
			if (method === "Direct Transform Pairs")
				expect(solver.task?.id).toBe("direct-weights-values");
			else expect(solver.task?.id).toBe("factor-counts-values");
			await act(() => solver.devSolveAll());
			expect(solver.isCompleted).toBe(true);
			expect(
				view.container.querySelector(".step-card.active"),
			).toBeNull();
		});
});
