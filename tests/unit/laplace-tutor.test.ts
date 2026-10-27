import { describe, expect, it } from "vitest";
import { validateConstruction } from "$lib/math-engine/laplace/construction";
import { createRationalExercise } from "$lib/math-engine/laplace/its-scaffolding/inverse";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { laplaceGoal } from "$lib/math-engine/laplace/answer-entry";
import type { RationalExercise } from "$lib/math-engine/laplace/types";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";

/** @param cancellation - Whether numerator and denominator share a factor. @returns Reproducible inverse problem. */
function inverseSpec(cancellation = false): RationalExercise {
	return {
		workflow: "inverse",
		seed: 17,
		system: false,
		rational: {
			gain: "1",
			zeros: cancellation
				? [{ real: "-1", frequency: "0", multiplicity: 1 }]
				: [],
			poles: [
				{ real: "-1", frequency: "0", multiplicity: 1 },
				{ real: "-4", frequency: "0", multiplicity: 1 },
			],
			region: -1,
			delay: "0",
		},
	};
}

describe("Laplace inverse tutoring", () => {
	/** Checks natural system notation against an independently supplied answer. */
	it("uses the system response label and describes the requested result", () => {
		const spec = inverseSpec(true);
		spec.system = true;
		const problem = createRationalExercise(spec);
		const response = problem.stages
			.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "response")!;
		expect(response.lhs).toBe("h(t)");
		expect(laplaceGoal(spec)).toContain("$h(t)$");
		expect(
			verifyLaplaceTime(
				String.raw`h(t)=e^{-4t}u(t)`,
				problem.terms,
				response.lhs,
			).status,
		).toBe("correct");
		expect(
			verifyLaplaceTime(
				String.raw`z(t)=e^{-4t}u(t)`,
				problem.terms,
				response.lhs,
			).status,
		).toBe("invalid");
		expect(
			verifyLaplaceTime(
				String.raw`h(t)=x(t)=e^{-4t}u(t)`,
				problem.terms,
				response.lhs,
			).status,
		).toBe("invalid");
		for (const workflow of ["inverse", "forward", "ode", "roc"] as const)
			expect(
				laplaceGoal(generateLaplaceExercise(workflow, 73).spec),
			).toMatch(/Find|Solve|Analyze/);
	});
	/** Audits learner-facing instructions independently of generated target strings. */
	it("keeps algebra prompts and surviving-root hints in their actual context", () => {
		for (const workflow of ["inverse", "forward", "roc", "ode"] as const) {
			const problem = generateLaplaceExercise(workflow, 73);
			for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
				if (task.kind === "fields" && !task.id.startsWith("ode-"))
					expect(task.prompt).not.toMatch(
						/initial values|initial output/,
					);
				expect(task.hints).toHaveLength(3);
				expect(task.explanation).not.toContain(
					"Your submitted result satisfies",
				);
				if (task.id.startsWith("surviving-")) {
					expect(task.hints[1]).toContain(
						"Subtract only matching canceled copies",
					);
					expect(task.hints[1]).not.toContain(
						"Other polynomial roots",
					);
				}
			}
		}
	});
	it("always asks the same cancellation question without a spoiler header", () => {
		const problems = [false, true].map((cancellation) =>
			createRationalExercise(inverseSpec(cancellation)),
		);
		const tasks = problems.map((problem) =>
			problem.stages
				.flatMap((stage) => stage.tasks)
				.find((task) => task.id === "cancellation")!,
		);
		expect(tasks[0]!.prompt).toBe(tasks[1]!.prompt);
		expect(tasks[0]!.choices).toEqual(tasks[1]!.choices);
		expect(tasks.map((task) => task.answer)).toEqual([
			"No common factors",
			"Common factors exist",
		]);
		for (const problem of problems) {
			expect(problem.conditions).not.toContain("-4");
			expect(problem.stages.length).toBeLessThanOrEqual(8);
		}
	});
	it("gives every generated task an independently verifiable target", () => {
		for (const cancellation of [false, true]) {
			const problem = createRationalExercise(inverseSpec(cancellation));
			for (const task of problem.stages.flatMap((stage) => stage.tasks)) {
				if ("construction" in task)
					expect(
						validateConstruction(task, task.construction).status,
					).toBe("correct");
				else if (task.kind === "fields")
					for (const field of task.fields)
						expect(
							verifyLaplaceS(field.target, field.target).status,
						).toBe("correct");
				else if (task.kind === "choice")
					expect(task.choices).toContain(task.answer);
				else
					expect(
						task.kind === "t"
							? verifyLaplaceTime(
									task.answer,
									task.terms ?? problem.terms,
								).status
							: verifyLaplaceS(task.answer, task.answer).status,
						task.id,
					).toBe("correct");
			}
		}
	});
});
