import { describe, expect, it } from "vitest";
import { LAPLACE_EXAM_BANK } from "$lib/problems/bank/laplace-bank";

describe("Laplace Exam Problem Bank (laplace-bank.ts)", () => {
	it("should contain at least 12 hand-curated ECE 210 Laplace problems", () => {
		expect(LAPLACE_EXAM_BANK.length).toBeGreaterThanOrEqual(12);
	});

	it("should include problemType property on every bank problem", () => {
		const validTypes = new Set([
			"inverse_pfd",
			"inverse_direct",
			"forward",
			"roc_stability",
		]);
		for (const item of LAPLACE_EXAM_BANK) {
			expect(item.problemType).toBeDefined();
			expect(validTypes.has(item.problemType)).toBe(true);
		}
	});

	it("should provide detailed zero-guesswork solution breakdowns for every problem", () => {
		for (const item of LAPLACE_EXAM_BANK) {
			expect(item.solutionSteps.length).toBeGreaterThanOrEqual(2);
			for (const step of item.solutionSteps) {
				expect(step.title).toBeDefined();
				expect(step.latex).toBeDefined();
			}
		}
	});
});
