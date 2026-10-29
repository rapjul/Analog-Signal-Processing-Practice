import { describe, expect, it } from "vitest";
import { laplaceGoal } from "$lib/math-engine/laplace/answer-entry";
import { validateConstruction } from "$lib/math-engine/laplace/construction";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { createRationalExercise } from "$lib/math-engine/laplace/its-scaffolding/inverse";
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
	/** Zero gain takes precedence over stale numerator factor metadata in every hint tier. */
	it("keeps zero-factor guidance consistent even when numerator factors are supplied", () => {
		const spec = inverseSpec(true);
		spec.rational.gain = "0";
		const factor = createRationalExercise(spec)
			.stages.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "factor-numerator")!;
		expect(factor.hints[1]).toContain("Identically Zero");
		expect(factor.hints[2]).toContain("Every coefficient is zero");
		expect(factor.hints[2]).not.toContain("candidate factor");
	});
	/** Repeated complex factors remain explicitly outside the agreed mathematical families. */
	it("rejects repeated quadratics before a misleading tutor can start", () => {
		const spec = inverseSpec();
		spec.rational.poles = [{ real: "0", frequency: "1", multiplicity: 2 }];
		expect(() => createRationalExercise(spec)).toThrow(
			"nonrepeated complex-conjugate",
		);
	});
	/** Counts only the default supported path, independently of progress UI numbering. */
	it("keeps a direct pair to fourteen checks and groups only new parameters", () => {
		const spec = inverseSpec();
		spec.rational.poles = [{ real: "-2", frequency: "0", multiplicity: 1 }];
		const problem = createRationalExercise(spec);
		const decisions: Record<string, string> = {};
		const path = problem.stages
			.flatMap((stage) => stage.tasks)
			.filter((part) => {
				if (
					part.when &&
					!part.when.values.includes(decisions[part.when.id] ?? "")
				)
					return false;
				if (part.kind === "choice") decisions[part.id] = part.answer;
				return true;
			});
		expect(path).toHaveLength(14);
		const ids = path.map((part) => part.id);
		for (const omitted of [
			"canceled-factors",
			"surviving-zeros",
			"surviving-poles",
			"direct-weights-values",
		])
			expect(ids, omitted).not.toContain(omitted);
		const parameters = path.find(
			(part) => part.id === "pair-parameters-0-values",
		)!;
		expect(parameters.kind).toBe("fields");
		if (parameters.kind === "fields")
			expect(parameters.fields.map((field) => field.id)).toEqual([
				"delay",
				"parameter",
			]);
		expect(
			path
				.find((part) => part.id === "cancellation")!
				.conclusions?.join(" "),
		).toContain("remain the poles");
		spec.rational.poles[0]!.multiplicity = 4;
		const repeated = createRationalExercise(spec)
			.stages.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "pair-parameters-0-values")!;
		expect(repeated.kind).toBe("fields");
		if (repeated.kind === "fields")
			expect(repeated.fields.map((field) => field.id)).toContain(
				"weight",
			);
	});
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
		for (const workflow of ["inverse", "forward", "ode", "roc"] as const) {
			expect(
				laplaceGoal(generateLaplaceExercise(workflow, 73).spec),
			).toMatch(/Find|Solve|Analyze/);
			if (workflow === "forward")
				expect(
					generateLaplaceExercise(workflow, 73)
						.stages.flatMap((stage) => stage.tasks)
						.find((task) => task.id === "forward-final")!.lhs,
				).toBe("X(s)");
		}
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
