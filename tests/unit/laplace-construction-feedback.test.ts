import { describe, expect, it } from "vitest";
import { constructionFeedback } from "$lib/math-engine/laplace/construction-feedback";
import { validateLaplaceTask } from "$lib/math-engine/laplace/task-validation";
import type {
	LaplaceConstructionTask,
	LaplaceEntryRow,
} from "$lib/math-engine/laplace/types";

/** @param first - Root or coefficient. @param power - Multiplicity. @returns Independent numeric row. */
function row(first: string, power = "1"): LaplaceEntryRow {
	return { kind: "linear", first, second: "", power, numerator: "constant" };
}
/** @returns An independent two-root target, with source-confusion metadata. */
function task(): LaplaceConstructionTask {
	return {
		id: "roots",
		title: "Roots",
		prompt: "Build roots",
		answer: "",
		hints: [],
		kind: "roots",
		construction: {
			mode: "finite",
			gain: "1",
			rows: [row("-2", "2"), row("-3")],
		},
		otherConstruction: { mode: "finite", gain: "1", rows: [row("-5")] },
	};
}
describe("construction field diagnostics", () => {
	/** A substituted wrong row is not evidence that an additional row is needed. */
	it("separates factor multiplication advice from root solving and omitted copies", () => {
		const target = {
			...task(),
			kind: "factors" as const,
			construction: {
				mode: "finite" as const,
				gain: "2",
				rows: [row("6")],
			},
		};
		const feedback = constructionFeedback(target, {
			...target.construction,
			rows: [row("-6")],
		});
		expect(feedback["row-0-first"]!.message).toContain(
			"Multiply the submitted factors",
		);
		expect(feedback["row-0-first"]!.message).not.toContain("solving");
		expect(feedback.rows).toBeUndefined();
		const omitted = constructionFeedback(target, {
			...target.construction,
			rows: [],
		});
		expect(omitted.rows!.message).toContain("missing");
		const roots = { ...target, kind: "roots" as const };
		expect(
			constructionFeedback(roots, {
				...roots.construction,
				rows: [row("-6")],
			})["row-0-first"]!.message,
		).toContain("solving");
	});
	/** Accepted constructions must never display invalid fields beside Continue. */
	it("returns no error diagnostics for accepted rational, split, template, and exceptional forms", () => {
		for (const kind of ["factors", "roots", "template"] as const) {
			const target = {
				...task(),
				kind,
				construction: {
					mode: "finite" as const,
					gain: "1",
					rows: [row("-2")],
				},
			};
			const draft = {
				...target.construction,
				rows: [row("-2/1", "1")],
			};
			const result = validateLaplaceTask(target, "", {}, [], draft);
			expect(result.result.status).toBe("correct");
			expect(result.construction).toEqual({});
		}
		const target = task();
		const split = {
			...target.construction,
			rows: [row("-2"), row("-2"), row("-3")],
		};
		expect(
			validateLaplaceTask(target, "", {}, [], split).construction,
		).toEqual({});
		for (const mode of ["none", "zero"] as const) {
			const exceptional = {
				...target,
				construction: { mode, gain: "", rows: [] },
			};
			expect(
				validateLaplaceTask(
					exceptional,
					"",
					{},
					[],
					exceptional.construction,
				).result.status,
			).toBe("correct");
			expect(
				validateLaplaceTask(
					exceptional,
					"",
					{},
					[],
					exceptional.construction,
				).construction,
			).toEqual({});
		}
	});
	/** Separates a wrong quadratic constant from its already correct linear coefficient. */
	it("identifies the second quadratic field and duplicate PFD terms", () => {
		const target = {
			...task(),
			kind: "template" as const,
			construction: {
				mode: "finite" as const,
				gain: "0",
				rows: [
					{
						...row("2"),
						kind: "quadratic" as const,
						second: "5",
						numerator: "linear" as const,
					},
				],
			},
		};
		const bad = {
			...target.construction,
			rows: [{ ...target.construction.rows[0]!, second: "6" }],
		};
		expect(
			constructionFeedback(target, bad)["row-0-second"]!.message,
		).toContain("second coefficient");
		const duplicate = {
			...target.construction,
			rows: [...target.construction.rows, ...target.construction.rows],
		};
		expect(
			constructionFeedback(target, duplicate)["row-1-power"]!.message,
		).toContain("duplicates");
		expect(
			constructionFeedback(target, {
				...target.construction,
				rows: [{ ...target.construction.rows[0]!, power: "1/1" }],
			})["row-0-power"]?.status,
		).toBe("invalid");
	});
	/** Tests simultaneous errors rather than stopping at the first bad row. */
	it("reports signs, source confusion, and missing copies together", () => {
		const result = constructionFeedback(task(), {
			mode: "finite",
			gain: "",
			rows: [row("2"), row("-5")],
		});
		expect(result["row-0-first"]!.message).toContain("sign");
		expect(result["row-1-first"]!.message).toContain("other polynomial");
		expect(result.rows!.message).toContain("missing");
	});
	/** Exact unordered matching accepts split multiplicities and rational notation. */
	it("accepts reordered exact rows and diagnoses combined multiplicities", () => {
		const target = task();
		expect(
			constructionFeedback(target, {
				mode: "finite",
				gain: "",
				rows: [row("-3"), row("-2/1"), row("-2")],
			}),
		).toEqual({});
		const result = constructionFeedback(target, {
			mode: "finite",
			gain: "",
			rows: [row("-3", "2"), row("-2", "1")],
		});
		expect(result["row-0-power"]!.message).toContain("multiplicity");
		expect(result["row-1-power"]!.message).toContain("multiplicity");
	});
	/** Empty and malformed fields retain independent diagnostics. */
	it("identifies every incomplete field and the gain", () => {
		const target = { ...task(), kind: "factors" as const };
		const result = constructionFeedback(target, {
			mode: "finite",
			gain: "",
			rows: [row("", "")],
		});
		expect(result.gain!.status).toBe("invalid");
		expect(result["row-0-first"]!.status).toBe("invalid");
		expect(result["row-0-power"]!.status).toBe("invalid");
		expect(result.rows).toBeUndefined();
	});
});
