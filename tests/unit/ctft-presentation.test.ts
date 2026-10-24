/** Exact worked solutions remain independent of tolerance-accepted attempt text. */
import { describe, expect, it } from "vitest";
import { createCtftProblem } from "$lib/math-engine/fourier-transform/index";
import {
	buildCtftDerivation,
	formatCtftHalfWidth,
} from "$lib/math-engine/fourier-transform/its-scaffolding/derivation";
import { buildCtftLesson } from "$lib/math-engine/fourier-transform/its-scaffolding/lesson";
import {
	ctftCheckLabel,
	exactCtftSolution,
} from "$lib/math-engine/fourier-transform/presentation";

describe("exact CTFT solutions", () => {
	/** Every typed course exercise has an informative submit action, including both exponential endpoints. */
	it("names every typed course exercise action", () => {
		for (const family of ["rect", "exponential", "delta", "cos"] as const) {
			for (const mode of ["derivation", "pairs-properties"] as const) {
				const lesson = buildCtftLesson(
					createCtftProblem(family, { a: 2, T: 2, w0: 3, t0: 1 }),
					mode,
				);
				for (const stage of lesson.stages) {
					for (const task of stage.parts) {
						if (task.kind === "choice") continue;
						const label = ctftCheckLabel(task, stage.id);
						expect(label).not.toBe("Check calculation →");
						if (task.id === "upper")
							expect(label).toBe("Check infinite endpoint →");
						if (task.id === "lower")
							expect(label).toBe("Check lower endpoint →");
					}
				}
			}
		}
	});
	/** Odd generated widths retain reduced fractions in bounds, phases, identities, and hints. */
	it("formats pulse half-widths exactly throughout the lesson", () => {
		for (const [T, half] of [
			[1, "\\frac{1}{2}"],
			[2, "1"],
			[3, "\\frac{3}{2}"],
			[4, "2"],
			[6, "3"],
		] as const) {
			const problem = createCtftProblem("rect", {
				a: 2,
				T,
				w0: 3,
				t0: 1,
			});
			expect(formatCtftHalfWidth(T)).toBe(half);
			const derivation = buildCtftDerivation(problem);
			expect(
				derivation.parts.find(
					/** @param task - Derivation exercise. @returns Whether it substitutes the endpoint bounds. */
					(task) => task.id === "endpoints",
				)?.contextLatex,
			).toContain(`_{-${half}}^{${half}}`);
			const lesson = buildCtftLesson(problem, "derivation");
			expect(JSON.stringify(lesson)).not.toMatch(/0\.5|1\.5/);
			if (T % 2)
				expect(
					lesson.stages
						.find(
							/** @param stage - Lesson stage. @returns Whether it supplies the setup scaffold. */
							(stage) => stage.id === "setup",
						)
						?.parts[0]?.hints.join(" "),
				).toContain(half);
		}
	});
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
							`X(omega)=${location * 2}/2`,
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
