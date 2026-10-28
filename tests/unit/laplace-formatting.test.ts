import { describe, expect, it } from "vitest";
import { fraction, rationalLatex } from "$lib/math-engine/laplace/algebra";
import {
	factorProductLatex,
	scaledLatex,
} from "$lib/math-engine/laplace/formatting";
import {
	responseLatex,
	signalLatex,
	signalOrdinaryLatex,
	signalTransform,
} from "$lib/math-engine/laplace/signals";
import type { LaplaceSignalTerm } from "$lib/math-engine/laplace/types";
import {
	verifyLaplaceS,
	verifyLaplaceTime,
} from "$lib/math-engine/laplace/verification";

/** @param overrides - Independently chosen pair parameters. @returns A unit right-sided step by default. */
function term(overrides: Partial<LaplaceSignalTerm> = {}): LaplaceSignalTerm {
	return {
		kind: "exponential",
		amplitude: "1",
		rate: "0",
		frequency: "0",
		power: 0,
		delay: "0",
		side: "right",
		...overrides,
	};
}

describe("precedence-aware Laplace notation", () => {
	/** Standalone constants survive, while unit products and first powers disappear. */
	it("formats constants, unit factors, shifts, and signed sums", () => {
		expect(signalLatex(term())).toBe("u(t)");
		expect(signalLatex(term({ side: "left", delay: "1" }))).toBe("u(1-t)");
		expect(signalOrdinaryLatex(term())).toBe("1");
		expect(signalLatex(term({ amplitude: "0" }))).toBe("0");
		expect(
			signalLatex(term({ kind: "impulse", amplitude: "-1", delay: "1" })),
		).toBe("-\\delta(t-1)");
		expect(signalLatex(term({ rate: "-1", delay: "1" }))).toBe(
			"e^{-(t-1)}u(t-1)",
		);
		expect(signalLatex(term({ power: 1 }))).toBe("tu(t)");
		expect(
			responseLatex([term(), term({ amplitude: "-1", delay: "1" })]),
		).toBe("u(t)-u(t-1)");
		expect(signalTransform(term({ amplitude: "-1", delay: "1" }))).toBe(
			"-e^{-s}\\frac{1}{s}",
		);
		expect(
			factorProductLatex([
				{ real: "-1", frequency: "0", multiplicity: 1 },
			]),
		).toBe("s+1");
		expect(
			factorProductLatex(
				[{ real: "-1", frequency: "0", multiplicity: 2 }],
				"2",
			),
		).toBe("2(s+1)^{2}");
		expect(
			rationalLatex({ n: [fraction(-1)], d: [fraction(0), fraction(1)] }),
		).toBe("-\\frac{1}{s}");
		expect(scaledLatex(fraction(-1), "t-1", true)).toBe("-(t-1)");
	});
	/** Independently authored time and transform answers catch sign/grouping regressions in both support directions. */
	it("preserves exact mathematics for fractions, delays, trigonometric pairs, and impulses", () => {
		const cases: [Partial<LaplaceSignalTerm>, string, string][] = [
			[{ rate: "-1", delay: "1" }, "exp(1-t)*u(t-1)", "exp(-s)/(s+1)"],
			[
				{ rate: "-1", delay: "1", side: "left" },
				"exp(1-t)*u(1-t)",
				"-exp(-s)/(s+1)",
			],
			[
				{ amplitude: "-1/2", power: 2, rate: "-3/2", delay: "1/2" },
				"-1/2*(t-1/2)^2*exp(-3/2*(t-1/2))*u(t-1/2)",
				"-exp(-s/2)/(s+3/2)^3",
			],
			[
				{ kind: "sine", frequency: "2", delay: "1" },
				"sin(2*(t-1))*u(t-1)",
				"2*exp(-s)/(s^2+4)",
			],
			[
				{ kind: "cosine", frequency: "1", rate: "-1", delay: "1" },
				"exp(1-t)*cos(t-1)*u(t-1)",
				"exp(-s)*(s+1)/((s+1)^2+1)",
			],
			[
				{ kind: "impulse", amplitude: "-1/2", delay: "3/2" },
				String.raw`-1/2*\delta(t-3/2)`,
				"-1/2*exp(-3*s/2)",
			],
		];
		for (const [parameters, time, transform] of cases) {
			const signal = term(parameters);
			expect(verifyLaplaceTime(time, [signal]).status, time).toBe(
				"correct",
			);
			expect(
				verifyLaplaceTime(signalLatex(signal), [signal]).status,
				signalLatex(signal),
			).toBe("correct");
			expect(
				verifyLaplaceS(signalTransform(signal), transform).status,
				signalTransform(signal),
			).toBe("correct");
		}
	});
});
