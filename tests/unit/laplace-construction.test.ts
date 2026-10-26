import { describe, expect, it } from "vitest";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import {
	emptyConstruction,
	validateConstruction,
} from "$lib/math-engine/laplace/construction";
import {
	generateLaplaceExercise,
	LAPLACE_PRESETS,
} from "$lib/math-engine/laplace/generator";
import type {
	LaplaceConstruction,
	LaplaceConstructionTask,
	LaplaceEntryRow,
} from "$lib/math-engine/laplace/types";
import { verifyLaplaceS } from "$lib/math-engine/laplace/verification";

/** @param first - Signed linear constant or real root. @param power - Multiplicity. @returns Independent linear row. */
function linear(first: string, power = "1"): LaplaceEntryRow {
	return { kind: "linear", first, second: "", power, numerator: "constant" };
}

/** @param kind - Mathematical control. @param rows - Independently specified factors or roots. @param gain - Outside gain. @returns Small exact fixture. */
function fixture(
	kind: LaplaceConstructionTask["kind"],
	rows: LaplaceEntryRow[],
	gain = "1",
): LaplaceConstructionTask {
	return {
		id: "independent",
		title: "Independent construction",
		prompt: "Construct the expression.",
		answer: "",
		hints: [],
		kind,
		construction: { mode: "finite", gain, rows },
	};
}

