import { describe, expect, it } from "vitest";
import {
	decompose,
	inverseTerms,
	rocBounds,
} from "$lib/math-engine/laplace/pfd";
import { responseLatex } from "$lib/math-engine/laplace/signals";
import type { RationalSpec } from "$lib/math-engine/laplace/types";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";

/** @param real - Real part. @param multiplicity - Copies. @param frequency - Imaginary magnitude. @returns Exact factor. */
const f = (real: string, multiplicity = 1, frequency = "0") => ({
	real,
	frequency,
	multiplicity,
});
/** @param partial - Scenario values. @returns Bounded exact rational specification. */
const spec = (partial: Partial<RationalSpec> = {}): RationalSpec => ({
	gain: "1",
	zeros: [],
	poles: [f("-1"), f("-4")],
	delay: "0",
	region: -1,
	...partial,
});

describe("expanded exact Laplace mathematics", () => {
	it("distinguishes cancellation, multiplicity, no finite zeros, and nearby roots", () => {
		const reduced = decompose(spec({ zeros: [f("-1")] }));
		expect(reduced.zeros).toEqual([]);
		expect(reduced.poles).toEqual([f("-4")]);
		expect(reduced.canceled).toEqual([f("-1")]);
		expect(decompose(spec({ zeros: [f("-1", 2)] })).zeros).toEqual([
			f("-1"),
		]);
		expect(
			decompose(spec({ zeros: [f("-1.000000000000001")] })).canceled,
		).toEqual([]);
		expect(decompose(spec({ gain: "0" })).poles).toEqual([]);
	});
	it("inverts repeated, conjugate, delayed, and constant-quotient terms", () => {
		for (const [input, expected] of [
			[spec({ gain: "6", poles: [f("-4", 4)] }), "t^3e^{-4t}u(t)"],
			[spec({ poles: [f("-3", 1, "5")] }), "e^{-3t}\\sin(5t)u(t)/5"],
			[
				spec({ gain: "4", poles: [f("-5")], delay: "2" }),
				"4e^{-5(t-2)}u(t-2)",
			],
			[
				spec({ zeros: [f("-6")], poles: [f("-2")] }),
				"\\delta(t)+4e^{-2t}u(t)",
			],
		] as [RationalSpec, string][]) {
			const data = decompose(input),
				terms = inverseTerms(data, input);
			expect(
				verifyLaplaceS(
					data.expansion,
					`(${data.quotient})+(${data.expansion})-(${data.quotient})`,
				).status,
			).toBe("correct");
			expect(
				verifyLaplaceTime(expected, terms),
				responseLatex(terms),
			).toMatchObject({ status: "correct" });
		}
	});
	it("uses adjacent distinct real parts and correct left-sided repeated-pole signs", () => {
		expect(rocBounds([f("-3"), f("-1"), f("2")], 1)).toEqual([-3, -1]);
		expect(() => rocBounds([f("-1", 1, "2")], 2)).toThrow();
		const input = spec({ poles: [f("2", 2)], region: 0 });
		expect(
			verifyLaplaceTime(
				"-te^{2t}u(-t)",
				inverseTerms(decompose(input), input),
			).status,
		).toBe("correct");
	});
	it("never certifies wrong support, hidden tails, extra impulses, or impulse derivatives", () => {
		const input = spec({ poles: [f("-1")], delay: "2" });
		const terms = inverseTerms(decompose(input), input);
		for (const answer of [
			"e^{-(t-2)}u(t)",
			"e^{-(t-2)}u(t-2)+u(t-100)",
			"e^{-(t-2)}u(t-2)+\\delta(t-100)",
			"e^{-(t-2)}u(t-2)+\\delta'(t)",
		])
			expect(verifyLaplaceTime(answer, terms).status).not.toBe("correct");
		expect(verifyLaplaceS("1/(s+1)+1/(s+100)", "1/(s+1)").status).toBe(
			"incorrect",
		);
	});
});
