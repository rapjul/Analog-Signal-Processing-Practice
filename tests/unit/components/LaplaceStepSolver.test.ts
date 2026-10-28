import { act, cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import LaplaceStepSolver from "$lib/components/solvers/LaplaceStepSolver.svelte";
import { createRationalExercise } from "$lib/math-engine/laplace/its-scaffolding/inverse";
import type { RationalExercise } from "$lib/math-engine/laplace/types";

/** @param cancel - Whether to share a factor. @returns Independent small fixture. */
function fixture(cancel = false): RationalExercise {
	return {
		workflow: "inverse",
		seed: 1,
		system: false,
		rational: {
			gain: "1",
			zeros: cancel
				? [{ real: "-1", frequency: "0", multiplicity: 1 }]
				: [],
			poles: [{ real: "-1", frequency: "0", multiplicity: 1 }],
			delay: "0",
			region: -1,
		},
	};
}

describe("Laplace checked workflow", () => {
	afterEach(() => cleanup());
	it("rejects wrong answers, verifies every task, and resets after replacement", async () => {
		const problem = createRationalExercise(fixture()),
			onComplete = vi.fn();
		const view = render(LaplaceStepSolver, { problem, onComplete });
		expect(view.container.querySelectorAll(".choice-marker")).toHaveLength(
			2,
		);
		expect(
			view.container
				.querySelector(".choice-marker")
				?.getAttribute("aria-hidden"),
		).toBe("true");
		await fireEvent.click(
			view.getByRole("button", {
				name: "Unilateral transform using initial conditions",
			}),
		);
		expect(
			view.container
				.querySelector('[data-validation="incorrect"]')
				?.getAttribute("data-validation"),
		).toBe("incorrect");
		expect(
			view.container
				.querySelector("#laplace-feedback")
				?.classList.contains("visible-feedback"),
		).toBe(true);
		await act(() => {
			const solver = window.__signalLabDev!.activeSolver!;
			solver.devSolveAll();
		});
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(
			view.container.querySelectorAll(".step-card.completed"),
		).toHaveLength(view.container.querySelectorAll(".step-card").length);
		await view.rerender({
			problem: createRationalExercise(fixture(true)),
			onComplete,
		});
		expect(
			view.container.querySelectorAll(".step-card.completed"),
		).toHaveLength(0);
		expect(
			view.container.querySelectorAll(".step-card.active"),
		).toHaveLength(1);
	});
});
