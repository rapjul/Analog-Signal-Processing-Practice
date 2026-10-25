import { describe, expect, it } from "vitest";
import {
	canonicalTransformsMatch,
	normalizeCanonicalTransform,
} from "$lib/math-engine/canonical-transform";
import {
	evaluateMathJsonStrict,
	parseStrictLatex,
} from "$lib/math-engine/evaluator";
import {
	createCtftProblem,
	validateCtftAnswer,
} from "$lib/math-engine/fourier-transform/index";
import {
	createLaplacePfdProblem,
	validateLaplacePfdAnswer,
} from "$lib/math-engine/laplace/index";

describe("transform logarithm semantics", () => {
	/** Parser outputs define operation names and operand order; the verifier must not guess them. */
	it("pins natural, common, binary, and explicit-base parser contracts", () => {
		for (const [latex, ast] of [
			[String.raw`\ln(10)`, ["Ln", 10]],
			[String.raw`\log(10)`, ["Log", 10]],
			[String.raw`\lg(10)`, ["Log", 10, 10]],
			[String.raw`\log_2(8)`, ["Lb", 8]],
			[String.raw`\log_3(9)`, ["Log", 9, 3]],
		] as const)
			expect(parseStrictLatex(latex), latex).toEqual(ast);
	});
	/** Integer powers provide exact logarithm oracles independent of floating-point logarithms. */
	it.each([2, 3, 10])(
		"preserves logarithm identities for base %i on both practice surfaces",
		/**
		 * @param base - Positive integer logarithm base.
		 * @returns Nothing after all power checks.
		 */
		(base) => {
			const ctft = createCtftProblem("delta", {
				a: 1,
				T: 2,
				w0: 3,
				t0: 0,
			});
			const laplace = createLaplacePfdProblem([1, 1], [-1, -4]);
			for (let power = 1; power <= 4; power++) {
				const expression = String.raw`\log_{${base}}(${base ** power})/${power}`;
				expect(
					validateCtftAnswer(expression, ctft).status,
					expression,
				).toBe("correct");
				expect(
					validateLaplacePfdAnswer(
						`(${expression})e^{-4t}u(t)`,
						laplace,
					).status,
					expression,
				).toBe("correct");
				expect(
					evaluateMathJsonStrict(parseStrictLatex(expression), {}),
				).toBeCloseTo(1, 12);
			}
		},
	);
	/** Natural logarithm compositions and explicit notation stay equivalent without conflating bases. */
	it("retains natural compositions and explicit common-log aliases", () => {
		const ctft = createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 });
		for (const expression of [
			String.raw`\ln(e)`,
			String.raw`\log(10)`,
			String.raw`\lg(10)`,
			String.raw`\log_{1/2}(1/2)`,
			String.raw`\ln(10)\log(e)`,
			String.raw`e^{\ln(2)}/2`,
		])
			expect(
				validateCtftAnswer(expression, ctft).status,
				expression,
			).toBe("correct");
	});
	/** Undefined bases and variable dependencies cannot disappear behind a zero operand. */
	it("rejects invalid bases, variable arguments, variable bases, and malformed boxed nodes", () => {
		const ctft = createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 });
		for (const expression of [
			String.raw`0\log_1(1)`,
			String.raw`0\log_0(1)`,
			String.raw`0\log_{-2}(1)`,
			String.raw`0\log(-1)`,
		])
			expect(
				validateCtftAnswer(expression, ctft).status,
				expression,
			).toBe("invalid");
		for (const expression of [
			String.raw`0\log_{\omega}(1)`,
			String.raw`0\log_2(\omega)`,
			String.raw`0\ln(\omega)`,
		])
			expect(
				validateCtftAnswer(expression, ctft).status,
				expression,
			).toBe("unsupported");
		for (const ast of [
			["Log"],
			["Log", 10, 2, 3],
			["Ln", 10, 2],
			{ fn: ["Log", 1, 1] },
		])
			expect(() => normalizeCanonicalTransform(ast, "omega")).toThrow();
		expect(
			canonicalTransformsMatch(
				normalizeCanonicalTransform(
					{ fn: ["Log", { num: "10" }, { num: "10" }] },
					"omega",
				),
				normalizeCanonicalTransform(1, "omega"),
			),
		).toBe(true);
		for (const ast of [
			["Log", 10, 1],
			["Log", -1],
			["Log", 10, 2, 3],
		])
			expect(evaluateMathJsonStrict(ast, {})).toBeNull();
		expect(evaluateMathJsonStrict(["Lg", 100], {})).toBe(2);
		expect(
			canonicalTransformsMatch(
				normalizeCanonicalTransform({ fn: ["Lg", 100] }, "omega"),
				normalizeCanonicalTransform(2, "omega"),
			),
		).toBe(true);
	});
	/** A common logarithm is not the inverse of the natural exponential. */
	it("does not verify a constant expressed with a mismatched logarithm base", () => {
		const ctft = createCtftProblem("delta", { a: 1, T: 2, w0: 3, t0: 0 });
		expect(validateCtftAnswer(String.raw`\log(e)`, ctft).status).not.toBe(
			"correct",
		);
		expect(
			validateCtftAnswer(String.raw`1+\log(10)-\ln(10)`, ctft).status,
		).not.toBe("correct");
		const laplace = createLaplacePfdProblem([1, 1], [-1, -4]);
		expect(
			validateLaplacePfdAnswer(String.raw`\log(e)e^{-4t}u(t)`, laplace)
				.status,
		).not.toBe("correct");
	});
});
