/** Exact worked solutions remain independent of tolerance-accepted attempt text. */
import { describe, expect, it } from "vitest";
import { buildCtftLesson } from "$lib/math-engine/ctft-lesson";
import { exactCtftSolution } from "$lib/math-engine/ctft-presentation";
import { createCtftProblem } from "$lib/math-engine/fourier-transform";

describe("exact CTFT solutions", () => {
	for (const mode of ["derivation", "pairs-properties"] as const)
		for (const t0 of [0, 1, -1]) {
			/** Exact weights follow each row's coordinate rather than the fixture row order. */
			it(`preserves reversed rows for ${mode} with translation ${t0}`, () => {
				const problem = createCtftProblem("cos", {
					a: 2,
					T: 4,
					w0: 3,
					t0,
				});
				for (const stage of buildCtftLesson(
					problem,
					mode,
				).stages.filter(
					/** @param stage - Lesson stage. @returns Whether it assembles impulses. */
					(stage) => ["base", "final"].includes(stage.id),
				)) {
					for (const task of stage.parts) {
						if (task.kind !== "location" && task.kind !== "weight")
							continue;
						const location = task.id.endsWith("0") ? 3 : -3;
						const value = exactCtftSolution(
							task,
							problem,
							stage.id,
							`${location * 2}/2`,
						);
						if (task.kind === "location")
							expect(value).toBe(String(location));
						else {
							expect(value).toContain("\\pi");
							if (stage.id === "final" && t0)
								expect(value).toContain(`(${location})(${t0})`);
							else expect(value).toBe("\\pi");
						}
					}
				}
			});
		}
	/** An unverified coordinate must not silently acquire a plausible solution. */
	it("rejects invalid row coordinates", () => {
		const problem = createCtftProblem("cos", { a: 2, T: 4, w0: 3, t0: 1 });
		const task = buildCtftLesson(problem, "pairs-properties").stages.at(-1)!
			.parts[0]!;
		expect(() => exactCtftSolution(task, problem, "final", "2")).toThrow(
			"verified carrier",
		);
	});
});
