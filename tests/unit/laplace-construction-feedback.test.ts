import { describe, expect, it } from "vitest";
import { constructionFeedback } from "$lib/math-engine/laplace/construction-feedback";
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
	});
});
