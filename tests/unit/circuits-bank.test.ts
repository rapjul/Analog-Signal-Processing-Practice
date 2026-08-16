import { describe, expect, it } from "vitest";
import { CIRCUITS_EXAM_BANK } from "$lib/problems/bank/circuits-bank";

describe("Circuits Exam Problem Bank (circuits-bank.ts)", () => {
	it("should contain at least 12 hand-curated ECE 210 circuit problems", () => {
		expect(CIRCUITS_EXAM_BANK.length).toBeGreaterThanOrEqual(12);
	});

	it("should cover all 6 circuit topologies", () => {
		const topologies = new Set(
			CIRCUITS_EXAM_BANK.map((item) => item.topology),
		);
		expect(topologies.has("series-rlc")).toBe(true);
		expect(topologies.has("parallel-rlc")).toBe(true);
		expect(topologies.has("parallel-lc-series-r")).toBe(true);
		expect(topologies.has("parallel-rc-series-l")).toBe(true);
		expect(topologies.has("rc-lpf")).toBe(true);
		expect(topologies.has("active-sallen-key")).toBe(true);
	});

	it("should provide zero-guesswork solution breakdowns for every problem", () => {
		for (const item of CIRCUITS_EXAM_BANK) {
			expect(item.solutionSteps.length).toBeGreaterThanOrEqual(2);
			for (const step of item.solutionSteps) {
				expect(step.title).toBeDefined();
				expect(step.latex).toBeDefined();
			}
		}
	});
});