describe("exact learner-built Laplace mathematics", () => {
	/** Ensures zero and constant setup never asks for nonexistent polynomial factors. */
	it("teaches exceptional factorizations before ordinary division", () => {
		for (const gain of ["0", "3/2"]) {
			const problem = createLaplaceExercise({
				workflow: "inverse",
				seed: 1,
				system: false,
				rational: {
					gain,
					zeros: [],
					poles: [],
					delay: "0",
					region: -1,
				},
			});
			const task = problem.stages
				.flatMap((stage) => stage.tasks)
				.find((entry) => entry.id === "factor-numerator")!;
			expect(task.hints[1]).toContain(
				gain === "0"
					? "dividing by a leading coefficient of zero is undefined"
					: "outside gain",
			);
			expect(task.hints[1]).not.toContain("Divide by that coefficient");
		}
	});
	/** Probes changed coefficients so a fixed worked example cannot satisfy the curriculum contract. */
	it("uses the actual polynomial in division, method, and template hints", () => {
		const spec = generateLaplaceExercise("inverse", 42, "repeated").spec;
		if (spec.workflow !== "inverse")
			throw new Error("Expected rational fixture.");
		spec.rational.poles = [{ real: "-7", frequency: "0", multiplicity: 3 }];
		const tasks = createLaplaceExercise(spec).stages.flatMap(
			(stage) => stage.tasks,
		);
		expect(
			tasks.find((task) => task.id === "division")!.hints[2],
		).toContain("\\deg D=3");
		expect(tasks.find((task) => task.id === "method")!.hints[2]).toContain(
			"s^{3}+21s^{2}+147s+343",
		);
		expect(
			tasks.find((task) => task.id === "template")!.hints[2],
		).toContain("s+7");
	});
	it("works inverse-pair hints in time rather than repeating the transform being inverted", () => {
		const tasks = ["delay", "two-sided"]
			.flatMap(
				(preset) =>
					generateLaplaceExercise(
						"inverse",
						73,
						preset as "delay" | "two-sided",
					).stages,
			)
			.flatMap((stage) => stage.tasks)
			.filter(
				(task) => task.kind === "t" && task.id.startsWith("inverse-"),
			);
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			expect(task.hints[1]).toContain("For $X(s)=");
			expect(task.hints[2]).toContain("the time shape is");
			expect(task.hints[2]).toContain("in the shape and its support");
			expect(task.hints[2]).not.toContain(
				"The pair with these parameters gives",
			);
			if (
				task.terms?.[0]?.side === "left" &&
				["exponential", "sine"].includes(task.terms[0].kind)
			)
				expect(task.hints[2]).toContain("reverse the left-sided sign");
		}
	});
	it("teaches the zero polynomial rather than nonzero-constant hints for a zero initial-state block", () => {
		const spec = generateLaplaceExercise("ode", 73, "distinct").spec;
		if (spec.workflow !== "ode") throw new Error("Expected ODE fixture.");
		spec.initial = ["0", "0"];
		const problems = createLaplaceExercise(spec)
			.stages.flatMap((stage) => stage.tasks)
			.filter(
				(task) =>
					"construction" in task &&
					task.kind === "roots" &&
					task.construction.mode === "zero",
			);
		expect(problems.length).toBeGreaterThan(0);
		for (const task of problems)
			expect(task.hints[2]).toContain("every value satisfies");
	});
	it("renders a constant factorization without concatenating its gain with a spurious one", () => {
		const problem = createLaplaceExercise({
			workflow: "inverse",
			seed: 1,
			system: false,
			rational: {
				gain: "3/2",
				zeros: [],
				poles: [],
				delay: "0",
				region: -1,
			},
		});
		const task = problem.stages
			.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "factor-numerator")!;
		expect(verifyLaplaceS(task.answer, "3/2").status).toBe("correct");
	});
	it("requires a complete factorization of 2s+12 instead of accepting a copied polynomial", () => {
		const task = fixture("factors", [linear("6")], "2");
		expect(validateConstruction(task, emptyConstruction()).status).toBe(
			"invalid",
		);
		const expanded: LaplaceConstruction = {
			mode: "finite",
			gain: "2s+12",
			rows: [],
		};
		expect(validateConstruction(task, expanded).status).toBe("invalid");
		expect(
			validateConstruction(task, {
				mode: "finite",
				gain: "2.0",
				rows: [linear("12/2")],
			}).status,
		).toBe("correct");
		expect(
			validateConstruction(task, {
				mode: "finite",
				gain: "2",
				rows: [linear("-6")],
			}).status,
		).toBe("incorrect");
	});
	it("accepts unordered and split repeated copies but rejects missing copies", () => {
		const task = fixture("factors", [linear("3", "2"), linear("5")]);
		const draft: LaplaceConstruction = {
			mode: "finite",
			gain: "1",
			rows: [linear("5"), linear("3"), linear("3")],
		};
		expect(validateConstruction(task, draft).status).toBe("correct");
		draft.rows.pop();
		expect(validateConstruction(task, draft).status).toBe("incorrect");
		draft.rows[0]!.power = "1/2";
		expect(validateConstruction(task, draft).status).toBe("invalid");
	});
	it("keeps root signs distinct from factor constants and checks conjugate frequency and multiplicity", () => {
		const pair: LaplaceEntryRow = {
			kind: "quadratic",
			first: "-1/2",
			second: "3/2",
			power: "1",
			numerator: "linear",
		};
		const task = fixture("roots", [pair, linear("-3", "2")]);
		const draft: LaplaceConstruction = {
			mode: "finite",
			gain: "",
			rows: [
				linear("-3", "2"),
				{ ...pair, first: "-0.5", second: "1.5" },
			],
		};
		expect(validateConstruction(task, draft).status).toBe("correct");
		draft.rows[0]!.first = "3";
		expect(validateConstruction(task, draft).message).toMatch(/signs/);
		draft.rows[1]!.second = "-1.5";
		expect(validateConstruction(task, draft).status).toBe("invalid");
	});
	it("distinguishes nonzero constants, the zero polynomial, and no finite roots", () => {
		const constant = fixture("factors", [], "3/2");
		expect(
			validateConstruction(constant, {
				mode: "finite",
				gain: "1.5",
				rows: [],
			}).status,
		).toBe("correct");
		const roots = fixture("roots", []);
		roots.construction.mode = "none";
		expect(
			validateConstruction(roots, { mode: "none", gain: "", rows: [] })
				.status,
		).toBe("correct");
		expect(
			validateConstruction(roots, { mode: "zero", gain: "", rows: [] })
				.status,
		).toBe("incorrect");
		roots.construction.mode = "zero";
		expect(
			validateConstruction(roots, { mode: "zero", gain: "", rows: [] })
				.status,
		).toBe("correct");
	});
	it("checks every PFD power and a general quadratic numerator without accepting duplicate terms", () => {
		const quadratic: LaplaceEntryRow = {
			kind: "quadratic",
			first: "2",
			second: "5",
			power: "1",
			numerator: "linear",
		};
		const task = fixture(
			"template",
			[linear("3"), linear("3", "2"), quadratic],
			"0",
		);
		const draft = structuredClone(task.construction);
		expect(validateConstruction(task, draft).status).toBe("correct");
		draft.rows[2]!.numerator = "constant";
		expect(validateConstruction(task, draft).status).toBe("incorrect");
		draft.rows[2]!.numerator = "linear";
		draft.rows.push(linear("3"));
		expect(validateConstruction(task, draft).status).toBe("incorrect");
	});
	it("retains a surviving zero after partial multiplicity cancellation", () => {
		const problem = createLaplaceExercise({
			workflow: "inverse",
			seed: 73,
			system: false,
			rational: {
				gain: "1",
				zeros: [{ real: "-1", frequency: "0", multiplicity: 3 }],
				poles: [
					{ real: "-1", frequency: "0", multiplicity: 2 },
					{ real: "-4", frequency: "0", multiplicity: 1 },
				],
				delay: "0",
				region: -1,
			},
		});
		const task = problem.stages
			.flatMap((stage) => stage.tasks)
			.find((part) => part.id === "surviving-zeros")!;
		if (task.kind !== "roots")
			throw new Error("Expected root construction.");
		expect(
			validateConstruction(task, {
				mode: "finite",
				gain: "",
				rows: [linear("-1")],
			}).status,
		).toBe("correct");
		expect(
			validateConstruction(task, { mode: "none", gain: "", rows: [] })
				.status,
		).toBe("incorrect");
	});
	for (const workflow of ["inverse", "forward", "roc", "ode"] as const)
		for (const preset of LAPLACE_PRESETS)
			it(`authors ${workflow}/${preset} teaching without missing families or generic fallback hints`, () => {
				const problem = generateLaplaceExercise(workflow, 73, preset);
				const tasks = problem.stages.flatMap((stage) => stage.tasks);
				expect(
					new Set(tasks.map((task) => task.id)).size,
					`${workflow}/${preset}: stable task IDs`,
				).toBe(tasks.length);
				for (const task of tasks) {
					expect(task.hints, task.id).toHaveLength(3);
					expect(task.lesson, task.id).toBeTruthy();
					expect(task.action, task.id).toMatch(/^Check /);
					for (const hint of task.hints)
						expect(hint).not.toMatch(
							/Identify the applicable rule|Use your verified earlier work|Worked guidance:|Check your answer to continue/,
						);
				}
			});
});
