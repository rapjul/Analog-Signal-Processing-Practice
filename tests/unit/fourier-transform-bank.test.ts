import { describe, expect, it } from "vitest";
import { CTFT_EXAM_BANK } from "$lib/problems/bank/fourier-transform-bank";

describe("CTFT Problem Bank (fourier-transform-bank.ts)", () => {
	it("should contain hand-curated UIUC ECE 210 CTFT problems", () => {
		expect(CTFT_EXAM_BANK.length).toBeGreaterThan(0);
	});

	it("should enforce \\operatorname for all custom operators across all bank questions", () => {
		for (const item of CTFT_EXAM_BANK) {
			expect(item.promptLatex).not.toContain("\\text{sinc}");
			expect(item.promptLatex).not.toContain("\\text{rect}");
			expect(item.referenceAnswerLatex).not.toContain("\\text{sinc}");
			expect(item.referenceAnswerLatex).not.toContain("\\text{rect}");
		}
	});

	it("should provide multi-step solution breakdowns for every bank problem", () => {
		for (const item of CTFT_EXAM_BANK) {
			expect(item.solutionSteps.length).toBeGreaterThanOrEqual(2);
			for (const step of item.solutionSteps) {
				expect(step.title).toBeDefined();
				expect(step.latex).toBeDefined();
			}
		}
	});
});
