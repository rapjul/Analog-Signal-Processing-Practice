import { describe, expect, it } from "vitest";
import {
	laplaceExpression,
	renderLaplaceFields,
} from "$lib/math-engine/laplace/answer-entry";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { generateLaplaceExercise } from "$lib/math-engine/laplace/generator";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";

describe("guided Laplace answer entry", () => {
	/** Checks independent equivalent notation rather than the engine's displayed answer. */
	it("accepts unary negative impulses without permitting distribution products", () => {
		const terms = [
			{
				kind: "impulse" as const,
				amplitude: "-1/2",
				rate: "0",
				frequency: "0",
				power: 0,
				delay: "2",
				side: "right" as const,
			},
		];
		for (const answer of [
			String.raw`-\delta(t-2)/2`,
			String.raw`(-1/2)\delta(t-2)`,
			String.raw`0-\delta(t-2)/2`,
			String.raw`-1/2*\delta(t-2)`,
		])
			expect(verifyLaplaceTime(answer, terms).status, answer).toBe(
				"correct",
			);
		expect(verifyLaplaceTime(String.raw`\delta(t-2)/2`, terms).status).toBe(
			"incorrect",
		);
		for (const answer of [
			String.raw`-\delta(t)^2`,
			String.raw`-\delta(t)u(t)`,
			String.raw`-\delta(t)\delta(t)`,
		])
			expect(verifyLaplaceTime(answer, terms).status).not.toBe("correct");
	});
	for (const initial of [
		["0", "0"],
		["0", "2"],
		["-2", "0"],
		["1/2", "-3/2"],
		["2", "3"],
	] as [string, string][])
		it(`checks independent derivative fields for initial state ${initial.join(",")}`, () => {
			const spec = generateLaplaceExercise("ode", 73, "repeated").spec;
			if (spec.workflow !== "ode")
				throw new Error("Expected ODE fixture.");
			spec.initial = initial;
			const problem = createLaplaceExercise(spec);
			const tasks = problem.stages.flatMap((stage) => stage.tasks);
			const fieldTasks = tasks
				.filter((task) => task.kind === "fields")
				.filter((task) =>
					["ode-derivative-values", "ode-second-values"].includes(
						task.id,
					),
				);
			expect(fieldTasks).toHaveLength(2);
			for (const task of fieldTasks) {
				expect(renderLaplaceFields(task.frame, {})).toContain(
					"\\square",
				);
				expect(
					validateLaplaceTask(task, "", {}, problem.terms).result
						.status,
				).toBe("invalid");
				const inputs = Object.fromEntries(
					task.fields.map((field) => [
						field.id,
						`(${field.target})+0`,
					]),
				);
				expect(
					validateLaplaceTask(task, "", inputs, problem.terms).result
						.status,
				).toBe("correct");
				inputs[task.fields[0]!.id] = `(${task.fields[0]!.target})+1`;
				const wrong = validateLaplaceTask(
					task,
					"",
					inputs,
					problem.terms,
				);
				expect(wrong.result.status).toBe("incorrect");
				if (task.fields.length === 2)
					expect(wrong.fields.dy0!.status).toBe("correct");
			}
			for (const id of ["ode-derivative", "ode-second"]) {
				const task = tasks.find((task) => task.id === id)!;
				const expanded = task.choices!.map((choice) =>
					choice
						.replaceAll("$", "")
						.replaceAll("y'(0^-)", "3")
						.replaceAll("y(0^-)", "2")
						.replaceAll("Y(s)", "7"),
				);
				const target = task.answer
					.replaceAll("$", "")
					.replaceAll("y'(0^-)", "3")
					.replaceAll("y(0^-)", "2")
					.replaceAll("Y(s)", "7");
				expect(
					expanded.filter(
						(choice) =>
							verifyLaplaceS(choice, target).status === "correct",
					),
				).toHaveLength(1);
			}
		});
	it("accepts supported bare and prefixed expressions while refusing other assignments", () => {
		const spec = generateLaplaceExercise("inverse", 73, "impulse").spec;
		const problem = createLaplaceExercise(spec);
		for (const prefix of ["", "x(t)=", " y ( t ) = "])
			expect(
				verifyLaplaceTime(prefix + problem.response, problem.terms)
					.status,
			).toBe("correct");
		const lhs = "y_{\\mathrm{ZI}}(t)";
		expect(
			verifyLaplaceTime(`${lhs}=${problem.response}`, problem.terms, lhs)
				.status,
		).toBe("correct");
		expect(verifyLaplaceS(" Y ( s ) = 1/(s+2)", "1/(s+2)").status).toBe(
			"correct",
		);
		for (const answer of [
			"z(t)=0",
			"y(s)=0",
			"x(t)=y(t)=0",
			"y(t)=",
			"y(t)==0",
		])
			expect(verifyLaplaceTime(answer, []).status).toBe("invalid");
		expect(verifyLaplaceTime("y(t)=1", []).status).toBe("incorrect");
		expect(verifyLaplaceS("Y(s)", "0").status).not.toBe("correct");
		expect(laplaceExpression("y(t)=0", "t")).toBe("0");
	});
});
