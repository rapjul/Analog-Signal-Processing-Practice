import { describe, expect, it } from "vitest";
import { createLaplaceExercise } from "$lib/math-engine/laplace/configuration";
import { supportTasks } from "$lib/math-engine/laplace/its-scaffolding/support";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import type { LaplaceSignalTerm } from "$lib/math-engine/laplace/types";
import { verifyLaplaceInterval } from "$lib/math-engine/laplace/verification";

/** @param side - Support direction. @param delay - Exact boundary. @param amplitude - Signed weight. @returns Independent step fixture. */
function term(
	side: "left" | "right",
	delay = "0",
	amplitude = "1",
): LaplaceSignalTerm {
	return {
		kind: "exponential",
		side,
		delay,
		amplitude,
		rate: "0",
		frequency: "0",
		power: 0,
	};
}
describe("checked support interval evidence", () => {
	/** Unchecked terms can correctly describe an empty interval, but a blank sum is never verified. */
	it("requires an explicit zero sum for an interval with no active ordinary terms", () => {
		const original = [term("right", "1")];
		const first = supportTasks(original, original)[0]!;
		if (first.kind !== "fields")
			throw new Error("Expected interval fields");
		expect(first.fields[0]!.entry?.kind).toBe("boolean");
		expect(validateLaplaceTask(first, "", {}, []).result.status).toBe(
			"invalid",
		);
		expect(
			validateLaplaceTask(first, "", { combined: "0" }, []).result.status,
		).toBe("correct");
		expect(
			validateLaplaceTask(
				first,
				"",
				{ combined: "0", "active-0": "1" },
				[],
			).result.status,
		).toBe("incorrect");
	});
	/** Reproducibility must not leave the correct assembly at one fixed position across problems. */
	it("shuffles assembly choices reproducibly using problem context", () => {
		const positions = new Set<number>();
		for (let amplitude = 1; amplitude <= 16; amplitude++) {
			const original = [term("left", "0", String(amplitude))];
			const first = supportTasks(original, original).at(-1)!;
			const second = supportTasks(original, original).at(-1)!;
			expect(first.choices).toEqual(second.choices);
			expect(new Set(first.choices).size).toBe(2);
			positions.add(first.choices!.indexOf(first.answer));
		}
		expect(positions).toEqual(new Set([0, 1]));
	});
	/** The reported cross-delay cancellation needs actual interval work. */
	it("requires activity fields and ordinary sums before assembling a transformable signal", () => {
		const problem = createLaplaceExercise({
			workflow: "forward",
			seed: 73,
			terms: [term("right"), term("left"), term("right", "1", "-1")],
		});
		const tasks = problem.stages.find(
			(stage) => stage.id === "combine-support",
		)!.tasks;
		const intervals = tasks.filter((task) => task.kind === "fields");
		expect(intervals.map((task) => task.fields.at(-1)!.target)).toEqual([
			"1",
			"1",
			"1-1",
		]);
		for (const task of intervals) {
			expect(
				validateLaplaceTask(task, "u(t)+u(-t)-u(t-1)", {}, []).result
					.status,
			).toBe("invalid");
			const values = Object.fromEntries(
				task.fields.map((field) => [field.id, field.target]),
			);
			expect(
				validateLaplaceTask(task, "", values, []).result.status,
			).toBe("correct");
			const wrongActivity = {
				...values,
				"active-0": values["active-0"] === "1" ? "0" : "1",
			};
			expect(
				validateLaplaceTask(task, "", wrongActivity, []).fields[
					"active-0"
				]!.message,
			).toContain("support boundary");
			values.combined = "u(t)+u(-t)-u(t-1)";
			expect(
				validateLaplaceTask(task, "", values, []).result.status,
			).toBe("invalid");
		}
		expect(tasks.at(-1)!.formula).toContain("\\begin{cases}");
	});
	/** Equivalent rational delays create one boundary and impulses stay separate. */
	it("deduplicates exact boundaries and retains separate impulse metadata", () => {
		const original = [
			term("left", "1/2"),
			term("right", "0.5"),
			{ ...term("right", "1/2", "2"), kind: "impulse" as const },
		];
		const tasks = supportTasks(original, original);
		expect(tasks.filter((task) => task.kind === "fields")).toHaveLength(2);
		expect(tasks[0]!.formula).toContain("\\delta");
		expect(tasks.at(-1)!.hints[1]).toContain("\\delta");
	});
	/** Tests symbolic identities over the complete interval, not one numerical sample. */
	it("accepts equivalent ordinary expressions and rejects support functions, impulses, and wrong sums", () => {
		const interval = { min: "1/2", max: "3/2" };
		expect(
			verifyLaplaceInterval("2*(t-1/2)", "2t-1", interval).status,
		).toBe("correct");
		expect(verifyLaplaceInterval("2t", "2t-1", interval).status).toBe(
			"incorrect",
		);
		for (const expression of ["u(t)", "\\delta(t-1)"])
			expect(
				verifyLaplaceInterval(expression, "1", interval).status,
			).toBe("invalid");
	});
});
