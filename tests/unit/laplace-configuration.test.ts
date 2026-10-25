import { describe, expect, it } from "vitest";
import {
	createLaplaceExercise,
	parseLaplaceConfiguration,
	serializeLaplaceConfiguration,
} from "$lib/math-engine/laplace/configuration";
import { validateConstruction } from "$lib/math-engine/laplace/construction";
import {
	generateLaplaceExercise,
	LAPLACE_PRESETS,
} from "$lib/math-engine/laplace/generator";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";

describe("reproducible bounded Laplace configuration", () => {
	it("accepts identically zero inverse transforms with a complete verifiable path", () => {
		const input = generateLaplaceExercise("inverse", 73).spec;
		if (input.workflow !== "inverse")
			throw new Error("Expected inverse fixture.");
		input.rational.gain = "0";
		const problem = createLaplaceExercise(input);
		expect(problem.response).toBe("0");
		expect(problem.poles).toEqual([]);
		expect(problem.roc).toEqual([-Infinity, Infinity]);
	});
	for (const workflow of ["inverse", "forward", "roc", "ode"] as const)
		for (const preset of LAPLACE_PRESETS)
			it(`generates and round-trips ${workflow}/${preset} with verifiable tasks`, () => {
				const problem = generateLaplaceExercise(workflow, 73, preset);
				expect(
					generateLaplaceExercise(workflow, 73, preset).transform,
				).toBe(problem.transform);
				expect(
					parseLaplaceConfiguration(
						serializeLaplaceConfiguration(problem.spec),
					),
				).toEqual(problem.spec);
				for (const task of problem.stages.flatMap(
					(stage) => stage.tasks,
				)) {
					const result =
						"construction" in task
							? validateConstruction(task, task.construction)
									.status === "correct"
							: task.kind === "fields"
								? task.fields.every(
										(field) =>
											verifyLaplaceS(
												field.target,
												field.target,
											).status === "correct",
									)
								: task.kind === "choice"
									? task.choices?.includes(task.answer)
									: (task.kind === "t"
											? verifyLaplaceTime(
													task.answer,
													task.terms ?? problem.terms,
												)
											: verifyLaplaceS(
													task.answer,
													task.answer,
												)
										).status === "correct";
					expect(result, `${workflow}/${preset}/${task.id}`).toBe(
						true,
					);
				}
			}, 15000);
	it("explains unsupported versions, excessive orders, malformed literals, and derivative quotients", () => {
		expect(() =>
			parseLaplaceConfiguration(new URLSearchParams("v=2&config={}")),
		).toThrow(/version/);
		const spec = generateLaplaceExercise().spec;
		if (spec.workflow !== "inverse")
			throw new Error("Expected inverse fixture.");
		spec.rational.gain = "1/0";
		expect(() => createLaplaceExercise(spec)).toThrow();
		spec.rational.gain = "1";
		spec.rational.zeros[0]!.multiplicity = 4;
		expect(() => createLaplaceExercise(spec)).toThrow(
			/impulse derivatives/,
		);
		expect(() =>
			createLaplaceExercise({ workflow: "inverse", seed: -1 }),
		).toThrow(/seed/);
	});
});
