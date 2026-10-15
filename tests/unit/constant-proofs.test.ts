import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	literalScalar,
	scalar,
	scalarAbs,
	scalarExp,
	scalarLog,
	scalarRoot,
	symbolicPi,
} from "$lib/math-engine/canonical-algebra";
import { normalizeCanonicalTransform } from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import {
	createLaplacePfdProblem,
	validateLaplacePfdAnswer,
} from "$lib/math-engine/laplace";
import { propertyOptions } from "$lib/testing/property-options";

/** Exact decimal fixtures below their corresponding multiples of pi. */
const roundedPi = [
	["3.14159265358979323843", 1],
	["6.28318530717958647691", 2],
	["9.424777960769379712", 3],
] as const;

/**
 * Independent fraction comparison using integer cross multiplication.
 * @param decimal - Positive fixed-point decimal.
 * @param multiple - Positive multiplier of the certified lower bound for pi.
 * @returns Whether the decimal is strictly below the bound.
 */
function belowPiBound(decimal: string, multiple: number): boolean {
	const [whole, digits = ""] = decimal.split(".");
	// The first 50 decimal places give a strict lower bound, not a floating oracle.
	const lower = 314159265358979323846264338327950288419716939937510n;
	return (
		BigInt(`${whole}${digits}`) * 10n ** 50n <
		lower * BigInt(multiple) * 10n ** BigInt(digits.length)
	);
}

/**
 * Verifies exact sign and nonzero rules under bounded rational transformations.
 * @param numerator - Nonzero signed integer.
 * @param denominator - Positive integer denominator.
 * @param scale - Positive integer scale.
 * @returns Nothing after independent sign and identity assertions.
 */
function rationalProperty(
	numerator: number,
	denominator: number,
	scale: number,
): void {
	const value = scalar(numerator).divide(scalar(denominator));
	const sign = numerator < 0 ? -1 : 1;
	expect(value.realSign()).toBe(sign);
	expect(value.negate().realSign()).toBe(-sign);
	expect(value.multiply(scalar(scale)).realSign()).toBe(sign);
	expect(scalar(1).divide(value).realSign()).toBe(sign);
	expect(value.nonzeroProof()).toBe("nonzero");
	expect(value.add(value.negate()).realSign()).toBe(0);
	expect(value.divide(value).equals(scalar(1))).toBe(true);
}

/**
 * Checks known-positive constant compositions against their defining facts.
 * @param value - Small positive integer.
 * @param scale - Signed nonzero rational prefactor.
 * @returns Nothing after sign and domain checks.
 */
function symbolicProperty(value: number, scale: number): void {
	for (const constant of [
		symbolicPi,
		scalarRoot(scalar(value), scalar(2)),
		scalarExp(scalar(value)),
		scalarLog(scalar(value + 1)),
	]) {
		expect(constant.realSign()).toBe(1);
		expect(constant.multiply(scalar(scale)).realSign()).toBe(
			scale < 0 ? -1 : 1,
		);
		expect(scalar(1).divide(constant).nonzeroProof()).toBe("nonzero");
		expect(scalarAbs(constant.negate()).equals(constant)).toBe(true);
	}
}

/**
 * Checks uncertainty through transformed cancellation and domain-sensitive contexts.
 * @param fixture - Decimal and corresponding pi multiplier.
 * @param scale - Nonzero rational scaling factor.
 * @returns Nothing after all uncertain domains fail closed.
 */
function uncertainProperty(
	fixture: (typeof roundedPi)[number],
	scale: number,
): void {
	const [decimal, multiple] = fixture;
	expect(belowPiBound(decimal, multiple)).toBe(true);
	const value = literalScalar(decimal)
		.add(symbolicPi.multiply(scalar(-multiple)))
		.multiply(scalar(scale));
	expect(value.realSign()).toBe("unknown");
	expect(value.nonzeroProof()).toBe("unknown");
	for (const operation of [
		/** @returns Quotient requiring a nonzero denominator. */ () =>
			scalar(1).divide(value),
		/** @returns A zero numerator must not erase a denominator obligation. */ () =>
			scalar(0).divide(value),
		/** @returns Cancellation must not validate an uncertain denominator. */ () =>
			value.divide(value),
		/** @returns Absolute value requiring a real sign. */ () =>
			scalarAbs(value),
		/** @returns Logarithm requiring a positive argument. */ () =>
			scalarLog(value),
		/** @returns Principal root requiring established real radicand facts. */ () =>
			scalarRoot(value, scalar(2)),
	])
		expect(operation).toThrow(/exactly|standard transform/);
}

