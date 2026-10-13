import { describe, expect, it } from "vitest";
import { ExactFraction } from "$lib/math-engine/exact-fraction";

describe("decimal-derived exact fractions", () => {
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
