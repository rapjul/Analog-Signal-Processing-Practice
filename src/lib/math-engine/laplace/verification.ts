import { CanonicalError } from "$lib/math-engine/canonical-algebra";
import {
	canonicalTransformsMatch,
	normalizeCanonicalTransform,
	normalizeLaplaceInterval,
} from "$lib/math-engine/canonical-transform";
import { parseStrictLatex } from "$lib/math-engine/evaluator";
import { normalizeTransformNotation } from "$lib/math-engine/transform-notation";
import type { TransformValidationResult } from "$lib/math-engine/transform-validation";
import { fraction } from "./algebra";
import { signalLatex } from "./signals";
import type { LaplaceResponseTerm } from "./types";

/** @param text - Expression. @param variable - Allowed symbol. @returns Strict parsed AST. */
function parseExpression(text: string, variable: "s" | "t"): unknown {
	if (text.length > 16384)
		throw new CanonicalError(
			"unsupported",
			"Use at most 16,384 characters.",
		);
	if (!text.trim())
		throw new CanonicalError("invalid", "Enter an answer before checking.");
	const expression =
		variable === "t"
			? normalizeTransformNotation(text, "t")
			: normalizeTransformNotation(
					text.replace(/^\s*[XYH]\s*\(s\)\s*=\s*/, ""),
					"omega",
				);
	return parseStrictLatex(expression);
}

/** @param correct - Exact structural match. @returns Student-facing result. */
function outcome(correct: boolean): TransformValidationResult {
	return {
		status: correct ? "correct" : "incorrect",
		message: correct
			? "Verified exactly within the supported answer language."
			: "Recheck the coefficients, factors, signs, and support.",
	};
}

/** @param error - Strict verification exception. @returns Conservative outcome. */
function failure(error: unknown): TransformValidationResult {
	return error instanceof CanonicalError
		? { status: error.status, message: error.message }
		: {
				status: "invalid",
				message:
					"Enter valid mathematics with matching brackets and finite constants.",
			};
}

/** @param answer - Submitted s-domain expression. @param target - Independently built exact expression. @returns Structural comparison. */
export function verifyLaplaceS(
	answer: string,
	target: string,
): TransformValidationResult {
	try {
		return outcome(
			canonicalTransformsMatch(
				normalizeCanonicalTransform(parseExpression(answer, "s"), "s"),
				normalizeCanonicalTransform(parseExpression(target, "s"), "s"),
			),
		);
	} catch (error) {
		return failure(error);
	}
}

/** @param answer - Submitted response. @param terms - Structured target terms. @returns Global support and distribution comparison. */
export function verifyLaplaceTime(
	answer: string,
	terms: LaplaceResponseTerm[],
): TransformValidationResult {
	try {
		const actual = parseExpression(answer, "t");
		// Construct target ASTs term-by-term from solved parameters, independently of the displayed sum.
		const expected: unknown = [
			"Add",
			...terms.map((term) => parseExpression(signalLatex(term), "t")),
		];
		const boundaries = [
			-Infinity,
			...[
				...new Set([
					0,
					...terms.map((term) => fraction(term.delay).toNumber()),
				]),
			].sort((a, b) => a - b),
			Infinity,
		];
		for (let i = 1; i < boundaries.length; i++) {
			const interval = { min: boundaries[i - 1]!, max: boundaries[i]! };
			if (
				!canonicalTransformsMatch(
					normalizeLaplaceInterval(actual, interval),
					normalizeLaplaceInterval(expected, interval),
				)
			)
				return outcome(false);
		}
		return outcome(true);
	} catch (error) {
		return failure(error);
	}
}
