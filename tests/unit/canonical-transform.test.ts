import { describe, expect, it } from "vitest";
import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import {
	canonicalTransformsMatch,
	normalizeCanonicalTransform,
} from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";

/**
 * Normalizes a supported literal without using any sampling reference.
 *
 * @param expression - Mathematical expression.
 * @param variable - Independent symbol.
 * @returns Bounded canonical form.
 */
function form(expression: string, variable: "t" | "omega" = "omega") {
	return normalizeCanonicalTransform(
		parseStrictLatex(
			expression.replace(/\\delta\b/g, "\\operatorname{DiracDelta}"),
		),
		variable,
	);
}

describe("canonical transform contract", () => {
	/**
	 * Equivalent forms must be established by exact algebra and matched
	 * coefficient slots.
	 */
	it("normalizes rationalization, cancellation, sinc, Euler identities, and causal support", () => {
		for (const [actual, expected, variable] of [
			[
				String.raw`\frac{2-j\omega}{4+\omega^2}`,
				String.raw`\frac{1}{2+j\omega}`,
				"omega",
			],
			[String.raw`\frac{\omega-100}{\omega-100}`, "1", "omega"],
			[
				String.raw`4\operatorname{sinc}(2\omega/\pi)`,
				String.raw`2\sin(2\omega)/\omega`,
				"omega",
			],
			[String.raw`e^{j\omega}-\cos(\omega)-j\sin(\omega)`, "0", "omega"],
			[String.raw`\sqrt{2}-2^{1/2}`, "0", "omega"],
			[String.raw`\sqrt[4]{16}`, "2", "omega"],
			[String.raw`\sqrt{-1}-j`, "0", "omega"],
			[String.raw`\sqrt{2}\sqrt{2}-2`, "0", "omega"],
			[String.raw`e^{\ln(2)}`, "2", "omega"],
			[String.raw`2^{\omega/\ln(2)}`, String.raw`e^{\omega}`, "omega"],
			[String.raw`e^{j\pi}+1`, "0", "omega"],
			[String.raw`\sin(\pi)`, "0", "omega"],
			[String.raw`\ln(2)/\ln(2)`, "1", "omega"],
			[String.raw`\pi\delta(\omega-2)-\pi\delta(\omega-2)`, "0", "omega"],
			[
				String.raw`6\delta(2\omega-4)`,
				String.raw`3\delta(\omega-2)`,
				"omega",
			],
			[
				String.raw`(\omega+1)\delta(\omega-2)`,
				String.raw`3\delta(\omega-2)`,
				"omega",
			],
			["(e^{-t}+2e^{-4t})u(2t)", "e^{-t}u(t)+2e^{-4t}u(t)", "t"],
			["e^{-4t}(1-u(-t))", "e^{-4t}u(t)", "t"],
		] as const)
			expect(
				canonicalTransformsMatch(
					form(actual, variable),
					form(expected, variable),
				),
				actual,
			).toBe(true);
	});
	/**
	 * Extra terms and poles remain structural differences even below numerical
	 * tolerances.
	 */
	it("never drops tiny terms, poles, support changes, or impulse weights", () => {
		expect(() => form(String.raw`\sqrt{2}-1.4142135623730951`)).toThrow(
			CanonicalError,
		);
		for (const actual of [
			String.raw`1+\frac{10^{-20}}{\omega-100}`,
			String.raw`1+10^{-20}\omega`,
			String.raw`1+10^{-20}e^{-\omega^2}`,
			String.raw`1+10^{-20}\delta(\omega-100)`,
			String.raw`1+\sin(100\pi\omega)`,
		])
			expect(
				canonicalTransformsMatch(form(actual), form("1")),
				actual,
			).toBe(false);
		expect(
			canonicalTransformsMatch(
				form("e^{-4t}u(-t)", "t"),
				form("e^{-4t}u(t)", "t"),
			),
		).toBe(false);
		expect(
			canonicalTransformsMatch(form("0.00000000000000000001"), form("0")),
		).toBe(false);
	});
	/** Coefficient tolerance cannot change the recognized basis or denominator. */
	it("applies decimal tolerance only to matched nonzero coefficients", () => {
		expect(canonicalTransformsMatch(form("1.00000001"), form("1"))).toBe(
			true,
		);
		expect(canonicalTransformsMatch(form("1.00000003"), form("1"))).toBe(
			false,
		);
		expect(
			canonicalTransformsMatch(
				form(String.raw`\frac{1.00000001}{2+j\omega}`),
				form(String.raw`\frac{1}{2+j\omega}`),
			),
		).toBe(true);
		expect(
			canonicalTransformsMatch(
				form(String.raw`\frac{1}{2.00000001+j\omega}`),
				form(String.raw`\frac{1}{2+j\omega}`),
			),
		).toBe(false);
	});
	/** Every operand is validated, including operands multiplied by exact zero. */
	it("rejects hidden transitions, unrecognized operations, and underflow", () => {
		for (const expression of [
			String.raw`e^{0.5\ln((\omega-100)^2)}+\omega-100`,
			String.raw`2^{\ln((\omega-100)^4)/(4\ln(2))}+\omega-100`,
			String.raw`e^{-(\omega-100)^2}`,
			String.raw`0\ln(\omega-100)`,
			String.raw`0\sqrt{(\omega-100)^2}`,
			String.raw`0\tan(\omega)`,
			"0z",
		])
			expect(() => form(expression), expression).toThrow(CanonicalError);
		expect(() => form("0(1/0)")).toThrow(CanonicalError);
	});
	/**
	 * Explicit limits bound normalization work without returning partial
	 * verification.
	 */
	it("enforces AST depth, nodes, polynomial degree, term count, and power limits", () => {
		let deep: unknown = "omega";
		for (let count = 0; count < 33; count++) deep = ["Delimiter", deep];
		const tooManyTerms: unknown[] = ["Add"];
		for (let count = 0; count < 65; count++)
			tooManyTerms.push(["Exp", ["Multiply", count, "omega"]]);
		for (const ast of [
			deep,
			["Add", ...Array(513).fill(1)],
			["Power", "omega", 17],
			["Multiply", ["Power", "omega", 16], "omega"],
			tooManyTerms,
		]) {
			expect(() => normalizeCanonicalTransform(ast, "omega")).toThrow(
				CanonicalError,
			);
		}
	});
	/** Rounded complex constants must not satisfy real affine domain requirements. */
	it("requires genuinely real step and impulse arguments", () => {
		const slope = String.raw`(1+e^{j\sqrt{2}}-e^{j1.4142135623730951})`;
		expect(() => form(`u(${slope}t)`, "t")).toThrow(CanonicalError);
		expect(() => form(String.raw`\delta(${slope}(\omega-2))`)).toThrow(
			CanonicalError,
		);
	});
	/**
	 * Boxed symbols and function nodes obey the same exact normalization
	 * contract.
	 */
	it("normalizes boxed MathJSON without bypassing structural validation", () => {
		expect(() =>
			normalizeCanonicalTransform(["Sqrt", { num: "1e-400" }], "omega"),
		).toThrow(CanonicalError);
		expect(
			canonicalTransformsMatch(
				normalizeCanonicalTransform({ num: "1e-400" }, "omega"),
				form("0"),
			),
		).toBe(false);
		expect(() =>
			normalizeCanonicalTransform({ num: "1e-100000" }, "omega"),
		).toThrow(CanonicalError);
		const boxed = normalizeCanonicalTransform(
			{ fn: ["Power", { sym: "omega" }, { num: "2" }] },
			"omega",
		);
		expect(
			canonicalTransformsMatch(boxed, form(String.raw`\omega^2`)),
		).toBe(true);
		expect(() =>
			normalizeCanonicalTransform(
				{ fn: ["Ln", { sym: "omega" }] },
				"omega",
			),
		).toThrow(CanonicalError);
	});
});
