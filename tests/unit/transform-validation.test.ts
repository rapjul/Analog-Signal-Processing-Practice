import { describe, expect, it } from "vitest";
import { Complex } from "$lib/math-engine/complex";
import {
	type TransformReference,
	validateTransformAnswer,
} from "$lib/math-engine/transform-validation";

/** Constant reference for strict parsing and zero fallback regressions. */
const zero: TransformReference = {
	variable: "omega",
	samples: [-1, 0, 1],
	evaluate: () => new Complex(0),
};

describe("strict transform grading", () => {
	/** Invalid expressions must never inherit a plotting fallback of zero. */
	it("rejects malformed, unknown, multi-value, and undefined answers", () => {
		for (const input of [
			"",
			"invalid",
			"(0,99)",
			String.raw`\frac{1}{`,
			"1/0",
			"z-z",
		])
			expect(validateTransformAnswer(input, zero).status).not.toBe(
				"correct",
			);
		expect(validateTransformAnswer("0", zero).status).toBe("correct");
		expect(validateTransformAnswer("omega-omega", zero).status).toBe(
			"correct",
		);
	});
	/** Distribution structure must be checked separately from its regular zero part. */
	it("normalizes impulse scaling, cancellation, and smooth multipliers", () => {
		const reference = {
			...zero,
			impulses: [{ location: 2, weight: new Complex(3) }],
		};
		for (const answer of [
			String.raw`3\delta(\omega-2)`,
			String.raw`6\delta(2\omega-4)`,
			String.raw`(\omega+1)\delta(\omega-2)`,
			String.raw`4\delta(\omega-2)-\delta(\omega-2)`,
		])
			expect(validateTransformAnswer(answer, reference).status).toBe(
				"correct",
			);
		for (const answer of [
			"0",
			String.raw`3\delta(\omega+2)`,
			String.raw`2\delta(\omega-2)`,
			String.raw`3\delta(\omega-2)+1`,
			String.raw`\delta(\omega^2-4)`,
			String.raw`\delta(\omega-2)^2`,
		])
			expect(validateTransformAnswer(answer, reference).status).not.toBe(
				"correct",
			);
	});
});
