import { describe, expect, it } from "vitest";
import { createForwardExercise } from "$lib/math-engine/laplace/its-scaffolding/forward";
import { createRocExercise } from "$lib/math-engine/laplace/its-scaffolding/roc";
import { verifyLaplaceS } from "$lib/math-engine/laplace/verification";
import type { LaplaceSignalTerm } from "$lib/math-engine/laplace/types";

/** @param rate - Exponential rate. @param amplitude - Weight. @returns Supported signal. */
const term = (rate: string, amplitude = "1"): LaplaceSignalTerm => ({
	kind: "exponential",
	amplitude,
	rate,
	frequency: "0",
	power: 0,
	delay: "0",
	side: "right",
});

describe("forward and ROC workflows", () => {
	it("combines pairs using independent rational identities and removes canceled signals", () => {
		const problem = createForwardExercise({
			workflow: "forward",
			seed: 1,
			terms: [term("-3", "4"), term("-5", "2")],
		});
		expect(
			verifyLaplaceS(problem.transform, "(6s+26)/(s^2+8s+15)").status,
		).toBe("correct");
		expect(problem.roc).toEqual([-3, Infinity]);
		const canceled = createForwardExercise({
			workflow: "forward",
			seed: 1,
			terms: [term("1"), term("1", "-1")],
		});
		expect(canceled.transform).toBe("0");
		expect(canceled.roc).toEqual([-Infinity, Infinity]);
	});
	it("uses adjacent regions for three poles and separates stable noncausal systems", () => {
		const problem = createRocExercise({
			workflow: "roc",
			seed: 1,
			system: true,
			rational: {
				gain: "1",
				zeros: [],
				poles: ["-3", "-1", "2"].map((real) => ({
					real,
					frequency: "0",
					multiplicity: 1,
				})),
				delay: "0",
				region: 2,
			},
		});
		expect(problem.roc).toEqual([-1, 2]);
		expect(problem.stable).toBe(true);
		expect(
			problem.stages
				.flatMap((stage) => stage.tasks)
				.find((task) => task.id === "causality")?.answer,
		).toBe("Noncausal");
		expect(problem.stages[1]!.tasks[0]!.answer).toContain("-3");
	});
});
