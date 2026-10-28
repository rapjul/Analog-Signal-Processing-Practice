// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { laplaceVisualFixtures } from "$lib/testing/laplace-visual-fixtures";

describe("checked Laplace visual scenes", () => {
	for (const fixture of laplaceVisualFixtures()) {
		/** Every advertised scene must be reachable through real prerequisite validation. */
		it(`reaches every task phase for ${fixture.id}`, () => {
			const problem = createLaplaceExercise(fixture.spec);
			const solver = new LaplaceStepSolverState(problem);
			const scenes = solver.devGetVisualStates();
			expect(scenes.length).toBeGreaterThan(problem.stages.length);
			expect(new Set(scenes.map((scene) => scene.id)).size).toBe(
				scenes.length,
			);
			for (const scene of scenes) {
				expect(solver.devGoToVisualState(scene.id), scene.id).toBe(
					true,
				);
				expect(solver.task?.id).toBe(scene.taskId);
				expect(solver.displayStep).toBe(scene.step);
				expect(solver.hintTier).toBe(scene.hintTier ?? 0);
				expect(solver.awaitingContinue).toBe(scene.phase === "success");
				if (scene.phase === "diagnostic")
					expect(solver.result?.status).toBe(scene.feedbackStatus);
			}
			expect(solver.devGoToVisualState("missing-scene")).toBe(false);
		}, 120000);
	}
	/** A known answer and exact query fields protect the supplied fixture from being replaced by a random example. */
	it("preserves the supplied problem and both coefficient methods", () => {
		const problem = createLaplaceExercise(laplaceVisualFixtures()[0]!.spec);
		const solver = new LaplaceStepSolverState(problem);
		expect(problem.poles.map((pole) => pole.real)).toEqual(["-3", "-5"]);
		expect(problem.terms.map((term) => term.amplitude)).toEqual([
			"3",
			"-1",
		]);
		const branches = new Set(
			solver.devGetVisualStates().map((scene) => scene.branchId),
		);
		expect(branches.size).toBe(2);
		expect([...branches].join(" ")).toMatch(/cover-up/);
		expect([...branches].join(" ")).toMatch(/coefficient-matching/);
	});
});
