/** Shared strict typed-expression validation for convolution tutor steps. */

import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { parseNumericInput } from "$lib/math-engine/fraction";

/** Parses a finite scalar or a common positive/negative infinity spelling. */
export function parseConvolutionScalarInput(input: string): number {
	const normalized = input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/\\infty|∞|(?<![a-z])oo(?![a-z])/g, "infinity");
	if (["infinity", "+infinity", "inf", "+inf"].includes(normalized))
		return Number.POSITIVE_INFINITY;
	if (["-infinity", "-inf"].includes(normalized))
		return Number.NEGATIVE_INFINITY;
	return parseNumericInput(input);
}

/** Compares finite or infinite scalar input against an exact expected value. */
export function convolutionScalarMatches(
	input: string,
	expected: number,
): boolean {
	const value = parseConvolutionScalarInput(input);
	return Object.is(value, expected) || Math.abs(value - expected) < 1e-9;
}

/**
 * Compares one-variable expressions at deterministic output-time values.
 * @param student - Student expression or infinity boundary sentinel.
 * @param expected - Verified expression or infinity boundary sentinel.
 * @param sampleTimes - Output-time values within the relevant interval.
 * @returns Whether both expressions agree at every sample.
 */
export function convolutionExpressionsMatch(
	student: string,
	expected: string,
	sampleTimes: number[] = [-3, -1, 0, 2, 5],
): boolean {
	const studentInfinity = parseConvolutionScalarInput(student);
	const expectedInfinity = parseConvolutionScalarInput(expected);
	if (
		studentInfinity === Number.POSITIVE_INFINITY ||
		studentInfinity === Number.NEGATIVE_INFINITY ||
		expectedInfinity === Number.POSITIVE_INFINITY ||
		expectedInfinity === Number.NEGATIVE_INFINITY
	)
		return Object.is(studentInfinity, expectedInfinity);
	for (const time of sampleTimes) {
		const actual = tryEvaluateLatexAt(student, time);
		const target = tryEvaluateLatexAt(expected, time);
		if (
			actual === null ||
			target === null ||
			Math.abs(actual - target) > 1e-7
		)
			return false;
	}
	return true;
}

/**
 * Compares a contact formulation input against expected transformed expression and fixed value.
 *
 * Accepts:
 * - Bare transformed expression: `t - 1`
 * - Full equation: `2 = t - 1`
 * - Reversed equation: `t - 1 = 2`
 *
 * @param input - Student-entered string.
 * @param expectedFixed - Fixed signal breakpoint coordinate.
 * @param expectedTransformedLatex - Expected transformed moving breakpoint expression.
 */
export function convolutionContactEquationMatches(
	input: string,
	expectedFixed: number,
	expectedTransformedLatex: string,
): boolean {
	const trimmed = input.trim();
	if (!trimmed) return false;
	if (trimmed.includes("=")) {
		const parts = trimmed.split("=").map((p) => p.trim());
		if (parts.length !== 2) return false;
		const left = parts[0];
		const right = parts[1];
		if (left === undefined || right === undefined) return false;
		if (
			convolutionScalarMatches(left, expectedFixed) &&
			convolutionExpressionsMatch(right, expectedTransformedLatex)
		) {
			return true;
		}
		if (
			convolutionExpressionsMatch(left, expectedTransformedLatex) &&
			convolutionScalarMatches(right, expectedFixed)
		) {
			return true;
		}
		return false;
	}
	return convolutionExpressionsMatch(trimmed, expectedTransformedLatex);
}

/**
 * Compares a contact solve input against expected transition time.
 *
 * Accepts:
 * - Bare number: `3`
 * - Equation: `t = 3`, `3 = t`
 *
 * @param input - Student-entered string.
 * @param expectedTime - Target transition time scalar.
 */
export function convolutionContactSolveMatches(
	input: string,
	expectedTime: number,
): boolean {
	let normalized = input.trim();
	if (normalized.includes("=")) {
		const parts = normalized.split("=").map((p) => p.trim());
		if (parts.length !== 2) return false;
		const left = parts[0];
		const right = parts[1];
		if (left === undefined || right === undefined) return false;
		if (left.toLowerCase() === "t") normalized = right;
		else if (right.toLowerCase() === "t") normalized = left;
		else return false;
	}
	return convolutionScalarMatches(normalized, expectedTime);
}
