/** Regression coverage for algebraic and malformed convolution answers. */
import { describe, expect, it } from "vitest";
import { convolutionExpressionsMatch } from "$lib/components/solvers/convolution-solver-state/expression-validation";

describe("convolution expression equivalence", () => {
	/** A delayed step must never disappear when typed without a multiplication sign. */
	it.each(["tu(t-100)", "t u(t-100)", "t*u(t-100)"])(
		"rejects the incorrectly gated answer %s",
		/** @param answer - Equivalent spellings of the incorrect gated answer. */
		(answer) => {
			expect(convolutionExpressionsMatch(answer, "t")).toBe(false);
		},
	);
	/** Empty sampling must not establish equivalence between finite expressions. */
	it("requires samples for finite expressions but not infinity sentinels", () => {
		expect(convolutionExpressionsMatch("4", "5", [])).toBe(false);
		expect(convolutionExpressionsMatch("t", "t", [])).toBe(false);
		expect(convolutionExpressionsMatch("inf", "\\infty", [])).toBe(true);
	});
	/** Equivalent finite constants must use the same expression evaluator. */
	it.each(["2+2", "(4)", "8/2", "4+t-t"])(
		"accepts %s as an equivalent constant",
		/** @param answer - Algebraic representation of four. */
		(answer) => {
			expect(convolutionExpressionsMatch(answer, "4")).toBe(true);
			expect(convolutionExpressionsMatch("4", answer)).toBe(true);
		},
	);
	/** Strict grading must not silently discard extra scalar entries. */
	it.each(["(t,99)", "t;7", "t,invalid"])(
		"rejects the multi-value answer %s",
		/** @param answer - A list whose first entry would otherwise pass. */
		(answer) => {
			expect(convolutionExpressionsMatch(answer, "t")).toBe(false);
		},
	);
	/** A shifted unit step must retain its support when comparing answers. */
	it("rejects an expression gated off throughout the active interval", () => {
		expect(convolutionExpressionsMatch("t*u(t-100)", "t", [1, 2, 3])).toBe(
			false,
		);
		expect(convolutionExpressionsMatch("t*u(t)", "t", [1, 2, 3])).toBe(
			true,
		);
	});
	/** Infinity is a scalar boundary sentinel rather than a finite expression. */
	it("preserves infinity boundary matching and rejects invalid expressions", () => {
		expect(convolutionExpressionsMatch("inf", "\\infty")).toBe(true);
		expect(convolutionExpressionsMatch("-inf", "inf")).toBe(false);
		expect(convolutionExpressionsMatch("4", "5")).toBe(false);
		expect(convolutionExpressionsMatch("1/0", "0")).toBe(false);
		expect(convolutionExpressionsMatch("invalid", "0")).toBe(false);
	});
});
