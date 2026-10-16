/** Regression coverage for algebraic and malformed convolution answers. */
import { describe, expect, it } from "vitest";
import {
	convolutionExpressionsMatch,
	verifyConvolutionExpression,
} from "$lib/components/solvers/convolution-solver-state/expression-validation";

describe("convolution expression equivalence", () => {
	/** A delayed step must never disappear when typed without a multiplication sign. */
	it.each(["tu(t-100)", "t u(t-100)", "t*u(t-100)"])(
		"rejects the incorrectly gated answer %s",
		/** @param answer - Equivalent spellings of the incorrect gated answer. */
		(answer) => {
			expect(convolutionExpressionsMatch(answer, "t")).toBe(false);
		},
	);
	/** Empty domains cannot establish finite expression equivalence. */
	it("requires a nonempty domain for finite expressions", () => {
		expect(convolutionExpressionsMatch("4", "5", { min: 1, max: 1 })).toBe(
			false,
		);
		expect(convolutionExpressionsMatch("t", "t", { min: 1, max: 1 })).toBe(
			false,
		);
		expect(convolutionExpressionsMatch("inf", "\\infty")).toBe(true);
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
		expect(
			convolutionExpressionsMatch("t*u(t-100)", "t", { min: 1, max: 3 }),
		).toBe(false);
		expect(
			convolutionExpressionsMatch("t*u(t)", "t", { min: 1, max: 3 }),
		).toBe(true);
	});
	/** Known sample collisions must be compared algebraically. */
	it("rejects a polynomial agreeing at every former sample", () => {
		expect(
			convolutionExpressionsMatch("t+(t+3)(t+1)t(t-2)(t-5)", "t"),
		).toBe(false);
	});
	/** Hidden support changes cannot disappear beyond the finite sample window. */
	it.each(["t*e^{-t}u(6-t)", "t*e^{-t}u(t-100)"])(
		"rejects %s on an exponential tail",
		/** @param answer - Submitted expression with an incorrect support factor. */
		(answer) => {
			expect(
				verifyConvolutionExpression(answer, "t*e^{-t}", {
					min: 0,
					max: Infinity,
				}).status,
			).not.toBe("correct");
		},
	);
	/** Endpoint support conventions do not affect an open interval identity. */
	it("proves shifted support at interval edges and equivalent factored answers", () => {
		expect(
			convolutionExpressionsMatch("(t+1)^2*u(t+1)*u(2-t)", "t^2+2t+1", {
				min: -1,
				max: 2,
			}),
		).toBe(true);
		expect(
			convolutionExpressionsMatch("t*u(-t)", "t", {
				min: -Infinity,
				max: 0,
			}),
		).toBe(true);
	});
	/** Unsupported syntax and invalid mathematics remain distinct and bounded. */
	it("reports conservative diagnostics and enforces resource limits", () => {
		expect(verifyConvolutionExpression("sqrt(t)", "t").status).toBe(
			"unsupported",
		);
		expect(verifyConvolutionExpression("1/0", "0").status).toBe("invalid");
		expect(verifyConvolutionExpression("(t", "t").status).toBe("invalid");
		expect(verifyConvolutionExpression("1".repeat(16385), "0").status).toBe(
			"unsupported",
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
