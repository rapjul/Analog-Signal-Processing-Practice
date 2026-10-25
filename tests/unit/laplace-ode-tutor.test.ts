import { describe, expect, it } from "vitest";
import { createOdeExercise } from "$lib/math-engine/laplace/its-scaffolding/ode";
import { evaluateResponse } from "$lib/math-engine/laplace/signals";
import type { OdeExercise } from "$lib/math-engine/laplace/types";
import { verifyLaplaceTime } from "$lib/math-engine/laplace/verification";

/** @param impulse - Whether the input is an impulse. @param delay - Input delay. @returns Independent y'+2y input fixture. */
function fixture(impulse: boolean, delay = "0"): OdeExercise {
	return {
		workflow: "ode",
		seed: 1,
		leading: "1",
		roots: [{ real: "-2", frequency: "0", multiplicity: 1 }],
		initial: ["1", "0"],
		terms: [
			{
				kind: impulse ? "impulse" : "exponential",
				amplitude: "3",
				rate: "0",
				frequency: "0",
				power: 0,
				side: "right",
				delay,
			},
		],
	};
}

describe("Laplace initial-value guidance", () => {
	it("solves an independently derived first-order initial-value problem", () => {
		const problem = createOdeExercise(fixture(false));
		expect(
			verifyLaplaceTime("(3/2-e^{-2t}/2)u(t)", problem.terms).status,
		).toBe("correct");
		expect(problem.stages).toHaveLength(8);
		expect(evaluateResponse(problem.terms, 0)).toBeCloseTo(1);
	});
	it("retains pre-impulse initial values and teaches origin and delayed jumps", () => {
		for (const delay of ["0", "2"]) {
			const problem = createOdeExercise(fixture(true, delay));
			expect(
				verifyLaplaceTime(
					`e^{-2t}u(t)+3e^{-2(t-${delay})}u(t-${delay})`,
					problem.terms,
				).status,
			).toBe("correct");
			expect(problem.conditions).toContain("0^-");
			expect(problem.stages.at(-1)!.tasks[0]!.answer).toBe("3");
		}
	});
	it("handles repeated second-order roots without assuming distinct modes", () => {
		const input = fixture(true);
		input.roots[0]!.multiplicity = 2;
		input.initial = ["0", "0"];
		const problem = createOdeExercise(input);
		expect(verifyLaplaceTime("3te^{-2t}u(t)", problem.terms).status).toBe(
			"correct",
		);
	});
});
