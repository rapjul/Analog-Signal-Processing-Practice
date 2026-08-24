/** Shared strict typed-expression validation for convolution tutor steps. */

import { tryEvaluateLatexAt } from "$lib/math-engine/evaluator";
import { parseNumericInput } from "$lib/math-engine/fraction";

/** Parses a finite scalar or a common positive/negative infinity spelling. */
export function parseConvolutionScalarInput(input: string): number {
	const normalized = input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/\\infty|∞/g, "infinity");
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

/** Compares one-variable expressions at deterministic output-time values. */
export function convolutionExpressionsMatch(
	student: string,
	expected: string,
	sampleTimes: number[] = [-3, -1, 0, 2, 5],
): boolean {
	const studentInfinity = parseConvolutionScalarInput(student);
	const expectedInfinity = parseConvolutionScalarInput(expected);
	if (!Number.isNaN(studentInfinity) || !Number.isNaN(expectedInfinity))
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
