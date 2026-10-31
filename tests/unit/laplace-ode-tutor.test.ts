import { describe, expect, it } from "vitest";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { createOdeExercise } from "$lib/math-engine/laplace/its-scaffolding/ode";
import { evaluateResponse } from "$lib/math-engine/laplace/signals";
import type { OdeExercise } from "$lib/math-engine/laplace/types";
import { verifyLaplaceTime } from "$lib/math-engine/laplace/verification";
import { generateOdeProblem } from "$lib/math-engine/odes/index";

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
	it("accepts zero initial state and combines coincident impulse weights exactly", () => {
		const input = fixture(true, "1/2");
		input.leading = "2";
		input.initial = ["0", "0"];
		input.terms = [
			{ ...input.terms[0]!, amplitude: "2" },
			{ ...input.terms[0]!, amplitude: "3", delay: "0.5", rate: "-17" },
		];
		const problem = createLaplaceExercise(input);
		const jumps = problem.stages
			.flatMap((stage) => stage.tasks)
			.filter((task) => task.id.startsWith("jump-"));
		expect(jumps).toHaveLength(1);
		expect(jumps[0]!.answer).toBe("\\frac{5}{2}");
		expect(
			problem.stages
				.flatMap((stage) => stage.tasks)
				.find((task) => task.id === "ode-check-zi")?.answer,
		).toBe("0");
	});
	it("cancels a mode between zero-input and zero-state contributions before reporting the final ROC", () => {
		const input = fixture(false);
		input.initial = ["-1", "0"];
		input.terms[0]!.amplitude = "1";
		input.terms[0]!.rate = "-3";
		const problem = createOdeExercise(input);
		expect(problem.poles).toEqual([
			{ real: "-3", frequency: "0", multiplicity: 1 },
		]);
		expect(problem.roc).toEqual([-3, Infinity]);
	});
	it("cross-checks overlapping forcing and root families against the completed ODE solver", () => {
		for (const rootType of [
			"distinct_real",
			"repeated_real",
			"complex_conjugate",
		] as const)
			for (const forcingType of [
				"constant",
				"exponential",
				"sinusoid",
			] as const) {
				const reference = generateOdeProblem({
					order: 2,
					rootType,
					forcingType,
					seed: 73,
				});
				const { roots } = reference.params;
				const factors =
					rootType === "complex_conjugate"
						? [
								{
									real: String(roots.r1),
									frequency: String(Math.abs(roots.im!)),
									multiplicity: 1,
								},
							]
						: rootType === "repeated_real"
							? [
									{
										real: String(roots.r1),
										frequency: "0",
										multiplicity: 2,
									},
								]
							: [roots.r1, roots.r2!].map((real) => ({
									real: String(real),
									frequency: "0",
									multiplicity: 1,
								}));
				const problem = createOdeExercise({
					workflow: "ode",
					seed: 73,
					leading: String(reference.params.a2),
					roots: factors,
					initial: [
						String(reference.initialConditions.y0),
						String(reference.initialConditions.dy0),
					],
					terms: [
						{
							kind:
								forcingType === "sinusoid"
									? "cosine"
									: "exponential",
							amplitude: String(reference.forcing.K),
							rate: String(reference.forcing.p ?? 0),
							frequency: String(reference.forcing.omega ?? 0),
							power: 0,
							delay: "0",
							side: "right",
						},
					],
				});
				for (const time of [0, 0.1, 0.5, 1, 2])
					expect(
						evaluateResponse(problem.terms, time),
						`${rootType}/${forcingType}/${time}`,
					).toBeCloseTo(reference.evalComplete(time), 8);
			}
	});
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
