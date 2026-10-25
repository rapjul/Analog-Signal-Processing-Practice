import { describe, expect, it } from "vitest";
import {
	createLaplaceExercise,
	parseLaplaceConfiguration,
	serializeLaplaceConfiguration,
} from "$lib/math-engine/laplace/configuration";
import {
	generateLaplaceExercise,
	LAPLACE_PRESETS,
} from "$lib/math-engine/laplace/generator";

describe("reproducible bounded Laplace configuration", () => {
	it("generates every preset deterministically in every workflow and round-trips URLs", () => {
		for (const workflow of ["inverse", "forward", "roc", "ode"] as const)
			for (const preset of LAPLACE_PRESETS) {
				const problem = generateLaplaceExercise(workflow, 73, preset);
				expect(
					generateLaplaceExercise(workflow, 73, preset).transform,
				).toBe(problem.transform);
				expect(
					parseLaplaceConfiguration(
						serializeLaplaceConfiguration(problem.spec),
					),
				).toEqual(problem.spec);
			}
	});
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
