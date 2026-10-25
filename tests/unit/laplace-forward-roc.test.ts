import { describe, expect, it } from "vitest";
import { createForwardExercise } from "$lib/math-engine/laplace/its-scaffolding/forward";
import { createRocExercise } from "$lib/math-engine/laplace/its-scaffolding/roc";
import type { LaplaceSignalTerm } from "$lib/math-engine/laplace/types";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";
import { forwardFixtures, pairFixtures } from "./laplace-fixtures";

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
	it("removes delayed finite-duration tails and lowers surviving pole multiplicity exactly", () => {
		const finite = createForwardExercise({
			workflow: "forward",
			seed: 1,
			terms: [term("0"), { ...term("0", "-1"), delay: "1/3" }],
		});
		expect(finite.roc).toEqual([-Infinity, Infinity]);
		expect(finite.poles).toEqual([]);
		const lowered = createForwardExercise({
			workflow: "forward",
			seed: 1,
			terms: [
				{ ...term("0"), power: 1 },
				{ ...term("0", "-1"), power: 1, delay: "1" },
			],
		});
		expect(lowered.poles).toEqual([
			{ real: "0", frequency: "0", multiplicity: 1 },
		]);
		expect(lowered.roc).toEqual([0, Infinity]);
	});
	it("checks preserved bank pairs against independently specified signal terms", () => {
		const cases: LaplaceSignalTerm[][] = [
			[
				{ ...term("0", "3"), kind: "cosine", frequency: "4" },
				{ ...term("0", "2"), kind: "sine", frequency: "4" },
			],
			[{ ...term("-3"), kind: "cosine", frequency: "5" }],
			[{ ...term("-5", "4"), delay: "2" }],
			[{ ...term("-4"), power: 3 }],
			[{ ...term("0", "5"), kind: "impulse" }, term("-2", "6")],
			[term("-3", "4"), term("-5", "2")],
			[term("-1"), term("-4", "-1")],
			[term("0", "3"), term("-2", "2")],
			[{ ...term("0"), kind: "impulse" }, term("-2", "4")],
		];
		[...pairFixtures, ...forwardFixtures].forEach((fixture, index) => {
			const problem = createForwardExercise({
				workflow: "forward",
				seed: 1,
				terms: cases[index]!,
			});
			expect(
				verifyLaplaceS(fixture.transform, problem.transform).status,
				fixture.transform,
			).toBe("correct");
			expect(
				verifyLaplaceTime(fixture.inverse, problem.terms).status,
				fixture.inverse,
			).toBe("correct");
		});
	});
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
