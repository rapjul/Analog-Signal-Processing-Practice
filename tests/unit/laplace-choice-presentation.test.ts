import { describe, expect, it } from "vitest";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { signalFamilyChoices } from "$lib/math-engine/laplace/its-scaffolding/teaching";

describe("Laplace choice presentation", () => {
	/** All ordinary options share the supplied support, independently of the correct answer. */
	it("shows readable family names and mathematical forms on both sides", () => {
		for (const side of ["left", "right"] as const) {
			const choices = signalFamilyChoices(side);
			expect(choices.exponential!.label).toBe(
				"Step / polynomial exponential",
			);
			for (const kind of ["exponential", "sine", "cosine"])
				expect(choices[kind]!.math).toContain(
					side === "left" ? "u(d-t)" : "u(t-d)",
				);
			expect(choices.impulse!.math).toBe("A\\delta(t-d)");
		}
	});
	/** Method descriptions explain the operation without disclosing applicability. */
	it("keeps stable choice values separate from complete descriptions", () => {
		const problem = generateLaplaceExercise("inverse", 73, "distinct");
		const task = problem.stages
			.flatMap((stage) => stage.tasks)
			.find((item) => item.id === "method")!;
		expect(task.choices).toContain("Partial Fractions: Cover-Up");
		for (const value of task.choices!) {
			expect(task.choicePresentation?.[value]?.description).toMatch(
				/Recognize|Cancel|Clear/,
			);
			expect(task.choicePresentation?.[value]?.description).not.toMatch(
				/correct|valid|recommended/i,
			);
		}
	});
});
