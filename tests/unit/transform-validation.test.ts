import { describe, expect, it, vi } from "vitest";
import { normalizeCanonicalTransform } from "$lib/math-engine/canonical-transform";
import { Complex } from "$lib/math-engine/complex";
import * as evaluator from "$lib/math-engine/evaluator";
import {
	type TransformReference,
	validateTransformAnswer,
} from "$lib/math-engine/transform-validation";

/** Constant reference for strict parsing and zero fallback regressions. */
const zero: TransformReference = {
	variable: "omega",
	canonicalTarget: normalizeCanonicalTransform(0, "omega"),
	samples: [-1, 0, 1],
	evaluate: () => new Complex(0),
};

describe("strict transform grading", () => {
	/** Matching sample values alone must never provide a completion route. */
	it("requires a canonical target and treats samples as diagnostics only", () => {
		const { canonicalTarget: _target, ...sampleOnly } = zero;
		expect(
			validateTransformAnswer("0", sampleOnly as TransformReference)
				.status,
		).toBe("unsupported");
		expect(
			validateTransformAnswer("1", {
				...zero,
				evaluate: () => new Complex(1),
			}).status,
		).toBe("incorrect");
		expect(
			validateTransformAnswer("0", {
				...zero,
				evaluate: () => new Complex(1),
			}),
		).toMatchObject({ status: "correct", numericCheck: "mismatch" });
	});
	/** Boxed AST operands must receive the same guards as ordinary parser arrays. */
	it("rejects variable roots and powers nested in boxed MathJSON", () => {
		const parse = vi.spyOn(evaluator, "parseStrictLatex");
		try {
			for (const ast of [
				{ fn: ["Sqrt", { fn: ["Power", { sym: "omega" }, 2] }] },
				{ fn: ["Root", 2, { sym: "omega" }] },
				{ fn: ["Power", { fn: ["Add", 100, { sym: "omega" }] }, 0.5] },
			]) {
				parse.mockReturnValueOnce(ast);
				expect(validateTransformAnswer("boxed", zero).status).toBe(
					"unsupported",
				);
			}
		} finally {
			parse.mockRestore();
		}
	});
	/** Equivalent root spellings must not hide a hinge outside the sample interval. */
	it("rejects variable roots and fractional powers before sampling", () => {
		for (const term of [
			String.raw`\sqrt{(\omega-100)^2}+\omega-100`,
			String.raw`\sqrt[4]{(\omega-100)^4}+\omega-100`,
			String.raw`((\omega-100)^2)^{1/2}+\omega-100`,
			String.raw`((\omega-100)^4)^{0.25}+\omega-100`,
			String.raw`(\sqrt{(\omega-100)^2}+\omega-100)^2`,
			String.raw`2^{\sqrt{(\omega-100)^2}+\omega-100}-1`,
			String.raw`\sqrt[\omega]{2}`,
			String.raw`\omega^{\omega}`,
		]) {
			expect(validateTransformAnswer(term, zero).status).toBe(
				"unsupported",
			);
		}
	});
	/** Constants, integer powers, and exponential bases remain supported. */
	it("preserves constant roots and ordinary power equivalences", () => {
		for (const answer of [
			String.raw`\sqrt{4}-2`,
			String.raw`\sqrt[4]{16}-2`,
			String.raw`\sqrt{2}-2^{1/2}`,
			String.raw`\omega^2-\omega\omega`,
			String.raw`(2+j\omega)^{-1}-\frac{1}{2+j\omega}`,
			String.raw`e^{j\omega}-\cos(\omega)-j\sin(\omega)`,
		]) {
			expect(validateTransformAnswer(answer, zero).status, answer).toBe(
				"correct",
			);
		}
	});
	/** Absolute-value hinges must not imitate a constant spectrum inside all probes. */
	it("rejects variable absolute values but preserves constant absolute values", () => {
		const one: TransformReference = {
			...zero,
			canonicalTarget: normalizeCanonicalTransform(1, "omega"),
			/** @returns Constant spectrum value. */
			evaluate: () => new Complex(1),
		};
		for (const answer of [
			String.raw`1+|\omega-100|+\omega-100`,
			String.raw`1+(|\omega-100|+\omega-100)^2`,
			String.raw`1+\operatorname{Abs}(\omega-100)+\omega-100`,
		]) {
			expect(validateTransformAnswer(answer, one).status).toBe(
				"unsupported",
			);
		}
		for (const answer of [
			String.raw`|-1|`,
			String.raw`|2-3|`,
			String.raw`|\pi|-\pi+1`,
		]) {
			expect(validateTransformAnswer(answer, one).status).toBe("correct");
		}
	});
	/** These spectrum families have no piecewise frequency-domain support. */
	it("rejects frequency steps hidden beyond the validation interval", () => {
		const one = {
			...zero,
			canonicalTarget: normalizeCanonicalTransform(1, "omega"),
			evaluate: () => new Complex(1),
		};
		for (const answer of [
			String.raw`1+u(\omega-100)`,
			String.raw`1+\operatorname{Heaviside}(\omega+100)`,
		]) {
			expect(validateTransformAnswer(answer, one).status).toBe(
				"unsupported",
			);
		}
	});
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
			canonicalTarget: normalizeCanonicalTransform(
				[
					"Multiply",
					3,
					"DiracDelta",
					["Delimiter", ["Subtract", "omega", 2]],
				],
				"omega",
			),
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
