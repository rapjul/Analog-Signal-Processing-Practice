// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { LaplaceStepSolverState } from "$lib/components/solvers/laplace-solver-state/controller.svelte";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { laplaceSignal } from "$lib/math-engine/laplace/generator";
import {
	permitsEntryDraft,
	ZERO_POLYNOMIAL,
} from "$lib/math-engine/laplace/input-entry";
import { supportTasks } from "$lib/math-engine/laplace/its-scaffolding/support";
import { laplaceVisualFixtures } from "$lib/testing/laplace-visual-fixtures";

describe("checked Laplace visual scenes", () => {
	/** Separate impulses retain their original position when ordinary activity is summarized. */
	it("keeps original term numbers in verified activity summaries", () => {
		const original = [
			laplaceSignal("impulse"),
			laplaceSignal(),
			{ ...laplaceSignal(), delay: "1" },
		];
		const problem = createLaplaceExercise(laplaceVisualFixtures()[0]!.spec);
		problem.stages = [
			{
				id: "support",
				title: "Check support",
				tasks: supportTasks(original, original),
			},
		];
		const solver = new LaplaceStepSolverState(problem);
		solver.fieldInputs = {
			"active-1": "0",
			"active-2": "0",
			combined: "0",
		};
		expect(solver.check()).toBe(true);
		solver.continue();
		const summary = solver.verified["forward-support-interval-0-values"]!;
		expect(summary).toContain("Term 2: Inactive");
		expect(summary).toContain("Term 3: Inactive");
		expect(summary).not.toContain("Term 1:");
	});
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
				if (scene.draft && solver.task?.kind === "fields") {
					for (const field of solver.task.fields) {
						const value = scene.draft.fields[field.id] ?? "";
						if (
							field.entry?.kind === "degree" &&
							value === ZERO_POLYNOMIAL
						)
							continue;
						expect(
							permitsEntryDraft(
								value,
								field.entry ?? { kind: "exact" },
							),
							`${scene.id}/${field.id}: reachable control draft`,
						).toBe(true);
					}
				}
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
