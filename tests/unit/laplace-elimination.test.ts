import { describe, expect, it } from "vitest";
import { fraction } from "$lib/math-engine/laplace/algebra";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { eliminationTasks } from "$lib/math-engine/laplace/its-scaffolding/elimination";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";

describe("checked coefficient elimination", () => {
	/** Uses an independent two-equation system with a fractional solution. */
	it("checks each equality-preserving operation and rejects incomplete rows", () => {
		const tasks = eliminationTasks(
			[
				[2, 1, 1],
				[1, -1, 0],
			].map((row) => row.map(fraction)),
			["A", "B"],
		);
		expect(tasks).toHaveLength(4);
		expect(tasks[0]!.fields.map((field) => field.target)).toEqual([
			"1",
			"\\frac{1}{2}",
			"\\frac{1}{2}",
		]);
		expect(tasks.at(-1)!.fields.at(-1)!.target).toBe("\\frac{1}{3}");
		for (const task of tasks) {
			const values = Object.fromEntries(
				task.fields.map((field) => [field.id, field.target]),
			);
			expect(
				validateLaplaceTask(task, "", values, []).result.status,
			).toBe("correct");
			delete values[task.fields[1]!.id];
			expect(
				validateLaplaceTask(task, "", values, []).result.status,
			).toBe("invalid");
		}
	});
	/** Identity operations do not add work; exchanges remain explicit. */
	it("shows exchanges and omits identity operations", () => {
		expect(
			eliminationTasks(
				[
					[1, 0, 2],
					[0, 1, 3],
				].map((row) => row.map(fraction)),
				["A", "B"],
			),
		).toEqual([]);
		const tasks = eliminationTasks(
			[
				[0, 2, 4],
				[1, 1, 3],
			].map((row) => row.map(fraction)),
			["A", "B"],
		);
		expect(tasks[0]!.prompt).toContain("Exchange equations 2 and 1");
	});
	for (const preset of ["repeated", "complex"] as const)
		/** Checks all intermediate tasks in supported higher-order families. */
		it(`preflights ${preset} equation rows on the matching branch`, () => {
			const problem = createLaplaceExercise(
				generateLaplaceExercise("inverse", 73, preset).spec,
			);
			const operations = problem.stages
				.flatMap((stage) => stage.tasks)
				.filter((task) => task.id.startsWith("matching-operation"));
			expect(operations.length).toBeGreaterThan(0);
			expect(
				operations.every(
					(task) =>
						task.kind === "fields" &&
						task.when?.values.includes(
							"Partial Fractions: Coefficient Matching",
						),
				),
			).toBe(true);
		});
});