describe("constant proof boundaries", () => {
	/** All defaults are reproducible and every failure can be shrunk and replayed. */
	it("proves rational transformations independently", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 1000 }).chain(
					/**
					 * @param n - Nonzero magnitude.
					 * @returns Both exact signs.
					 */
					(n) => fc.constantFrom(n, -n),
				),
				fc.integer({ min: 1, max: 1000 }),
				fc.integer({ min: 1, max: 16 }),
				rationalProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Constant functions carry symbolic facts rather than inferred floating signs. */
	it("proves positive symbolic compositions", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 12 }),
				fc.constantFrom(-3, -1, 1, 2),
				symbolicProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Near-pi values are mathematically ordered by a separate integer-bound oracle. */
	it("keeps mixed symbolic cancellation uncertain in every domain", () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...roundedPi),
				fc.constantFrom(-3, -1, 1, 2),
				uncertainProperty,
			),
			propertyOptions(),
		);
	}, 310000);
	/** Domain failures survive rewrites and boxed AST wrappers. */
	it("refuses canceled or masked uncertain divisors and invalid domains", () => {
		for (const [decimal, multiple] of roundedPi) {
			const c = `${decimal}-${multiple}\\pi`;
			for (const expression of [
				`0/(${c})`,
				`(${c})/(${c})`,
				`1/(1/(${c}))`,
				`0\\ln(${c})`,
				`0\\sqrt{${c}}`,
				`|${c}|`,
				`(${c})^t`,
			])
				expect(
					() =>
						normalizeCanonicalTransform(
							parseStrictLatex(expression),
							"t",
						),
					expression,
				).toThrow();
			const boxed = {
				fn: [
					"Divide",
					{ num: "0" },
					{
						fn: [
							"Subtract",
							{ num: decimal },
							{ fn: ["Multiply", multiple, { sym: "Pi" }] },
						],
					},
				],
			};
			expect(() => normalizeCanonicalTransform(boxed, "omega")).toThrow();
		}
		for (const expression of [
			"0(1/0)",
			"0\\ln(-1)",
			"0^0",
			"0^{-1}",
			"\\sqrt[0]{2}",
		])
			expect(
				() =>
					normalizeCanonicalTransform(
						parseStrictLatex(expression),
						"t",
					),
				expression,
			).toThrow();
	});
	/** Exact signs stay available far below the diagnostic floating-point range. */
	it("preserves tiny exact rationals and principal square roots", () => {
		expect(literalScalar("1e-400").realSign()).toBe(1);
		expect(literalScalar("-1e-400").realSign()).toBe(-1);
		expect(scalarRoot(scalar(-1), scalar(2)).equals(scalar(0, 1))).toBe(
			true,
		);
		expect(scalar(0, 1).realSign()).toBe("unknown");
		expect(scalar(0, 1).nonzeroProof()).toBe("nonzero");
		for (const sign of [1, -1]) {
			const nearCut = scalar(-1).add(
				literalScalar("1e-400").multiply(scalar(0, sign)),
			);
			expect(() => nearCut.numeric()).toThrow(/finite coefficient range/);
		}
	});
	/** A decimal below pi must never turn an anticausal response into a causal one. */
	it("rejects all reproduced rounded-pi support reversals", () => {
		const problem = createLaplacePfdProblem([1, 1], [-1, -4]);
		for (const [decimal, multiple] of roundedPi)
			expect(
				validateLaplacePfdAnswer(
					`e^{-4t}u((${decimal}-${multiple}\\pi)t)`,
					problem,
				).status,
			).toBe("unsupported");
	});
});
