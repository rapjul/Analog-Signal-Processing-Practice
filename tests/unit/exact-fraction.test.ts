import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ExactFraction } from "$lib/math-engine/exact-fraction";
import { propertyOptions } from "$lib/testing/property-options";

describe("decimal-derived exact fractions", () => {
	/** Small exact integer ratios provide an independent native-division rounding reference. */
	it("preserves ratios after adding integer components far beyond Number range", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -16777216, max: 16777216 }),
				fc.integer({ min: 1, max: 16777216 }),
				/**
				 * @param numerator - Exactly representable signed integer.
				 * @param denominator - Exactly representable positive integer.
				 * @returns Nothing after comparing against an independent division oracle.
				 */
				(numerator, denominator) => {
					const scale = 10n ** 400n;
					expect(
						new ExactFraction(
							BigInt(numerator) * scale + 1n,
							BigInt(denominator) * scale,
						).toNumber(),
					).toBe(numerator / denominator);
				},
			),
			propertyOptions(),
		);
	});
	/** Large integer components must not overflow before their finite ratio is formed. */
	it("rounds large ratios directly, preserving signs and small finite values", () => {
		const huge = 10n ** 400n;
		expect(new ExactFraction(huge + 1n, huge).toNumber()).toBe(1);
		expect(new ExactFraction(-huge - 1n, huge).toNumber()).toBe(-1);
		expect(new ExactFraction(huge + 1n, 3n * huge).toNumber()).toBe(1 / 3);
		expect(new ExactFraction(huge + 1n, 10n ** 700n).toNumber()).toBe(
			1e-300,
		);
		expect(new ExactFraction(10n ** 700n, huge + 1n).toNumber()).toBe(
			1e300,
		);
	});
	/** IEEE-754 ties use even significands at normal, subnormal, and overflow boundaries. */
	it("rounds binary boundaries without discarding representable subnormals", () => {
		const unit = 2n ** 1074n;
		expect(new ExactFraction(1n, unit).toNumber()).toBe(Number.MIN_VALUE);
		expect(new ExactFraction(1n, 2n * unit).toNumber()).toBe(0);
		expect(new ExactFraction(3n, 2n * unit).toNumber()).toBe(
			2 * Number.MIN_VALUE,
		);
		expect(new ExactFraction(-1n, unit).toNumber()).toBe(-Number.MIN_VALUE);
		expect(new ExactFraction(1n, 10n ** 400n).toNumber()).toBe(0);
		expect(new ExactFraction(-1n, 10n ** 400n).toNumber()).toBe(-0);
		expect(new ExactFraction(2n ** 53n + 1n, 2n ** 53n).toNumber()).toBe(1);
		expect(new ExactFraction(2n ** 53n + 3n, 2n ** 53n).toNumber()).toBe(
			1 + 2 ** -51,
		);
		expect(
			new ExactFraction((2n ** 53n - 1n) * 2n ** 971n).toNumber(),
		).toBe(Number.MAX_VALUE);
		expect(new ExactFraction(2n ** 1024n - 2n ** 970n).toNumber()).toBe(
			Infinity,
		);
		expect(new ExactFraction(-(10n ** 400n)).toNumber()).toBe(-Infinity);
		expect(new ExactFraction(0n).toNumber()).toBe(0);
	});
	/** Decimal and scientific values must not depend on denominator approximation limits. */
	it("preserves exact decimals and reduced products", () => {
		expect(ExactFraction.fromDecimal(0.003).toLatex()).toBe(
			String.raw`\frac{3}{1000}`,
		);
		expect(ExactFraction.fromDecimal(1e-7).toLatex()).toBe(
			String.raw`\frac{1}{10000000}`,
		);
		expect(
			new ExactFraction(1n)
				.divide(ExactFraction.fromDecimal(0.003))
				.toLatex(),
		).toBe(String.raw`\frac{1000}{3}`);
		expect(new ExactFraction(-2n, 4n).toLatex()).toBe(
			String.raw`-\frac{1}{2}`,
		);
		expect(() => ExactFraction.fromDecimal(Number.NaN)).toThrow();
		expect(() =>
			new ExactFraction(1n).divide(new ExactFraction(0n)),
		).toThrow();
	});
});
