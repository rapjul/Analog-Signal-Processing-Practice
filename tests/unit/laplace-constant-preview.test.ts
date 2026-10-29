import { describe, expect, it } from "vitest";
import {
	constructionPreview,
	validateConstruction,
} from "$lib/math-engine/laplace/construction";
import type { LaplaceConstructionTask } from "$lib/math-engine/laplace/types";
import {
	isParsableLaplaceConstant,
	verifyLaplaceScalar,
} from "$lib/math-engine/laplace/verification";

/** Independent one-pole template with a constant quotient. */
const task: LaplaceConstructionTask = {
	id: "preview-template",
	title: "Construct the decomposition",
	prompt: "Enter the constant quotient and pole term.",
	answer: "",
	hints: [],
	kind: "template",
	construction: {
		mode: "finite",
		gain: "1",
		rows: [
			{
				kind: "linear",
				first: "2",
				second: "",
				power: "1",
				numerator: "constant",
			},
		],
	},
};

describe("Laplace constant preview eligibility", () => {
	/** Complete arithmetic is eligible without comparing against an answer. */
	it("renders signed, decimal, fractional and calculated constants", () => {
		for (const value of [
			"0",
			"-2",
			"0.125",
			"-3/2",
			String.raw`\frac{1}{3}+\frac{2}{3}`,
			"(2-1)*3/3",
		]) {
			expect(isParsableLaplaceConstant(value), value).toBe(true);
			expect(
				constructionPreview(task, {
					...task.construction,
					gain: value,
				}),
				value,
			).not.toContain("\\square");
		}
	});
	/** Invalid, nonfinite, unsupported and canceled-variable drafts never become completed mathematical previews. */
	it("uses safe placeholders without accepting assignments or free symbols", () => {
		for (const value of [
			"",
			"-",
			"(",
			"1/",
			"1/0",
			String.raw`\sqrt{-1}`,
			"s-s+1",
			"t-t",
			"x=1",
			"1=1=1",
			String.raw`\delta(0)`,
			String.raw`\sum_{k=1}^{3}k`,
		]) {
			expect(isParsableLaplaceConstant(value), value).toBe(false);
			expect(
				constructionPreview(task, {
					...task.construction,
					gain: value,
				}),
				value,
			).toContain("\\square");
		}
	});
	/** Preview validity never validates a wrong quotient or weakens exact comparisons. */
	it("retains independent exact grading after a valid preview", () => {
		expect(isParsableLaplaceConstant("2")).toBe(true);
		expect(
			validateConstruction(task, { ...task.construction, gain: "2" })
				.status,
		).toBe("incorrect");
		expect(verifyLaplaceScalar("(1/3)*3", "1").status).toBe("correct");
		expect(verifyLaplaceScalar("1/3", "1/2").status).toBe("incorrect");
		expect(verifyLaplaceScalar("s-s+1", "1").status).toBe("invalid");
	});
});
